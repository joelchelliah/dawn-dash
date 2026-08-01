# Spec: "Show card art" in Cardex results

Adds a `Show card art` checkbox to Cardex's **Results formatting** filter group. When enabled, each
row in the card results panel shows a small thumbnail of the card's artwork next to the rarity icon.

## Decisions already made

These were settled up front — implement them as stated, don't re-litigate:

| Question | Decision |
| --- | --- |
| Rarity ↔ art coupling | Artwork gets a border tinted with the **rarity colour** (`$color-rarity-*`). The rarity icon stays in its own column. Overlapping the icon onto the art is explicitly *not* in scope (noted as a possible later iteration). |
| Row layout | Artwork is a **left column spanning the whole row** — it sits alongside the title row *and* the description/Blightbane link. This is what makes "roughly the height of a title+description row" the natural size. |
| Special icons (`✕` / `🐾`) | **Always** stacked vertically below the rarity icon, whether or not card art is on. One layout, not two branches. |
| Checkbox default | **On by default**, conditional on task 7 showing acceptable render/load performance. If it doesn't hold up, fall back to off-by-default and say so. |

## Sizing

Final width/height is deliberately left to trial and error in the dev server (task 6). Start from a
square in the **44–56px** range: the title row is `min-height: 1.25rem` with `0.5rem` vertical
padding and the description is `font-size('xxs')` at ~`0.125rem/0.375rem` margins, so a
title+description row lands around 48px. Drive the value from a single SCSS variable so tuning is a
one-line change.

---

## How to work through this spec

These rules apply to **every** task below, not just the last one.

### Stop after each task and wait for visual confirmation

Do not chain tasks. After finishing each numbered task:

1. Get it into a state the user can look at (`npm run dev`).
2. Tell the user what changed and what specifically to look at.
3. **Wait for the user to confirm it looks right before starting the next task.**

This matters more than usual here: tasks 3, 4, and 5 each restructure the same DOM and the same
stylesheet, so a layout mistake in task 3 gets buried under two more rounds of changes before anyone
sees it. Per the codex convention, this UI is verified by before/after comparison in the browser
rather than by tests — that only works if the comparison happens at each step.

Task 1 has no visible effect on its own beyond the new checkbox appearing in **Results formatting** —
confirm the checkbox renders and toggles, then move on.

### Update the docs when behaviour changes

If a change touches anything documented in a `CLAUDE.md` or `README.md`, update that file **as part of
the same task**, not as a cleanup pass afterwards. Likely candidates for this work:

- `src/codex/CLAUDE.md` — the Cardex/results-panel description, and its invariants list. Two things
  here are worth recording as invariants once implemented: the module-scope artwork `Map` (task 2, so
  nobody reintroduces a per-render linear `.find`), and the artwork/rarity-border colour pairing
  (task 5, since the border map and `indexToRarityIconMap` must stay in sync).
- `src/scoring/CLAUDE.md` — task 2 moves `useCardImageSrc` out of `src/scoring/hooks/`. Check whether
  its key-files list mentions the hook, and record why scoring keeps the `PestilenceDecreeUrl`
  fallback while Cardex doesn't (scoring passes an API field, not a card name).
- **Root `CLAUDE.md`** — its *PWA & Performance* section states the Blightbane image cache verbatim
  ("CacheFirst strategy for Blightbane images (10-day cache expiry)"). Task 7a changes that caching
  setup, so this text must change with it.
- Root `CLAUDE.md` *Custom Hooks* list — it enumerates the hooks in `src/shared/hooks/`, which task 2
  adds `useCardImageSrc` to. Its *Utilities* section also documents `imageUrls.ts`, worth a glance.

Check rather than assume — grep the docs for whatever you just changed. If a change turns out to
contradict an existing documented invariant, raise that with the user instead of quietly rewriting
the invariant.

---

## Tasks, in operational order

### 1. Add the filter option — ✅ COMPLETED

- `src/codex/types/filters.ts` — add `ShowCardArt = 'ShowCardArt'` to `FormattingCardFilterOption`.
  Place it after `ShowCardSet` so the checkbox order in the panel reads
  description → keywords → card set → card art → Blightbane link → hide tracked.
- `src/codex/hooks/useSearchFilters/useFormattingCardFilters.ts` — add
  `[FormattingCardFilterOption.ShowCardArt]: true` to `defaultFilters`, `'Show card art'` to
  `valueToStringMap`, and derive + return `shouldShowCardArt` alongside the other `shouldShow*`
  flags.
**As implemented:** `ShowCardArt` was placed **first** in the enum, not after `ShowCardSet`, so the
panel reads card art → description → keywords → card set → Blightbane link → hide tracked.

- **No `codexFilterStore.ts` version bump.** Per the codex invariant, `createFilterHook` iterates the
  cache but gates on `key in defaultFilters`, so a new key just falls through to its default for
  existing users. Bumping the version would needlessly reset everyone's other filters.

Nothing else is needed for the UI: `CardSearchPanel` renders the group from
`allFormattingCardFilters` (`FormattingCard.getAll()`), so the checkbox appears automatically.
Verify that visually rather than editing the panel.

### 2. Promote `useCardImageSrc` to `shared/` and make its lookup a Map — ✅ COMPLETED

**The lookup flow, which is the same in both tools:**

1. Take the card's name, e.g. `"Typhon's Cunning"`.
2. Find the matching entry in `src/shared/data/card-artwork.json` and read its `artwork` field.
3. Build the URL with `CardArtworkImageUrl(artwork)` from `@/shared/utils/imageUrls` →
   `https://blightbane.io/images/icons/<artwork>.webp`.

`src/scoring/hooks/useCardImageSrc.ts` already does exactly this, and scoring is its only consumer.
**Move it to `src/shared/hooks/useCardImageSrc.ts`** and point both tools at it, rather than writing a
second near-identical hook in the codex. Update the scoring import in
`src/scoring/components/BolgarsBlueprintsPanel/index.tsx`; the `@/shared/hooks/` directory already
holds the other cross-feature hooks.

**Replace the linear scan with a module-scope Map.** The hook currently does
`cardArtworkData.find(entry => entry.name === name)` over ~3100 entries. That's fine for the single
card in a scoring panel, but in Cardex it would run once per rendered card. Build a
`Map<string, string>` from the JSON **once at module scope** (not inside the hook, or it rebuilds per
mount) and look up by key. Scoring gets the faster lookup for free.

**Keep scoring's existing fallback behaviour exactly as-is.** The hook returns
`PestilenceDecreeUrl` when the name doesn't resolve, and `onImageSrcError` swaps to the same URL on a
failed request. This is load-bearing for scoring in a way that's easy to miss: its consumer passes
`challengeData.image` — a **Weekly Challenge API field, not necessarily a card name** — so the
unresolved path is a normal occurrence there, not an edge case. Do not change the default or the
signature. The promotion should be a move plus the Map, nothing more.

**Cardex needs a different fallback, so it must opt in.** Two distinct failure cases, and per the
decision below both resolve the same way in Cardex:

> **As implemented:** the Map is built **first-entry-wins over entries that have artwork** (a plain
> `new Map(entries)` would have silently swapped art for the 26 names that appear twice with
> *different* artwork, e.g. `"Bulwark"`). Null entries are filtered out before the Map is built, so
> they can't shadow a populated sibling. Net effect vs the old `.find`: identical for all 3068 names
> except `"Rotten to the Core"`, which has a `null` entry listed *before* its real one and now
> resolves correctly. **So the unresolvable-card count is 25, not 26** — the other 25 null-artwork
> names are null-only.

- **Lookup miss** — ~26 entries in `card-artwork.json` have `"artwork": null`, and cards absent from
  the file entirely are possible too (it's generated by `scripts/fetch-card-artwork-mapping.js` and
  can lag a card sync). **This is the only reliable miss signal** — see the caveat below.
- **Network error** — the `onError` path. In practice this catches genuine network/CDN failures
  *only*, not wrong artwork names.

> **Caveat worth knowing: `blightbane.io` serves a placeholder instead of 404ing.** A request for a
> non-existent icon (e.g. `/images/icons/Typhon%27s%20Cunning.webp`, the name-guessed spelling)
> returns **HTTP 200 with a valid 3826-byte webp**, not an error. So a wrong artwork value can never
> be detected via `onError` — the image element loads "successfully" and the row silently shows the
> wrong picture. All miss detection must therefore happen at the **mapping** level (name absent or
> `artwork: null`), which is what the Map lookup above already does. Don't add retry or validation
> logic around the request expecting failures to surface there.

In both cases Cardex renders the **rarity-tinted placeholder square** from task 7b — the same square
that shows while an image loads, just permanent. Not `PestilenceDecreeUrl`: across a 300-row list,
every artless card showing the same real Pestilent Decree art reads as "these cards all have that
art" rather than "art unavailable". Keeping the square also keeps every row's artwork column the same
width, so rows stay aligned.

Give the hook a way to express this without disturbing scoring — e.g. an optional fallback argument
defaulting to today's `PestilenceDecreeUrl`, or returning `null` for "unresolved" and letting each
caller decide. Prefer whichever keeps the scoring call site unchanged. **Comment why the two tools
differ**, so the divergence doesn't later get "fixed" into consistency.

### 3. Restructure `ResultCard` for the left artwork column — ✅ COMPLETED

`src/codex/components/ResultsPanels/CardResultsPanel/ResultCard/index.tsx`.

Today `.result-card-container` is `flex-direction: column` holding `.result-card` (the title row),
the description, and the Blightbane link as siblings. The artwork column has to sit *beside* all
three.

- Wrap the existing three children in a new content wrapper element, and make the container a
  `row` with `[artwork][content]`. Keep `.result-card-container` as the outer element that owns the
  struck/full-match/hidden state classes and the hover rules — those selectors and the
  `cardOverlayPositioningFix` mixin are load-bearing and currently target the container.
- Render the thumbnail via `@/shared/components/Image` (as `EventList` does), with explicit
  `width`/`height`, `alt={card.name}`, and `onError={onImageSrcError}`.
- Gate on `shouldShowCardArt` from `useFormattingFilters`.
- The artwork must **not** be clickable-inert: the whole row already toggles card strike via
  `onClick={() => toggleCardStrike(card)}` on `.result-card` and on the description. Clicking the
  artwork should toggle strike too — either move the handler to the container or add it to the
  artwork element. Pick one and keep it consistent.
- `ResultCard` is `memo()`'d but receives the whole `useSearchFilters` object, so memoization is
  already ineffective here. Don't try to fix that as part of this change; just don't make it worse.

### 4. Move the special icons below the rarity icon

Still in `ResultCard` + its SCSS. Per the decision above this is unconditional.

- `renderSpecialIcons()` currently returns a sibling of `.result-card__rarity` placed inline after
  it, and the combined case (`__non-collectible-and-animal-companion`) already stacks its two SVGs in
  a column. Restructure so the rarity icon and the special icons form a **vertical stack** in the
  rarity column: rarity on top, special icons underneath.
- Those negative margins (`margin-left: -0.75rem`, and the mobile `-0.25rem`) exist to pull the
  inline icons back toward the rarity icon. Once the icons live in the same column they are wrong —
  remove them rather than compensating with more offsets.
- **Delete the now-dead horizontal-offset machinery.** `hasSpecialIcons` currently only feeds
  `result-card__description--special-icons_margin` and
  `result-card__blightbane-link--special-icons_margin`, which widen the left margin to make room for
  the inline icons. With the icons stacked in the rarity column, the description no longer needs to
  shift — drop the `hasSpecialIcons` flag, both `--special-icons_margin` modifiers, and the
  `&--special-icons_margin` branch inside the `description-margins-based-on-filters` mixin.
- Note the mobile branch of `__non-collectible-and-animal-companion` flips to `flex-direction: row`
  — decide whether the paw+cross pair stays side-by-side on mobile (probably yes, vertical space is
  tighter there) and keep that behaviour explicit.

### 5. Styling: rarity-coloured border and layout

`ResultCard/index.module.scss`.

- Add the artwork block: fixed `width`/`height` from a single local SCSS variable, `object-fit: cover`
  (the source webps are not guaranteed square), a small `border-radius`, and a border.
- **Rarity-tinted border**: one modifier per rarity index, using the same colours the icons already
  use — `$color-rarity-common`, `$color-rarity-uncommon`, `$color-rarity-rare`,
  `$color-rarity-legendary`, and `$color-danger-special-card` for monster (index 4). Derive the
  modifier from `card.rarity` in the component, alongside the existing `indexToRarityIconMap`; keep
  the two maps adjacent so they can't drift.
- The existing `indexToRarityIconMap` has no entry for an unexpected rarity value and neither should
  the border map — fall back to no tint (plain `$color-component-border`) rather than crashing.
- Description and Blightbane-link left margins are currently `2rem` (`0.125rem` on mobile), sized to
  clear the rarity column. Inside the new content wrapper they no longer need to clear the artwork,
  so re-check both — after task 4 removes the `--special-icons_margin` branch, this mixin should end
  up simpler, not more conditional.
- Mobile (`$breakpoint-mobile`): the row is already tight — `__name` is `10rem`, `__keywords`
  `8rem`, `__card-set` `8rem`. Either shrink the thumbnail or confirm the row still fits without the
  card-set column wrapping. Check both portrait phone and tablet widths.
- Confirm the struck (`opacity: 0.5` + dark overlay) and full-match (animated gradient) states still
  read correctly with a thumbnail in the row — the gradient is painted on the container the artwork
  now lives in.

### 6. Tune the size visually

Run `npm run dev` and iterate on the one SCSS size variable until the thumbnail roughly matches the
height of a row with both title and description shown. Compare against:

- description on vs off (art will be taller than the row when description is off — decide whether
  that's acceptable or the art shrinks; state which),
- Blightbane link on vs off,
- a struck card and a full-match card,
- a card with no artwork in the JSON,
- mobile and desktop widths.

Per the codex convention this is verified by before/after comparison in the dev server, not tests.

### 7. Image loading and caching

**Measured facts about the source images** (checked against `blightbane.io`, 2026-07-31 — re-measure
if this spec sits unimplemented for long):

| Property | Value |
| --- | --- |
| Pixel dimensions | **70×70** |
| File size | **~1.9–2.9KB** (webp) |
| CDN | Cloudflare, `cf-cache-status: HIT`, `cache-control: public, max-age=31536` |
| Fetch time (warm edge) | **~90–130ms** |
| Unique artwork files | **2418** for 3076 cards — cards share artwork, so the browser dedupes repeats for free |

These numbers drive every decision below. ~2.2KB over a warm global CDN is a cheap fetch; the work
here is about not *breaking* that, rather than optimising it.

**7a. Raise the service-worker cache ceiling — the one real problem.**

`next.config.ts` caches `blightbane.io/images/**` `CacheFirst` with `maxEntries: 100`. A Cardex
result set easily exceeds 100 images, so card art would evict itself *and* evict the class, energy,
and event images the rest of the site depends on. This is the actual bug, and it is a one-line fix.

Give card art headroom — either raise `maxEntries` well past a plausible result-set size (~1000+, at
~2.2KB each that's only a couple of MB) or add a separate `runtimeCaching` entry matching
`/images/icons/` with its own ceiling, leaving the existing 100-entry bucket for everything else. A
separate entry is tidier: it stops a big Cardex session from evicting event artwork. Touching
`next.config.ts` requires `npm run build`.

**7b. Reserve the square; do not add a spinner.**

Fixed `width`/`height` on `next/image` already reserves layout space, so rows never reflow as images
arrive. That reflow-prevention is the genuine UX win — keep it.

Fill the reserved box with a **static placeholder**: the rarity border colour at low opacity, or a
flat `$color-component-border` square. Deliberately **not** a spinner per row:

- At ~100ms a spinner flashes and vanishes — visual noise, not reassurance.
- Hundreds of simultaneously animating elements cost more CPU than the images they're waiting on.
- A static tinted square communicates "art loads here" with zero runtime cost.

If measurement in 7d shows genuinely slow loads (slow connection, cold CDN), revisit — a CSS-only
shimmer on the placeholder is the next step, still not a spinner.

**7c. Do not self-host the artwork.** Considered and rejected; the reasoning is recorded so it isn't
re-litigated:

- 2418 files × ~2.2KB ≈ **5.3MB** added to the repo and every deploy (`public/` is 21MB today, so
  ~+25%).
- Blightbane already sits behind Cloudflare's global edge, which is **closer to most users** than a
  single origin. Self-hosting would likely be *slower*, not faster.
- It adds a second staleness axis: `fetch-card-artwork-mapping.js` already lags card syncs, and the
  bytes would lag too — every new card needs a re-download plus a redeploy.
- The theoretical win (same-origin, so `next/image` could optimize and we'd own `Cache-Control`) is
  negligible on a file that is already 2.2KB of 70×70 webp. There is nothing left to compress.

**7d. Measure, then confirm the default.**

- Search broadly (or use **Show all cards matching only the filters**) and check the network waterfall
  and scroll smoothness with art on.
- **`next/image` is lazy by default**, so off-screen rows shouldn't fetch. Confirm that empirically
  rather than assuming it. Note `@/shared/components/Image` passes `unoptimized` unless `optimized`
  is set, so these go straight to `blightbane.io` and skip Next's optimizer — which is correct here
  (see 7c) and also means `sizes`/`quality` do nothing. Don't add them.
- Throttle to a slow connection once, to sanity-check the placeholder decision in 7b.
- If the numbers are bad despite 7a, flip the default to `false` in task 1 and record why here.

**7e. Load ordering — check, but expect to change nothing.**

Lazy loading means off-screen rows aren't requested at all, which is most of what "visible first"
needs. Two caveats to verify in the waterfall rather than assume:

- **The lazy threshold is generous.** Chrome starts fetching several viewports ahead (~1250px on fast
  connections, further on slow ones). So the in-flight band covers the visible rows *plus* a few
  screens below, and within that band ordering is roughly **document order, not visible-first** — a
  row just below the fold can be requested before one at the top. At ~2.2KB each this overfetch is
  cheaper than tightening it would be; don't fight it without evidence.
- **All the art shares one origin.** HTTP/2 multiplexes to `blightbane.io` with no six-connection
  cap, but a large in-flight band still shares bandwidth, so on a slow connection visible images
  finish later than they would if fewer were racing. This is precisely what the throttled run above
  should expose.

If — and only if — the throttled measurement shows above-the-fold art arriving late, the levers are
`fetchPriority="high"` and/or `loading="eager"` on roughly the first 10–15 rows. Both are per-image
props that pass straight through `@/shared/components/Image` to `next/image`. Applying them needs a
row index in `ResultCard`, which it doesn't currently receive — note that cost before reaching for
them. **Default position: add neither.**

Related, and worth knowing so it isn't mistaken for a win: `shouldHideTrackedCards` hides rows with
`display: none`, and browsers don't fetch `display: none` lazy images — so hidden rows cost no
bandwidth. But they still mount and still occupy document order, so hiding tracked cards does **not**
reorder or shrink the priority band.

**Sizing constraint this imposes on task 6:** the source is only **70×70**. Displaying much above
~64px will look soft, and above 70px it upscales outright. That comfortably covers the ~48px
title+description target, but it is a hard ceiling — don't tune past it.

### 8. Verify

`npm run verify`. The `next.config.ts` change in task 7a also requires `npm run build`. Then the
visual pass from tasks 6–7, plus a reload to confirm the new filter key persists through
`codexFilterStore` without disturbing existing cached filters. Service-worker changes only take
effect in a production build (`next-pwa` is `disable`d in development), so verify the cache behaviour
against `npm run build && npm start`, not `npm run dev`.

### 9. Scope the same feature for Skilldex — then write its own spec

**Do not implement this as part of the Cardex work.** This task is a research-and-design step whose
deliverable is a *new spec document* (e.g. `specs-skilldex-talent-art.md`), agreed with the user
before any Skilldex code is written. Start it only once tasks 1–8 are done and confirmed.

**The goal:** show a talent's artwork inside its tree node, positioned **between the name and the
description**. Possibly a small cross-section / cropped strip of the image rather than the whole
square, given how wide and short the node is.

#### What's already verified (so the new spec doesn't re-derive it)

- **Talents are cards as far as Blightbane is concerned**, and their artwork lives in the same
  `/images/icons/` namespace. So `CardArtworkImageUrl` and the shared `useCardImageSrc` hook from
  task 2 work unchanged for talents — no new URL builder, no new data pipeline.
- **Coverage is 100%.** Checked all 385 talents from the public `talents-name` endpoint against
  `card-artwork.json`: every one resolves, with **zero `artwork: null`** entries. Much better than the
  card case, so the missing-art fallback matters far less here — but keep one anyway, since the
  mapping can lag a sync.
- **The name → JSON → URL flow is the correct one, and it works.** Worked example:
  `"Typhon's Cunning"` → `card-artwork.json` gives
  `artwork: "Thyphon’s cunning_eclypse-miniset"` → `CardArtworkImageUrl(artwork)` →
  `https://blightbane.io/images/icons/Thyphon%E2%80%99s%20cunning_eclypse-miniset.webp` ✅
- **Corollary: never shortcut the JSON.** That same example shows why the mapping is load-bearing
  rather than a convenience — the filename has a **typo** (`Thyphon` vs `Typhon`), a **curly
  apostrophe** (`’`, not `'`), **lowercased** second word, and an **`_eclypse-miniset` set suffix**.
  No amount of transforming the talent name produces that stem, so
  `` `/images/icons/${encodeURIComponent(name)}.webp` `` can never work. Two related traps:
  `/images/talents/<anything>.webp` returns the *same* bytes for nonsense paths (a 200 there proves
  nothing), and the curly apostrophe means an exact-string `Map` lookup is required — normalising or
  straightening quotes on either side of the lookup would break it.
- `TalentData` (`src/codex/types/talents.ts`) has **no artwork field**, and `sync-talents` doesn't
  fetch one. That's fine given the above — resolve artwork at render time from the shared mapping
  rather than widening the Talents table.

#### What the new spec has to work out

This is genuinely harder than the Cardex side, because Skilldex nodes are **SVG rendered by D3**, not
DOM rendered by React. `next/image` is unavailable; lazy loading, `onError`, and the placeholder
approach from task 7b all need SVG equivalents (`<image>` elements, likely via
`renderingContext`-driven `<pattern>`/`clipPath` fills).

Points to resolve, roughly in order of how much they could sink the design:

1. **Node height is computed, not measured.** `src/codex/utils/talentNodeDimensions.ts` +
   `src/codex/constants/talentTreeValues.ts` derive every node's height from its content (`NODE.NAME`,
   `NODE.DESCRIPTION`, `NODE.CARD_SET`, `NODE.ADDITIONAL_REQUIREMENTS` …). Adding artwork means a new
   height contribution — so it must land in the dimension engine *and* the renderer
   (`talentNodes.ts`), which is exactly the "those two must agree" trap the existing nil-card-set
   invariant warns about. Getting them out of sync makes nodes reserve space they don't draw.
2. **It invalidates the dimension cache.** Per the codex invariant, node-dimension caches are keyed by
   all rendering settings — a new toggle has to become part of that key, and the layout memo deps.
   Note the related invariant: **don't** add anything zoom-related to the layout memo.
3. **`NODE.WIDTH` is a fixed 200.** A full square at ~70px tall eats a lot of a node whose name row is
   only 10–14px. This is the main argument for a cropped horizontal strip — decide the crop with real
   nodes on screen, and check what the 70×70 source can survive.
4. **Image count scales differently.** A large talent tree can render many nodes at once, but unlike
   Cardex there's no lazy-loading safety net in SVG. Revisit the task 7a cache ceiling with talent
   trees included; the separate `/images/icons/` cache bucket recommended there should cover both
   tools, but confirm the entry count still fits.
5. **Zoom interaction.** Zooming re-renders without re-laying-out. Confirm artwork scales with the
   node rather than re-fetching or re-measuring per zoom step.
6. **Which formatting toggle?** Probably a `ShowTalentArt` entry in `FormattingTalentFilterOption`,
   mirroring task 1. Same no-version-bump reasoning applies.
7. **Whether Eventmaps wants the same thing.** `EventTree` already renders images (it imports the
   shared `Image`), so there may be a reusable pattern — or a reason the two trees should stay
   separate. Worth a look while the context is fresh, but don't let it expand this task's scope.

Per the codex convention, whatever lands here is verified **visually** — before/after in the dev
server across expanded/collapsed nodes and every zoom stop — not with tests.

---

## Open question for later

Overlapping the rarity icon onto the artwork (instead of, or in addition to, the coloured border)
was considered and deferred. Once the border version is on screen it'll be easier to judge whether
the separate rarity column still earns its space, or whether the icon should move onto a corner of
the art and free up ~2rem of row width. Revisit then, not now.

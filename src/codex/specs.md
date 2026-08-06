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

### Keep comments short and concise

Comment the non-obvious *why*, in a line or two. Don't restate what the code says, don't narrate the
history of a change, and don't write a paragraph where a clause will do.

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

### 4. Move the special icons below the rarity icon — ✅ COMPLETED

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

### 5. Styling: rarity-coloured border and layout — ✅ COMPLETED

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

### 6. Tune the size visually — ✅ COMPLETED (48px desktop / 40px mobile)

Run `npm run dev` and iterate on the one SCSS size variable until the thumbnail roughly matches the
height of a row with both title and description shown. Compare against:

- description on vs off (art will be taller than the row when description is off — decide whether
  that's acceptable or the art shrinks; state which),
- Blightbane link on vs off,
- a struck card and a full-match card,
- a card with no artwork in the JSON,
- mobile and desktop widths.

Per the codex convention this is verified by before/after comparison in the dev server, not tests.

### 7. Image loading and caching — ✅ COMPLETED

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

**7a. Raise the service-worker cache ceiling — the one real problem.** — ✅ COMPLETED

`next.config.ts` caches `blightbane.io/images/**` `CacheFirst` with `maxEntries: 100`. A Cardex
result set easily exceeds 100 images, so card art would evict itself *and* evict the class, energy,
and event images the rest of the site depends on. This is the actual bug, and it is a one-line fix.

Give card art headroom — either raise `maxEntries` well past a plausible result-set size (~1000+, at
~2.2KB each that's only a couple of MB) or add a separate `runtimeCaching` entry matching
`/images/icons/` with its own ceiling, leaving the existing 100-entry bucket for everything else. A
separate entry is tidier: it stops a big Cardex session from evicting event artwork. Touching
`next.config.ts` requires `npm run build`.

**7b. Reserve the square; do not add a spinner.** — ✅ COMPLETED (static rarity-tinted placeholder, no spinner)

Fixed `width`/`height` on `next/image` already reserves layout space, so rows never reflow as images
arrive. That reflow-prevention is the genuine UX win — keep it.

Fill the reserved box with a **static placeholder**: the rarity border colour at low opacity, or a
flat `$color-component-border` square. Deliberately **not** a spinner per row:

- At ~100ms a spinner flashes and vanishes — visual noise, not reassurance.
- Hundreds of simultaneously animating elements cost more CPU than the images they're waiting on.
- A static tinted square communicates "art loads here" with zero runtime cost.

If measurement in 7d shows genuinely slow loads (slow connection, cold CDN), revisit — a CSS-only
shimmer on the placeholder is the next step, still not a spinner.

**7c. Do not self-host the artwork.** — ✅ N/A (nothing to implement). Considered and rejected; the
reasoning is recorded so it isn't re-litigated:

- 2418 files × ~2.2KB ≈ **5.3MB** added to the repo and every deploy (`public/` is 21MB today, so
  ~+25%).
- Blightbane already sits behind Cloudflare's global edge, which is **closer to most users** than a
  single origin. Self-hosting would likely be *slower*, not faster.
- It adds a second staleness axis: `fetch-card-artwork-mapping.js` already lags card syncs, and the
  bytes would lag too — every new card needs a re-download plus a redeploy.
- The theoretical win (same-origin, so `next/image` could optimize and we'd own `Cache-Control`) is
  negligible on a file that is already 2.2KB of 70×70 webp. There is nothing left to compress.

**7d. Measure, then confirm the default.** — ✅ COMPLETED

**Result:** verified against `npm run build && npm start`. Cache Storage shows the `card-artwork`
bucket filling **incrementally while scrolling**, which also confirms `next/image` lazy loading:
off-screen rows are not fetched up front. Scrolling stayed smooth, so the **default stays `true`**
(no need for the off-by-default fallback in task 1).

- Search broadly (or use **Show all cards matching only the filters**) and check the network waterfall
  and scroll smoothness with art on.
- **`next/image` is lazy by default**, so off-screen rows shouldn't fetch. Confirm that empirically
  rather than assuming it. Note `@/shared/components/Image` passes `unoptimized` unless `optimized`
  is set, so these go straight to `blightbane.io` and skip Next's optimizer — which is correct here
  (see 7c) and also means `sizes`/`quality` do nothing. Don't add them.
- Throttle to a slow connection once, to sanity-check the placeholder decision in 7b.
- If the numbers are bad despite 7a, flip the default to `false` in task 1 and record why here.

**7e. Load ordering — check, but expect to change nothing.** — ✅ COMPLETED (nothing changed)

**Result:** as predicted, no `fetchPriority`/`loading="eager"` added. Lazy loading covers it; the
row index that those props would require was never needed.

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

### 8. Verify — ✅ COMPLETED

`npm run verify` passes and `npm run build` succeeds. Service-worker behaviour was verified against
`npm run build && npm start` (not `npm run dev`, where `next-pwa` is disabled): the worker installs
cleanly, and the `card-artwork` bucket fills incrementally while scrolling — which also confirms
`next/image` lazy loading. The new `ShowCardArt` key persists through `codexFilterStore` across a
reload without disturbing existing cached filters.

**Uncovered while verifying — read this before task 9:** the service worker was not installing at all
in production, and had probably not been since the Next 15 upgrade. `next-pwa` 5.6.0 precached
`_next/dynamic-css-manifest.json`, a Next 15 build file that exists on disk but 404s over HTTP;
because precaching is atomic, that single 404 aborted the install and silently disabled every
`runtimeCaching` rule. So the caching this spec relies on was inert before task 7a, and the
`external-images` bucket documented in the root `CLAUDE.md` had likely never worked in production
either. Fixed here with `buildExcludes`, but the root cause is a stale dependency — see
`specs-next-pwa-replacement.md`. **Task 9 assumes a working service worker**, since talent trees
would share the `/images/icons/` cache bucket; re-verify it installs before relying on cache
behaviour there.

`npm run verify`. The `next.config.ts` change in task 7a also requires `npm run build`. Then the
visual pass from tasks 6–7, plus a reload to confirm the new filter key persists through
`codexFilterStore` without disturbing existing cached filters. Service-worker changes only take
effect in a production build (`next-pwa` is `disable`d in development), so verify the cache behaviour
against `npm run build && npm start`, not `npm run dev`.

### 9. Scope the same feature for Skilldex — ✅ COMPLETED (see tasks 10–16 below)

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

**Scoping done (2026-08-02).** Tasks 10–16 below are the result. One assumption above turned out to
be wrong and is corrected there: **`EventTree` renders no SVG images at all** — the shared `Image`
import belongs to `EventList`, the React sidebar. There is no existing SVG-image pattern in this
codebase to copy.

---

## Skilldex: "Show talent art"

Same feature for Skilldex: a `Show talent art` toggle that draws a **full-width horizontal strip** of
the talent's artwork between the name and the description.

### Decisions already made

Settled with the user during scoping — implement as stated, don't re-litigate:

| Question | Decision |
| --- | --- |
| Crop | **Full-width strip, centre crop.** Spans the node's whole 200px width via `preserveAspectRatio="xMidYMid slice"`. Most of the 70×70 source is discarded; the middle is where the subject usually is. |
| Placement | Between the name separator and the description, i.e. inserted into the existing `yPos` chain after `yPosAfterName`. |
| Description hidden | **Still show the artwork.** One rule, one code path — the toggle alone decides. |
| Missing artwork | **Reserve the strip and draw a flat placeholder.** Node height must not depend on whether the mapping resolves, so the dimension engine never has to consult it. |
| Default | Was **off** pending measurement (no lazy-loading safety net in SVG). **Measured in task 13 and flipped to `on`** — see task 10. |

### Why this is harder than the Cardex side

Skilldex nodes are **SVG drawn by D3**, not DOM rendered by React. `next/image` is unavailable, so
lazy loading, `onError` and the placeholder all need SVG equivalents. And node height is **computed
in one file and drawn in another**, so every change has to land in both.

### 10. Add the `ShowTalentArt` filter option — ✅ COMPLETED

Mirrors task 1 exactly.

**As implemented:** `ShowTalentArt` placed **first** in the enum (as Cardex did), so the panel reads
talent art → description → card set → keywords → Blightbane link → expand all nodes. No changes needed
to `TalentSearchPanel` (it renders `allFormattingTalentFilters`) or to `TRACKED_FILTER_HANDLERS` (the
existing `handleFormattingFilterToggle` already covers the new key).

- `src/codex/types/filters.ts` — add `ShowTalentArt` to `FormattingTalentFilterOption`.
- `src/codex/hooks/useSearchFilters/useFormattingTalentFilters.ts` — add the default,
  `'Show talent art'` to `valueToStringMap`, and derive + return `shouldShowTalentArt`.
- **No `codexFilterStore.ts` version bump** — same reasoning as task 1.

The checkbox appears automatically from `FormattingTalent.getAll()`. Verify visually; nothing else
should change yet.

**Default flipped to `true` (2026-08-05)**, superseding the decision table's "Off, unlike Cardex".
That default was provisional on task 13's measurement, which has now been done: rendering *every*
tree with all nodes expanded showed all artwork instantly, no lag and no visible loading. See task 13.

### 11. Resolve talent artwork with the shared hook — ✅ COMPLETED

**As implemented:** `getCardImageSrc(cardName, fallbackImageSrc?)` exported from
`@/shared/hooks/useCardImageSrc`, with `useCardImageSrc` delegating to it for both its initial state
and its effect — one `Map`, one lookup path, no duplication. Signature and default fallback
(`PestilenceDecreeUrl`) match the hook, so scoring is untouched; Skilldex will pass its own fallback
in task 12/13. Verified the spec's worked example against the real JSON:
`"Typhon's Cunning"` → `"Thyphon’s cunning_eclypse-miniset"`.

Docs updated in the same task: the root `CLAUDE.md` *Custom Hooks* entry now names the plain function,
and the codex artwork invariant now covers talents and says which tool uses which export.

**Amended (2026-08-05) — the two tools do *not* share one lookup after all.** The `category` field
disambiguates names that carry different artwork as a card and as a talent: **category 10 is the
talent variant** (386 entries vs the ~385 known talents). 33 names have two or more non-null
artworks — `"Bulwark"` is `abilityart_1_59` as a card but `cardart_5_23` as a talent — so
`getCardImageSrc` gained a `preferTalentArtwork` flag selecting between two prebuilt maps, and
`talentNodes.ts` passes `true`. Precedence is **non-null first, then category**; each map falls back
to the other tool's artwork rather than missing, because 19 of those 33 names have no category-10
entry at all. Verified: all 386 category-10 entries resolve to their own artwork, 11 names now differ
between the tools, and **Cardex's resolutions were unchanged for all 3045 names** (the old
first-non-null-wins already happened to pick the non-talent entry).

The lookup is already solved — `@/shared/hooks/useCardImageSrc` (task 2) works unchanged for talents,
because Blightbane treats talents as cards and their art lives in the same `/images/icons/`
namespace. Coverage was measured at **100% of 385 talents, zero `artwork: null`**.

The problem is that `useCardImageSrc` is a **React hook** and the tree is drawn by D3 outside React's
render. So this task is about getting a URL into a D3 callback, not about the mapping:

- Export a plain function alongside the hook — e.g. `getCardImageSrc(name)` — and have the hook call
  it. The renderer then resolves URLs synchronously per node with no hook involved.
- Do **not** duplicate the `Map`. It is module-scope in `useCardImageSrc` precisely so it is built
  once; a second copy in the codex would double the memory and can drift.
- **Never transform the talent name into a filename.** The mapping is load-bearing:
  `"Typhon's Cunning"` → `"Thyphon’s cunning_eclypse-miniset"` has a typo, a curly apostrophe,
  a lowercased word and a set suffix. Exact-string `Map` lookup only — normalising quotes breaks it.

### 12. Render the artwork in the node — ✅ COMPLETED

**The design changed twice during implementation. What shipped is not a strip below the name — it is
a widened, faded artwork flush with the node's left edge, inside the name row.** The original plan is
kept below for context; the reasons it was abandoned are worth not rediscovering:

1. **Full-width strip (abandoned).** A 200px-wide strip is a **2.9× upscale** of the 70×70 source and
   looked visibly pixelated. Confirmed there is no higher-resolution source: `images/cards/`,
   `images/large/`, `images/full/`, `images/icons_large/`, `images/cards_full/` and `.png` all return
   the same 3826-byte placeholder with HTTP 200 (a deliberately bogus filename does too), and the
   `.png` is the same 70×70 at 4× the bytes. This also means the strip violated task 7e's own "70px is
   a hard ceiling" note. Shrinking the height wouldn't have helped — the *width* forced the upscale.
2. **Square icon beside the name (superseded).** Crisp, but left the widened name row looking airy,
   and a square can't use the horizontal space the taller row creates.
3. **Widened + faded artwork (shipped).** Visible window is `WIDTH_SCALE` times as wide as the row
   height, with the square source scaled to cover it (`slice`) so only its middle horizontal band
   shows. Trades vertical crop for horizontal coverage rather than resolution — at `WIDTH_SCALE: 1.75`
   there is effectively no upscale.

**As implemented:**

- `NODE.ARTWORK` — four tunable dials, all settled by eye in the dev server: `GAP: 8`,
  `EXTRA_ROW_HEIGHT: 12`, `WIDTH_SCALE: 1.75`, `FADE_WIDTH: 30`, plus `NAME_MAX_WIDTH_RATIO: 0.95`.
  Also added `NODE.CORNER_RADIUS: 8` and `NODE.BORDER_WIDTH: 2`, which **mirror `.talent-node`'s
  `rx`/`ry` and `stroke-width`** — nothing type-checks that pairing, so both sides carry a comment.
- **Artwork does change node height**, via `EXTRA_ROW_HEIGHT` added to the name row. The row-height
  formula is therefore extracted into one exported `getNameRowHeight(shouldShowDescription,
  shouldShowTalentArt)` in `talentNodeDimensions.ts`, used by **both** `_getNodeHeight` and
  `renderTalentNode` — the two-files-must-agree trap solved by not writing the sum twice.
- **Flush on three edges, so it clips to the node's corners.** `roundedLeftEdgePath` builds the shape
  by hand (not `rx`/`ry`): only the *left* corners round, and only when the name row is the node's
  first/last row. The bottom-left case is live — with description, Blightbane link **and** additional
  requirements all absent, the name row *is* the whole node. Corner flags are computed in
  `renderTalentNode`, the only place that knows what sits below the name row.
- **Inset by half the border width.** SVG strokes straddle the edge, so the node's visible border
  extends outside its nominal bounds; content flush to `-halfNodeWidth` sits *under* it. Two
  alignment bugs came from missing this and from centring the artwork on the name's *baseline*
  instead of the row's centre — the group origin is already the row centre.
- **The name's layout deliberately ignores `WIDTH_SCALE`.** It is centred in the space beside a
  *square* artwork, so widening never moves the text; the wider art passes underneath and a
  `<linearGradient>` mask fades it out first. Recentring against the widened art would squeeze long
  names and push them off-centre.
- **Positioning beside the name required measuring it.** SVG `text` with `text-anchor: middle` reports
  no width, so a guessed offset silently overlapped the glyphs (the first attempt's bug).
  `talentTextMeasurer.ts` gained variants for the name's three font states (`name` /
  `nameCollapsed` / `nameCollapsedLong`) plus `truncateTalentName`, since SVG has no
  `text-overflow: ellipsis`. **Those variants must track `.talent-node-name`'s fonts in the
  stylesheet.**
- **Name readability**: `paint-order: stroke` with a black stroke on `.talent-node-name`, not
  `filter: drop-shadow()` — a large tree draws hundreds of names, and a per-element blur filter is far
  more expensive than an outline (which also stays crisper at 12px). Unconditional, so it helps
  against tier-tinted backgrounds too.
- `getCardImageSrc(data.name, null)` passes `null` so an unresolved talent draws the flat placeholder
  rather than Pestilent Decree art. The placeholder is deliberately **not** masked — a faded flat rect
  reads as a rendering glitch where a crisp one reads as "no art".
- Per-node ids for the `clipPath`, `mask` and `linearGradient` (`toSvgId` strips spaces, apostrophes
  and commas): a shared id would apply the first node's geometry to every node.
- Task 14 was pulled forward — see that task.

Three invariants recorded in `src/codex/CLAUDE.md`: the derived sizing + shared `getNameRowHeight`,
the corner-radius/border-width coupling to the stylesheet, and the must-measure-the-name rule.

**Original plan, for context:**

`TalentTree/talentNodes.ts` + `constants/talentTreeValues.ts` + `utils/talentNodeDimensions.ts`.

**The two-files-must-agree trap.** `_getNodeHeight` sums section heights; `renderTalentNode` walks a
parallel `yPos` chain (`yPosAfterName` → `yPosAfterAdditionalRequirements` → `yPosAfterDescription`).
They are independent code paths over the same layout. Adding a section to one and not the other makes
nodes reserve space they never draw, or draw over their own content — the same failure the nil
card-set invariant warns about.

- Add `NODE.ARTWORK` to `talentTreeValues.ts`: `HEIGHT` (start ~28) and `VERTICAL_MARGIN`.
- Add the contribution to `_getNodeHeight`, gated only on the new toggle.
- Insert into the render chain after the name separator, before additional requirements, and thread
  the new offset through every downstream `yPos`.
- Draw with `<image>` + `preserveAspectRatio="xMidYMid slice"` and a `clipPath` to the strip
  rectangle — `slice` scales to cover and overflows, so without the clip it paints over the node.
- The strip is full-bleed to the node's 200px width, so it should sit **under** the node border
  rather than overlapping it; check paint order against the existing `rect`s.

### 13. Loading, count and the missing-art placeholder — ✅ COMPLETED

**Result (2026-08-05): the risk did not materialise, and the default is now `true`.** Rendering
*every* tree with all nodes expanded showed all artwork instantly — no lag, no visible loading. Why
it holds up despite there being no lazy loading:

- The art is ~2.2KB webp, HTTP/2-multiplexed to a single Cloudflare-backed origin.
- **Talents share artwork files with cards**, so a user who has browsed Cardex already has warm
  entries — and both tools share the one `card-artwork` bucket.

**Cache headroom, measured rather than assumed:** `card-artwork.json` holds 3102 entries, 3078 with
artwork, resolving to **2418 unique files** across both tools — against the bucket's `maxEntries:
1500`. So the bucket *cannot* hold everything, and never could; this predates talent art. It is
acceptable: Workbox evicts LRU **within** the bucket, an evicted entry costs one ~2.2KB refetch, and
talents add at most 385 files to a pool already sized for Cardex. Critically, talent art cannot evict
the class/energy/event images — those live in the separate 100-entry `external-images` bucket, which
is exactly what task 7a's split was for.

**Caveat on the measurement:** this was done in the dev server, where `next-pwa` is **disabled** — so
it exercised the *uncached* path (no service worker at all) and was still fast. That is the
reassuring direction to be wrong in, but it means the service-worker behaviour for talents has not
been observed in production; see task 16.

Cardex got lazy loading free from `next/image`. **SVG `<image>` has no such thing** — every node in
the tree fetches immediately on render, which is the main risk in this feature.

- Measure the real numbers first: how many talent nodes does the largest tree render at once? At
  ~2.2KB each the bytes are trivial, but the *request count* is not, and unlike Cardex there is no
  viewport culling.
- Talents share artwork with cards, so the `card-artwork` bucket from task 7a (1500 entries) already
  covers both tools. Confirm the combined count still fits rather than assuming.
- Missing art draws a **flat placeholder**, per the decision table. Keeping the reserved height
  unconditional is what lets `_getNodeHeight` stay ignorant of the mapping — do not let layout depend
  on whether a URL resolved.
- **The 200-HTTP caveat still applies**: `blightbane.io` serves a valid placeholder webp instead of
  404ing, so a wrong artwork value cannot be detected at request time. All miss detection is at the
  mapping level. Don't add retry logic.

### 14. Cache key and layout memo — ✅ COMPLETED

**Done during task 12**, because without it toggling the checkbox returns stale cached heights — which
would have made task 12's own visual check meaningless. All three landed: the
`art-${shouldShowTalentArt}` segment in `makeKey`, `shouldShowTalentArt` on
`TalentRenderingContext`, and the flag in **both** the layout memo's deps and the render effect's.
Nothing zoom-related was added to the layout memo.

Per the codex invariant, node-dimension caches are keyed by **all** rendering settings.

- Add the toggle to `makeKey` in `talentNodeDimensions.ts`. Without it, toggling artwork returns
  stale cached heights and nodes render at the wrong size.
- Add it to `TalentRenderingContext` and to the layout memo's deps in `TalentTree/index.tsx`.
- **Do not add anything zoom-related to the layout memo** — that separation is what keeps zooming off
  the dimension-caching path.

### 15. Zoom

Zooming re-renders without re-laying-out. Confirm the artwork scales with its node and does **not**
re-fetch or re-measure per zoom step — check the network panel while stepping through every zoom
stop, including `cover`.

### 16. Verify

`npm run verify`, then the visual pass: expanded and collapsed nodes, every zoom stop, description on
and off, a tree with many nodes, and mobile. Per the codex convention this is verified **visually**,
not with tests.

If task 13's measurements are bad, say so and leave the default off rather than shipping a tree that
fires hundreds of requests on open.

### Deferred

**Eventmaps.** Out of scope. `EventTree` renders no SVG images today, so there is no shared pattern
to extend — and if Skilldex ends up with a reusable `<image>`+`clipPath` helper, that is the point to
reconsider, not before.

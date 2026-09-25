# Spec: Cardex card modal

Clicking a Cardex result row currently toggles its **struck** (tracked) state. This spec moves that
toggle to a checkbox on the left of the row, and rebinds the row click to open a **`CardexModal`**
that renders the card **as it looks in the game**, plus the extra information Blightbane shows on
its card pages. The modal is populated **only** from Blightbane's per-card endpoint.

## Decisions already made

Settled in discussion — do not re-litigate them mid-implementation:

- **The strike toggle moves to a checkbox on the left of the artwork.** Not below the description:
  description, keywords and the Blightbane link can all be switched off, so that spot is not always
  there. The artwork may shrink on mobile to make room (Task 1).
- **The row click opens the modal**, and nothing else.
- **A new `CardexModal`, not Booty's `CardModal`.** Booty's modal is shaped around acquisition flags
  and treasure pools. Its only overlap with this one is the related-cards / related-events lists,
  and those are a nice-to-have here, not part of the core work.
- **The modal's data comes only from Blightbane's `/api/card/<id>`**, fetched when the modal opens.
  Nothing new goes into Supabase or into a static file.
- **The main purpose is an in-game rendering of the card**: frame, artwork, cost, name, type and
  description laid out as the game does. The Blightbane-style extra info sits beneath it.
- **The in-game assets come from the user**, along with in-game screenshots to compare against.
  Task 5 does not start until they exist.
- **The open card is in the URL by name, as `?card=<name>`** (e.g. `?card=sirens_call`). A name
  means something to whoever receives the link; an id doesn't. The name is resolved **against
  Cardex's own card list**, never through Blightbane's name lookup. That gives the card's
  `blightbane_id`, and the details are fetched by id. See Verified facts for why Blightbane's lookup
  can't be used.
- **Same-named cards need a distinguishing suffix — format still to be decided.** Cardex now shows
  every twin (16 names, 32 cards; each carries `hasDuplicateName`), so a bare name no longer
  identifies one card. One twin gets a suffix (`_2` or similar). **Decide the format with the user
  at the start of Task 4**, with Booty's reason for naming a kind rather than counting in mind (see
  _What to read first_). Twins are ordered by `blightbane_id` within their sort position, so a
  counter is at least stable while the set of twins doesn't change.
- **How `?card` interacts with the other params:**
  - `?card` describes whether a modal is open, not the search state. It **coexists with `?query`
    and every filter param**.
  - A URL with **only** `?card` leaves the cached filters and keywords in place. It must not trigger
    the reset that search params trigger on arrival.
  - **`?weekly` is not allowed alongside `?card`.** On arrival with both, `?card` wins and `?weekly`
    is dropped from the URL. This matches how the other codex params already take precedence over
    `?weekly`.
- **Nice to have, not scheduled:** a tracked checkbox inside the modal; related cards and events in
  the modal.

## Verified facts (checked 2026-09-25 — re-check before acting)

Measured against the live API, not assumed.

- **`GET https://blightbane.io/api/card/<id>` returns the full card record.** It sends
  `access-control-allow-origin: *`, so the browser can call it directly. Each response is ~1.5 KB,
  `cache-control: private` with an etag. Talents take `?talent=true`; Cardex doesn't need it.
- **Fields worth using** (checked on Bulwark, Fireball, Divine Bulwark and Staff of Thunder):
  - `cost`: `{ dex, int, str, holy, neutral, dexint, dexstr, intstr, blood }`, a count per energy
    type. All zero means free.
  - `flags`: `unique`, `unplayable`, `oneuse`, `persistent`, `chain`, `memorized`, `valuable`,
    `echo`, `reliable`, `firecast`, `grounded`, `heavy`, `uniqueInHand`, `charges` (a number),
    `canBeAcquired`, and a few display-only ones.
  - `keywords` (e.g. `["elite", "weapon", "treasure", "chain"]`), `flavortext`, `artwork`, `tier`,
    `version`, `designedBy`.
  - `effects` and `enchants`: structured effect lines (`type`, `status`, `desc`, `conditions`).
    They could explain enchantments like Divine Bulwark's Zeal. The raw `codeLine`s are internal
    and not for display.
  - Sources and links: `monsters` (names), `events`, `prereq` / `ispreq`, and `transmute` (ids that
    resolve against Cardex's own card list via `blightbane_id`).
  - `type` comes back as a **string** (`"1"`) here, while `cards-codex` returns a number.
- **An unknown id is not a 404.** `/api/card/99999999` returns **HTTP 200** with a stub
  `{"id":"99999999","name":"99999999","artwork":null,...}`, with a string `id` and no `cost`. The
  fetcher must detect this and throw. It is the only way a bad `?card=` value gets noticed.
- **Names are not unique.** `cards-codex` returns 2716 cards with **18 duplicated names** (e.g.
  `Consume`, `Hold the Line`, `Blessed`, `Siren's Call`). Many are genuinely different cards:
  Cardex's `Consume` is "Dispel a Blessing…", while the other `Consume` is "Deal 20 damage…".
  `sortAndRemoveDuplicates` in `cardsResponseMapper.ts` now drops only cards identical in every
  displayed field (just `Divinity` and `Marked`), so Cardex shows both twins of the other 16.
- **Blightbane's name lookup resolves a name to one fixed twin** (e.g. `/api/card/Consume` →
  894487), so it can't reach the other one. A `?card=<name>` must resolve through Cardex's own list,
  and the details must be **fetched by `blightbane_id`**.
- **Blightbane doesn't disambiguate duplicate names either.** `/card/<name>` always lands on the
  same twin, and a bare `/card/<id>` **redirects to the name URL**. Any query string suppresses the
  redirect: `/card/232361?id` renders that exact card (confirmed in headless Chrome). Cardex's row
  link uses this for twins via `BlightbaneCardByIdUrl`.
- **Blightbane has no card-frame assets.** Its bundle (`js/index.bundle.js`) draws cards with CSS
  and references only artwork folders: `icons/`, `status/`, `affixes/`, `monsters/`, `events/`,
  plus the energy orbs. The frames have to come from the user's own assets.
- **Blightbane serves status icons** at `https://blightbane.io/images/status/<name>.webp`. They
  could replace `<b>Burning</b>`-style keywords in the description with icons.
- **The description markup the modal has to handle** (counts across `cards-codex`):
  - Tags: `<b>` (~3800), `<br>` (~1300), `<nobr>` (62), plus rare `<color>` and `<sunforge>`.
  - Value tokens: `[damage:N]` (651), `[difficulty…]` (110), `[damageBonus]`, `[tempValue]`,
    `[enchantmentStacks]`, `[[otherMissingHealth]]`, `[my(status)Armor]`, and more.
  - `parseCardDescription` currently only strips brackets, so rows show these tokens raw. What the
    game prints for each one is part of Task 5's trial and error.

## Found while writing this — since fixed

Both were fixed separately, before any task here: Cardex now shows both twins of each duplicated
name, and the row's Blightbane link points at the right twin (by id). Tracking keys twins as
`name#id` (`getCardStrikeKey` in `utils/cardHelper.ts`). What's left for this spec is the `?card`
suffix decision above.

## How to work through this spec

### What to read first

- **Root [`CLAUDE.md`](../../CLAUDE.md)**:
  - _Working Style_: the dev server is the user's to run.
  - _Data Layer_: fetchers **throw** on failure and never return partial data. SWR drives client
    fetching.
  - _PWA & Performance_: next-pwa precaches `public/` by default, `public/noprecache/**` is
    excluded, and a single bad precache entry silently disables the whole service worker.
  - _Image sources_: originals live in `image-sources/`, and `public/` holds only generated output.
- **[`src/codex/CLAUDE.md`](./CLAUDE.md)**, the invariants this work runs into:
  - **`.result-card` has `content-visibility: auto`**, which implies `contain: layout paint`. The
    checkbox must sit **inside** the row's border box, or it gets clipped with no error.
    `contain-intrinsic-size: auto 3.875rem` is the pre-measure row-height estimate, so revisit it if
    Task 1 changes the row height.
  - **`.result-card__name`'s widths are minimums.** Its `flex-shrink: 1` + `min-width: 0` keep the
    `CardMetadata` pill pinned right on narrow widths. A new column on the left takes its width from
    the name, so mobile is where Task 1 breaks first.
  - **Cardex/Skilldex filter URL codes are permanent**, and **`?weekly` is honoured only when no
    other codex param is present.** Task 4 extends that rule and must not collide with any existing
    param name (`query`, `weekly`, and each `*UrlCodec.param`). `useCodexUrlParams` is **shared with
    Skilldex**, so `?card` handling must not leak into it.
  - **Cards come from Blightbane, not Supabase**, and artwork resolves through the module-scope
    `Map`s in `useCardImageSrc`. The modal's artwork goes through `getCardImageSrc(name, …,
card.category)` like the rows do. Don't read `artwork` off the per-card response instead: the two
    sources would drift.
- **[`useCardStrike.ts`](./hooks/useSearchFilters/useCardStrike.ts)**: `toggleCardStrike` is stable
  for the hook's lifetime, so memoized rows don't re-render on every strike. The new "open card"
  callback passed to rows must be just as stable, or every row re-renders on each modal open.
- **[`useBootyCardUrlParam.ts`](./hooks/useBootyCardUrlParam.ts)** and the Booty URL invariants in
  `src/codex/CLAUDE.md`: the pattern Task 4 follows.
  - The modal is derived from the URL **during render**.
  - It opens with `router.push(…, { shallow: true, scroll: false })`.
  - `router.query` is read only once `router.isReady`.
  - Names go into the URL through `normalizeEventNameForUrl` (lowercase, spaces → `_`), the same
    slug Booty and Eventmaps use.
  - Booty's suffix rule for its one overlapping name names the **kind** (`_weapon`), not a counter,
    so the URL doesn't reshuffle when the dataset changes. That's the precedent to weigh if Cardex
    ever needs a duplicate-name suffix.
- **[`specs-card-metadata.md`](./specs-card-metadata.md)**: unimplemented. It plans a static
  id-keyed file with `cost`/`artwork`/`flavortext` for the result **rows**. This spec does not
  depend on it: the modal gets the same fields live. If both get built, the modal must still render
  from its own fetch.

### Where to stop

**Every task pauses for confirmation**, apart from Tasks 2 and 3, which may be chained. Tasks 1, 3
and 5 all restructure what a single row or card looks like, across desktop and mobile. A layout
mistake in Task 1, such as the name column collapsing on mobile, would be buried under the modal
work that follows it.

Finish the task, get it into a state the user can look at, say what changed and what specifically
to look at, then wait. **The user runs the dev server, not the agent.**

**Task 2 has no visible effect of its own.** It adds the fetcher and hook only, so it isn't a broken
step. **Between Tasks 1 and 3 a row click does nothing**, which is also expected.

**Task 5 is blocked on the user's assets and screenshots.** Don't start it, or invent placeholder
frames, before they arrive.

**Mark each finished task `COMPLETED` in this file before asking the user to verify it**, so a fresh
context can tell what is already done from the spec alone.

### How it gets verified

- **Every task:** `npm run verify`.
- **Task 4:** also `npm run build`. It changes a data hook shared with Skilldex.
- **Task 5, if assets land in `public/`:** `npm run build && npm run check-sw`.
- **Visually, in the user's dev server:**
  - **Task 1 (rows):**
    - Desktop and mobile widths.
    - Card art on and off, and description on and off. Both change the row's shape.
    - A struck row and an unstruck one.
    - A full-match row: its shine must not be clipped by the checkbox.
    - _Hide tracked cards_ on, then strike a card. The row should disappear.
    - A long name on mobile. The metadata pill must stay pinned to the right edge.
  - **Task 3 (modal):**
    - A normal card, a free card, a multi-cost card, and a monster card.
    - A card with flavour text, and one without.
    - The loading state, via DevTools network throttling.
    - The error state: block `blightbane.io/api/card` in DevTools.
    - Escape and overlay click both close the modal. Desktop and mobile.
  - **Task 4 (URL):**
    - Cold load of `/cardex?card=<name>` alone: the modal opens and the cached filters are kept.
      Try it both with the card list cached and with it cleared (`codex_cards_v3`).
    - `?card=<name>&query=…` with filter params: both the search and the modal apply.
    - `?card=<name>&weekly`: `?weekly` is dropped and not applied.
    - Both twins of a duplicated name (e.g. the two `Consume`s): each row's URL opens its own card,
      and a cold load of each URL shows that twin, not Blightbane's pick.
    - Names with punctuation: `Siren's Call`, `BANG!`, `Bite (Companion)`. The URL must round-trip
      back to the card.
    - A bogus name: the modal closes and the param clears.
    - Browser Back closes the modal.
    - Editing a filter while the modal is open keeps `?card` in the URL.
    - Skilldex's URL behaviour is unchanged.
  - **Task 5 (in-game rendering):** side by side with the user's in-game screenshots, per rarity and
    banner. Desktop and mobile.

### Which docs change with the work

Found by grepping for `struck`, `strike`, `tracked`, `?weekly` and `result-card`:

- **[`src/codex/CLAUDE.md`](./CLAUDE.md)**:
  - The URL-params bullet ("`?weekly` is honoured only when no other codex param is present") gains
    the `?card` rule.
  - The `content-visibility` bullet mentions the struck backgrounds. Add that the checkbox is an
    in-row element for the same reason.
  - Add a new invariant: **`?card=<name>` resolves through Cardex's own deduped card list, and the
    details are fetched by `blightbane_id`, never through Blightbane's name lookup** (it picks a
    different twin for 13 names). The fetcher rejects the 200-stub response.
- **Root [`CLAUDE.md`](../../CLAUDE.md)**:
  - _Main Features_: the Cardex line (the modal).
  - _Data Layer_: the custom-hooks list and whichever per-card fetcher Task 2 adds.
  - _PWA & Performance_: only if Task 5's assets are precached.
- **[`KeywordsSummary`](./components/ResultsPanels/KeywordsSummary/index.tsx)**: the "tracked" copy
  doesn't say _how_ to track. Check it still reads correctly once tracking is a checkbox.
- **[`specs-card-metadata.md`](./specs-card-metadata.md)**: add a line saying the modal fetches cost
  live and doesn't depend on the static file.

If a task contradicts a documented invariant, raise it with the user rather than quietly rewriting
the invariant.

### Comment style

The non-obvious _why_, in a line or two. Don't restate the code or narrate the change's history.

---

## Tasks

### Task 1 — Move the strike toggle to a checkbox

In [`ResultCard/index.tsx`](./components/ResultsPanels/CardResultsPanel/ResultCard/index.tsx):

1. Remove `onClick={() => toggleCardStrike(card)}` from the row container.
2. Add a checkbox as the row's **first** flex child, before `CardArtwork`. It's there whether or not
   card art is shown.
   - Make it a real `<button type="button">` with `aria-pressed={isStruck}` and an `aria-label`
     naming the card.
   - Its handler calls `event.stopPropagation()`, ready for when the row gets its own click in
     Task 3. The Blightbane link wrapper already does the same.
   - Base the checked mark on `CardStrikeBadge`'s existing check path.
3. Mobile: reduce `ARTWORK_SIZE_MOBILE` in `CardArtwork.tsx` (currently 40) if the name column gets
   too narrow. The exact size is **left to trial and error in the browser**.

**Left to trial and error in the browser:**

- Whether `CardStrikeBadge`, the check overlaid on the name, stays. Once the checkbox shows the
  state, the badge is probably redundant.
- The checkbox's size and style.

Verify per _How it gets verified → Task 1_.

### Task 2 — Per-card fetcher and hook

No visible effect. May chain into Task 3.

1. Add `fetchCardDetails(id)` to [`services/cardsApiBlightbane.ts`](./services/cardsApiBlightbane.ts).
   It calls `GET /api/card/<id>` and **throws** on:
   - a non-OK status;
   - the stub response (`typeof data.id !== 'number'`, or `cost` missing).
2. Add a `CardDetails` type to [`types/cards.ts`](./types/cards.ts). Give it only the fields the
   modal renders (see Verified facts), not the whole response. Normalise `type` to a number.
3. Add `useCardDetails(id: number | undefined)` in `hooks/`, as SWR keyed on the id, no fetch when
   `id` is undefined. Keep it in memory only, with no localStorage. The data is per-card and
   fetched on demand, and the 24h card cache exists for the bulk list, not this.

### Task 3 — `CardexModal`, rendered plainly

`components/ResultsPanels/CardResultsPanel/CardexModal/`, built on the shared `InfoModal`.

1. **Row click opens the modal.** Add a stable `onOpenCard(card)` prop to `ResultCard` (see the
   `useCardStrike` note under _What to read first_). For now the panel holds the selected
   `blightbane_id` in local state. Task 4 moves it to the URL.
2. While the fetch is pending, render the header from the row's `CardData` (name, rarity, artwork),
   so the modal doesn't open empty.
3. **Render the Blightbane data plainly.** This lays out every piece of information and proves the
   data path. It is not the in-game look, which is Task 5.
   - Cost, name, type/category, rarity and card set, description.
   - Keyword flags (`unique`, `chain`, `charges: N`, …) and flavour text.
   - Where to get it (`monsters`, `events`).
   - Transmutes resolved to card names via the Cardex card list, dropping any that don't resolve.
4. Handle the loading and error states. The error state shows a message and keeps the modal
   closable. Per the root _Data Layer_ rule, never render partial data silently.

**Left to trial and error in the browser:** how much of the extra info to show, and in what order.
Blightbane's own card page is the reference.

### Task 4 — `?card=<name>` in the URL

Follow the Booty pattern (see _What to read first_), applying the rules under _Decisions already
made_:

1. Derive the open card from `router.query.card` **during render** (only once `router.isReady`), in
   place of Task 3's local state.
   - Resolve the param by matching it against each card's URL name (`normalizeEventNameForUrl`
     plus the twin suffix) over the **full** Cardex card list, not the filtered results.
   - Build the name map once per card-array identity. `getCardsByName` in `utils/treasureHelper.ts`
     does the same, so don't rebuild a ~2700-entry map every render.
   - Until the card list has loaded, nothing opens. The modal appears once the list resolves. It is
     usually a 24h cache hit, so that's immediate.
2. Open with `router.push(…, { shallow: true, scroll: false })`, so browser Back closes the modal.
   That matters most on mobile, where Back is the natural gesture. Close by removing the param.
3. In [`useCodexUrlParams.ts`](./hooks/useCodexUrlParams.ts):
   - `?card` alone must **not** trigger `applyParamsOnArrival`'s reset.
   - `?card` present means `?weekly` is ignored and removed from the URL.
   - The debounced write effect already builds on the _current_ query via `withParams`, so it should
     keep `?card` untouched. **Confirm that rather than assume it.**
   - Keep all of this Cardex-only. Skilldex shares the hook.
4. A name that matches no card, once the list has loaded, closes the modal and clears the param with
   `router.replace`, so Back doesn't reopen it.

A card outside the current results still opens, e.g. one that is filtered out, or a struck card with
_hide tracked_ on. Resolution uses the full card list, not the visible rows.

Per-card OG previews for shared links are **out of scope**: `/cardex` is one static page, so a query
param can't change its `<head>`. Booty solves this with a `[card].tsx` route, if it's ever wanted.

### Task 5 — In-game card rendering

**Blocked until the user provides the assets and in-game screenshots.** When they arrive:

1. **Agree an asset structure with the user before writing any code.** Which frame exists per
   rarity and banner, and which pieces are separate layers (frame, name plate, cost orbs, type
   band, keyword band)? Write that mapping into this task.
2. **Placement:**
   - Originals go in `image-sources/card-frames/`, output in `public/`.
   - Decide whether they are precached. Keep them small if so; otherwise put them under
     `public/noprecache/`.
   - Run `npm run check-sw` after the build.
3. Build the card as its own component inside `CardexModal/`, driven by `CardDetails`. It replaces
   the top of Task 3's plain layout. The extra info stays below it.
4. Render the description the way the game does: `[damage:N]` → `N`, `<b>` keywords (maybe with
   Blightbane's `status/` icons), `<nobr>`, `<color>`. Do this in a modal-specific helper.
   `parseCardDescription` feeds the rows, and changing the rows is out of scope.

**Left to trial and error in the browser against the screenshots:**

- Layer positioning and fonts.
- What each value token prints as.
- How hybrid costs (`dexint`, …) and `blood` are drawn.

Pause after each visual layer rather than building the whole card blind.

### Task 6 — Docs

Apply _Which docs change with the work_.

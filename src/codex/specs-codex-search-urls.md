# Spec: Shareable search URLs for Skilldex and Cardex

Both codex search tools hold their entire search state in localStorage and nothing in the URL. A
search that took effort to compose — `bleed, poison or corrode` across the talent tree — cannot be
handed to anyone. Eventmaps and Booty are both linkable; Skilldex and Cardex are not.

The end state: typing in either search field updates the URL to `?query=<text>` as you type, and
opening that link loads the tool with that search applied and **every other filter reset to its
default**, so the recipient sees what the sender saw regardless of what their own cached filters say.

## Decisions already made

These were settled during scoping. Don't re-litigate them mid-implementation.

- **Query param, not a route segment.** `?query=bleed`, not `/skilldex/bleed`. Booty went the other
  way for OG-tag reasons (`specs-booty-urls.md`); that reasoning does not apply here. A search is not
  an entity, there is no per-search artwork or description to preview, and the set of searches is
  unbounded so nothing can be statically generated. The param must not go in the sitemap either.
- **`query` is the param name.** Both tools use the same name. It matches the user-facing concept
  ("search query") rather than the internal one (`keywords`).
- **Only the search text, for now.** The filter groups (card sets, tiers, requirements, rarities,
  banners, formatting…) stay out of the URL in this iteration. Once this is proven in use, selected
  filters can be added; the hook should not be written in a way that makes that painful, but **do
  not build the filter serialization now**.
- **Arriving with `?query=` resets everything else, and overwrites the visitor's cached filters.**
  This is the explicit intent, not an accident of implementation: a shared link must show the sender's
  result, and a link that silently kept the recipient's cached Tier filter could hide the very thing
  being shared. The recipient's cached filters are lost. Accepted — see _What the reset deliberately
  costs_ for the one exception.
- **One shared hook for both tools.** Skilldex first, Cardex immediately after, with the same hook.
  This is the deliberate exception to the "no generic abstraction with a single consumer" rule in
  `CLAUDE.md`: there are two real consumers from the outset, with identical behaviour, and the hook's
  surface is small (a string in, a debounced write out).
- **Empty search clears the param.** `?query=` never appears; clearing the field returns the URL to
  `/skilldex` or `/cardex`. Mirrors how `selectEventAndUpdateUrl` returns to `/eventmaps`.
- **Shallow routing, always.** Both pages lazy-load their feature component via `next/dynamic`, and a
  non-shallow route change risks a remount that refetches the card or talent data. Every write is
  `router.replace(..., { shallow: true })`.
- **`replace`, not `push`.** Typing must not push a history entry per keystroke-batch — the back
  button would walk backwards through the search letter by letter. Eventmaps uses `push` because an
  event selection is a discrete navigation; a search is not.

## How to work through this spec

### What to read first

- **Root `CLAUDE.md`** — Working Style. Most relevant here: **the dev server is the user's to run**.
  Tasks 2 and 4 are verified visually; say what to look at and wait, never start `npm run dev`.
- **`src/codex/CLAUDE.md`** — three invariants bear on this work:
  - **Every filter mutator must be listed in `TRACKED_FILTER_HANDLERS`.** `hasUserChangedFilter` is a
    one-way latch gating the debounced localStorage write, so that mounting with cached filters
    doesn't immediately re-save them. This is directly load-bearing here — see _Why the cache
    overwrite happens for free_ below. Nothing type-checks it; the failure mode is a change that
    silently doesn't persist.
  - **Adding or removing a filter option does not need a `codexFilterStore.ts` version bump.** This
    work adds no filter options and changes no cached value's meaning, so **no version bump** —
    leave `CARDS_CACHE_VERSION` and `TALENTS_CACHE_VERSION` alone. Bumping `v1` would wipe every
    user's `struckCards`, which is weekly-challenge progress they cannot reconstruct.
  - **`.result-card` rows carry `content-visibility: auto`** and Cardex is deliberately not
    virtualized. Nothing here touches rendering, but don't "help" by memoizing result lists along
    the way.
- **`src/speedruns/hooks/useUrlParams.ts`** — the whole file. It is the only existing bidirectional
  URL-state hook in the repo and the closest precedent. Note two things to **copy**: the debounced
  `router.replace` and the `NB: Never use whole router object in dependencies!` comment at the end of
  the dep array. And one thing **not** to copy: its single-effect design, which decides between
  reading and writing by diffing previous state against current via refs. That is the source of its
  complexity and this feature doesn't need it — see _Why two effects, not one_.
- **`src/codex/hooks/useEventUrlParam.ts`** — for the `router.isReady` guard (line 26) and the
  `lastProcessedParamRef` de-duplication (line 23). Both are needed here for the same reasons.
- **`src/codex/hooks/useSearchFilters/useAllTalentSearchFilters.ts`** and
  **`useAllCardSearchFilters.ts`** — the two call sites. Read `resetFilters` in both and note that
  they are **not** equivalent: Cardex's deliberately omits `resetStruckCards`.

### Where to stop

**Tasks 1 and 2 may be chained.** Task 1 (the hook) has no visible effect on its own and must not be
mistaken for a broken step; Task 2 is what makes it observable on Skilldex.

**Pause for confirmation after Task 2 and Task 4.**

- Task 2 is the first point where the feature works end to end, and it is where the reset-on-arrival
  timing either looks clean or flashes the cached filters. That is a judgement call best made by
  looking at it.
- Task 4 applies the same hook to Cardex, where the struck-cards interaction makes the blast radius
  of a mistake larger — a wrongly-scoped reset destroys weekly-challenge progress.

At each pause: finish the task, get it into a state the user can look at, say what changed and which
states to check, mark the task **COMPLETED** in this spec, and wait. **The user spins up the dev
server, not the agent.**

### How it gets verified

- **`npm run verify`** after every task. Required before any task counts as done.
- **`npm run build`** after Task 2 and Task 4 — both touch data-hook wiring on pages that are
  statically optimized, and the first render's empty `router.query` is exactly the class of bug a
  build surfaces.
- **Visual, in the user's dev server**, for Tasks 2 and 4. The states to compare, because "it works"
  on one of them routinely misses the others:
  - **Type into the search field** → URL gains `?query=…` after a beat, not per keystroke. The field
    does not lose focus, the caret does not jump to the end, and results still filter normally.
  - **Clear the field** → URL returns to the bare path, no `?query=`.
  - **Cold load of `/skilldex?query=bleed`** with *different* filters cached beforehand (untick some
    tiers, reload) → search applied, and every filter group back to its defaults.
  - **Cold load of `/skilldex?query=bleed`** with **nothing** cached (fresh profile or cleared
    localStorage) → same result. This is the case a developer with a dirty localStorage never hits.
  - **Cold load of a bare `/skilldex`** → cached filters still restore as they do today. This is the
    regression most likely to be missed, because it is the path where *nothing should change*.
  - **`?query=` with a multi-keyword search**, e.g. `?query=bleed%2C%20poison` → the keyword pills
    render as they do when typed.
  - **Browser back/forward** after typing and clearing → no crash, no runaway effect loop, and the
    field is not left out of sync with the URL.
  - **Cardex only:** cold load of `/cardex?query=…` with cards struck beforehand → **struck cards
    survive**. See _What the reset deliberately costs_.
  - **Cardex only:** the Weekly Challenge button still works after arriving via a `?query=` link.

### Which docs change with the work

- **`src/codex/CLAUDE.md`** — gains an invariant once Task 4 lands, recording that arriving with
  `?query=` resets filters and overwrites the cache by design, and that struck cards are exempt.
  Grep it for `TRACKED_FILTER_HANDLERS` first: the new invariant sits next to that one, since it is
  the same latch seen from the other side.
- **Root `CLAUDE.md`** — the Cardex and Skilldex bullets under _Main Features_ don't mention URL
  state today. A one-clause addition each, no more.
- **`scripts/generate-sitemap.js`** — read the comment at its `urls` array before touching anything.
  Nothing should change here; the note exists so a later reader doesn't decide search URLs belong in
  the sitemap.
- If any task turns out to contradict a documented invariant, **raise it with the user** rather than
  quietly rewriting the doc.

### Comment style

The non-obvious *why*, in a line or two. The three things that will not be obvious to the next
reader: why the write is `replace` rather than `push`, why the read effect runs once rather than
tracking the param, and why the cache overwrite is intentional. Everything else in this feature is
self-evident from the code.

---

## Design

### Why two effects, not one

`useUrlParams` in speedruns has a single effect that decides, per run, whether it is reading the URL
into state or writing state into the URL — using refs holding the previous control state to tell
which direction the change came from. It works, but it is the most intricate hook in the repo and
the reason is that speedruns treats the URL as a *continuously synchronized mirror* of all eight
controls, in both directions, for the page's whole lifetime.

This feature does not need that, because the two directions happen at different times:

- **Read** happens **once**, on arrival, if `?query=` is present.
- **Write** happens **from then on**, whenever `keywords` changes.

So: one effect that reads the param exactly once and then permanently stands down, and one effect
that writes. No direction-detection, no previous-state refs. The read effect latching off after its
single run is also what stops the obvious infinite loop — read sets `keywords`, write updates the
URL, which would otherwise re-trigger the read.

A consequence worth stating plainly: **after arrival, the URL is write-only.** Editing `?query=` in
the address bar and pressing enter does a client-side navigation that will *not* re-apply the search.
This is deliberate — the alternative is tracking the param forever, which reintroduces the loop and
the ref machinery. A full page reload applies it correctly, which is what a shared link is.

### The shape

One hook, `src/codex/hooks/useSearchQueryUrlParam.ts`:

```ts
interface UseSearchQueryUrlParamOptions {
  keywords: string
  setKeywords: (keywords: string) => void
  resetFilters: () => void
}

export function useSearchQueryUrlParam(options: UseSearchQueryUrlParamOptions): void
```

Nothing returned — it is a synchronizer, like speedruns' `useUrlParams`. Both tools pass the same
three things, and both already expose all three from their `useAllXSearchFilters` hook. Note it takes
`resetFilters` as a callback rather than reaching into either filter hook, which is what keeps it
neutral between the two tools and what will let the Cardex-only struck-cards exemption stay in
Cardex's `resetFilters` where it already lives.

### Where it gets called

In `useAllTalentSearchFilters` / `useAllCardSearchFilters`, after `resetFilters` is defined. Not in
`skills.tsx` / `cards.tsx`, and not in the search panels:

- The panels are already several props deep and re-render on every keystroke.
- The page components don't own the filter state.
- Both aggregator hooks already own the equivalent concern — the debounced localStorage write is
  right there, and this is the same concern pointed at the URL instead.

### Why the cache overwrite happens for free

`resetFilters` in both tools calls `trackedSetKeywords('')` and the `reset*` functions, all of which
are wrapped by `createTrackedFilter` / `createTrackedSetter` and therefore flip
`hasUserChangedFilter.current` to `true`. The existing debounced cache effect then fires 1s later and
writes the reset state to localStorage.

So the requested overwrite behaviour needs **no new code** — it is what already happens when you call
`resetFilters`. Do not add an explicit cache write; the latch and the debounce already cover it.

The thing to actually verify is the opposite case: that a **bare** `/skilldex` load still leaves the
latch `false` and does not trigger a write. The read effect must not call `resetFilters` when there
is no param. This is the regression the "cold load of a bare `/skilldex`" check above exists for.

### What the reset deliberately costs

`resetFilters` on Cardex **does not** call `resetStruckCards` — struck cards have their own separate
button in the panel, because weekly-challenge progress is not reconstructable. Arriving via a shared
link therefore keeps the recipient's struck cards, which is correct: strikes are personal progress,
not search state, and a shared search that wiped them would be hostile.

But this means a shared Cardex link is **not** a perfect reproduction of the sender's view — struck
cards render differently. That is the right trade and it needs no fixing. Don't "complete" the reset
by adding `resetStruckCards` to it.

### The timing problem, and why the flash is acceptable

`getCachedTalentCodexSearchFilters()` is called **synchronously during render** and seeds every
sub-hook's `useState`. By the time any effect can read `router.query`, the cached filters are already
the initial state. There is no way to read the URL before that without threading the router into the
synchronous render path.

So the sequence on a cold `?query=` load is: render with cached filters → effect resets them → render
again. One frame of the recipient's cached filters.

In practice this is invisible, because both tools render `CodexLoadingMessage` until their data
arrives — the talent tree from Supabase, cards from Blightbane — and the reset effect runs long
before that resolves. The search panel is not even mounted yet (`{!isError && !isLoading && ...}`).

**If** it turns out to be visible, the fallback is to skip the cache at seed time — pass `undefined`
as `cachedFilters` into the sub-hooks when a param is present — but that needs a `router.isReady`
story for the statically-optimized first render and is strictly more invasive. **Try the effect
first.** Mark this as one of the few things here settled by looking, not by reasoning.

### Debounce interval

**400ms**, as its own constant in the hook. The three existing debounces are 150ms (`useKeywords`
parse), 1000ms (filter cache write) and 100ms (speedruns URL write). 400ms is deliberately slower
than the parse debounce so the URL settles after the results do, and much faster than the cache
write so the address bar doesn't feel stale. The speedruns 100ms is not a precedent to match: it
debounces discrete control clicks, not typing.

---

## Tasks

### Task 1 — The hook — COMPLETED

Create `src/codex/hooks/useSearchQueryUrlParam.ts` with the signature above.

**Read effect.** Guarded on `router.isReady`. Latches via a ref so it runs at most once. If
`router.query.query` is a non-empty string, call `resetFilters()` then `setKeywords(param)` — in that
order, since `resetFilters` clears keywords. If absent, do nothing at all (do not reset, do not
write). Trim the param and treat whitespace-only as absent.

**Write effect.** Skips until the read effect has latched, so arrival doesn't immediately write back
what it just read. Debounced at 400ms. Calls `router.replace` with `{ shallow: true }`, setting
`query: keywords` when non-empty and omitting the key entirely when empty. Preserve `router.pathname`
and clear the timeout on unmount.

Do **not** add `router` itself to either dep array — take `router.isReady`, `router.query.query` and
`router.pathname`, and carry the same `NB:` comment speedruns has. Reach for a ref holding `router`
if the linter fights you.

No visible effect on its own. `npm run verify`.

### Task 2 — Wire it into Skilldex — COMPLETED

Call the hook from `useAllTalentSearchFilters`, after `resetFilters` is defined, passing `keywords`,
`trackedSetKeywords` and `resetFilters`.

Pass the **tracked** setter, not `setKeywordsUntracked`. A shared link's search should persist to the
recipient's cache like any other search — and per _Why the cache overwrite happens for free_, the
tracked path is what makes the documented overwrite behaviour happen.

`npm run verify`, `npm run build`, then **pause**: mark COMPLETED and hand the user the visual checks
listed under _How it gets verified_ (the Skilldex ones — all but the two Cardex-only items).

### Task 3 — Encoding check — COMPLETED

Confirm that searches with commas, spaces, quotes and the `or` separator round-trip through the URL
unchanged. `useKeywords` splits on `/,\s+or\s+|,\s*|\s+or\s+/`, so `bleed, poison or corrode` is a
realistic and punctuation-heavy case.

Next's router encodes query values on write and decodes on read, so this is expected to need **no
code**. Verify it rather than assume it: the failure mode is a double-encoded `%2C` that produces a
different keyword set on the recipient's screen than the sender's, which no type-check catches. If it
does need handling, handle it in the hook, not in `useKeywords`.

`npm run verify`.

### Task 4 — Wire it into Cardex — COMPLETED

Same call in `useAllCardSearchFilters`, same three arguments, same tracked setter.

Confirm before finishing that Cardex's `resetFilters` is unchanged — in particular that
`resetStruckCards` is **still absent from it**. If a shared link is observed wiping struck cards,
that is a bug in this task, not a missing feature.

`npm run verify`, `npm run build`, then **pause**: mark COMPLETED and hand the user the full visual
list including both Cardex-only checks.

### Task 5 — Docs

Add the invariant to `src/codex/CLAUDE.md` next to the `TRACKED_FILTER_HANDLERS` one: arriving with
`?query=` resets all filters and overwrites the visitor's cached filters by design; struck cards are
deliberately exempt; the URL is write-only after arrival.

Add a clause to the Cardex and Skilldex bullets under _Main Features_ in the root `CLAUDE.md`.

Confirm `scripts/generate-sitemap.js` is untouched.

`npm run verify`.

---

## Deferred

**Filters in the URL.** The stated next step once this is proven. When it happens, the param design
is the open question, not the plumbing: the two tools have different filter groups (Skilldex has
tiers and requirements, Cardex has rarities, banners, types and extras), so either they get different
param sets — which breaks the one-hook symmetry this spec establishes — or a single opaque encoded
blob, which is unreadable and unhandwritable. Worth scoping properly rather than extending this hook
by reflex.

**OG tags per search.** Not possible for an unbounded param space without server rendering, and
`/cardex` and `/skilldex` are statically optimized. A shared link previews as the tool's generic OG
image. Fine.

**Eventmaps.** Already linkable via `/eventmaps/[event]` and its search field filters the event list
rather than the content. Out of scope.

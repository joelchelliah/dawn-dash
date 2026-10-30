# Spec: split `src/codex/` into `cardex/`, `skilldex/`, `eventmaps/` and `booty/`

`src/codex/` hosts four tools behind one shared `components/`, `hooks/`, `utils/` and `types/`. Move
each tool into its own top-level folder named after the tool, the way `speedruns/` and `scoring/`
already are, and give each its own `CLAUDE.md`. Code used by more than one of them moves to
`src/shared/`. **This is a pure restructure: no behaviour, storage key, URL or rendered output
changes.**

## Where the code goes today

An import graph from each tool's entry (`cards.tsx`, `skills.tsx`, `events.tsx`, `BootyPage.tsx`, plus
the `pages/` route files) classifies the 207 files under `src/codex/` (code files only, scss/json
excluded from the counts):

| Reached by        | Files | Destination                                    |
| ----------------- | ----- | ---------------------------------------------- |
| Booty only        | 54    | `src/booty/`                                   |
| Eventmaps only    | 33    | `src/eventmaps/`                               |
| Skilldex only     | 31    | `src/skilldex/`                                |
| Cardex only       | 30    | `src/cardex/`                                  |
| Two or more tools | 53    | `src/shared/` (after the untangling in Task 2) |
| Nothing           | 1     | `services/cardsApiSupabase.ts` — deleted       |

The "two or more" count is **inflated by a few thin couplings**, which Task 2 removes so they don't
drag tool-specific code into `shared/`:

- **The `hooks/useSearchFilters/index.ts` barrel** re-exports both `useAllCardSearchFilters` and
  `useAllTalentSearchFilters`, so Cardex nominally reaches the entire talent stack
  (`talentTreeHelper`, `talentNodeDimensions`, `talentTreeValues`, …). Counting through the barrel
  gives 30 Cardex+Skilldex files; resolved to what each tool imports, it's 8.
- **`KeywordsSummary`** (Cardex + Skilldex) types its `useCardStrike` prop as
  `ReturnType<typeof useCardStrike>`, a Cardex-only hook. Skilldex never passes it.
- **`FilterGroup/Checkbox`** imports `FilterTypeCard | FilterTypeTalent | FilterTypeEvent` from the
  shared `types/filters.ts`, which otherwise mixes all three tools' filter types in one 271-line file.
- **`codexFilterStore.ts`** holds three independent per-tool sections (cards / talents / events) that
  share nothing but `@/shared/utils/storage`.
- **`cardHelper.ts`**: Booty uses only `parseCardDescription`; every other export is Cardex's.
- **Cross-tool URL builders**: Booty imports `normalizeEventNameForUrl` from Eventmaps'
  `useEventUrlParam` (also used to slug Booty's own card URLs) and `SkilldexTalentUrl` from
  `utils/urlHelper.ts`, which pulls in `SEARCH_QUERY_PARAM` from `useCodexUrlParams`.

What is **genuinely shared** after that:

| Cluster             | Used by                           | Files                                                                                                                                                                                                                       |
| ------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Card data layer     | Cardex, Booty                     | `useCardData`, `cardsApiBlightbane`, `cardsResponseMapper`, `codexCardsStore`, `types/cards`, `parseCardDescription`                                                                                                        |
| Event data          | Eventmaps, Booty                  | `data/event-trees.json`, `types/events`, `useEventImageSrc`, `normalizeEventNameForUrl`                                                                                                                                     |
| Filter framework    | Cardex, Skilldex (some Eventmaps) | `useFilterFactory`, `filterUrlCodec`, `useFilterTracking`, `useCodexUrlParams`, `useCardSetFilters` (Booty uses its `getCardSetName`), `useKeywords`, `keywordMatching`, `useScrollToResultsOnArrival`, shared filter types |
| Search UI           | Cardex, Skilldex, Eventmaps       | `FilterGroup`, `Checkbox`, `SearchField`, `KeywordPills`, `KeywordsSummary`                                                                                                                                                 |
| Tree infrastructure | Skilldex, Eventmaps               | `utils/tree/*` (4 files)                                                                                                                                                                                                    |
| Zoom                | Skilldex, Eventmaps               | `ZoomSlider`, `StickyZoomSlider`, `useStickyZoom`, `constants/zoomValues`                                                                                                                                                   |
| Panel chrome        | all four / three                  | `PanelHeader`, `Section`, `CodexErrorMessage`, `CodexLoadingMessage`, `CodexLastUpdated`                                                                                                                                    |

Nothing outside `src/codex/` and `pages/` imports from it except `scripts/parse/tree-utils.js`
(a JSDoc typedef import of `types/events.ts`).

## Decisions already made

- **Tool folders never import from each other.** A tool imports only from itself and `@/shared/`;
  `pages/` import only from their own tool and `shared/`. Anything a second tool needs moves to
  `shared/`. This is what keeps the split from turning into four folders with a dependency web
  between them — and it's enforced by an ESLint rule in Task 9, not by convention.
- **Event data moves to `shared/`** (`shared/data/event-trees.json`, `shared/types/events.ts`), next
  to `card-artwork.json`. Booty reads it as heavily as Eventmaps does (`EVENTS_BY_NAME`, event
  artwork, `Event` type), so under the rule above it can't live in `eventmaps/`.
- **`shared/` keeps its by-kind layout** (`components/`, `hooks/`, `utils/`, `types/`, `constants/`,
  plus a new `services/`). Cohesive clusters move as subfolders, mirroring their current shape, so
  each move is 1:1: `shared/hooks/useSearchFilters/`, `shared/utils/tree/`.
- **Each tool folder mirrors `speedruns/`**: `index.tsx` + `index.module.scss` entry, then
  `components/`, `hooks/`, `utils/`, `types/`, `constants/`, `services/`, `data/` as needed. Booty
  keeps `BootyPage.tsx` beside its `index.tsx`. The `SearchPanels/` / `ResultsPanels/` /
  `BootyPanels/` grouping level is dropped — each tool has one of each, so
  `components/SearchPanels/CardSearchPanel/` becomes `src/cardex/components/CardSearchPanel/`, and
  `BootyPanels/shared/` becomes `src/booty/components/shared/`.
- **Storage keys, URLs and query codes do not change.** `codex_cards_v3`, `codex_cards_filters_v1`
  (which holds users' tracked cards), `codex_talents_*`, `codex_events_filters_v2` and the
  `_show_description_migrated` key keep their exact strings even where the file holding them is
  renamed — a changed key silently drops every user's cache, filters and tracked-card progress. The
  `/codex/*` legacy redirects in `toolRegistry.ts`, Blightbane's `cards-codex` endpoint, and the
  word "codex" in user-facing copy (`README.md`, meta descriptions, side menu) all stay.
- **Moves and content edits never share a commit.** Git's rename detection needs ≥50% similarity;
  a small file with rewritten imports can fall below it and show up as delete + add, losing
  `git log --follow` and blame. Task 2 does every content change in place ahead of the moves;
  Tasks 3–7 are `git mv` plus import-path edits only; Task 8 changes content again, after them.
- **`Codex*` identifiers keep their names during the moves.** Renaming (`CodexErrorMessage`,
  `useCodexUrlParams`, `codexFilterStore`, the `*CodexSearchFilterCache` types, …) is Task 11,
  optional, and only after everything is in place.
- **`services/cardsApiSupabase.ts` is deleted, not moved.** Nothing imports it, and it can be recreated
  if cards ever come from Supabase again. The root `CLAUDE.md` and the `src/codex/CLAUDE.md` "cards
  and talents come from different sources" bullet stop calling it "kept"; the dormant `Cards` table
  and `sync-cards` edge function are untouched.
- **All specs live in one `src/specs/` folder**, not beside their feature — each spec already says
  which part of the app it covers. Files drop the now-redundant `specs-` prefix:
  `src/specs/inp.md`, `src/specs/next-pwa-replacement.md`, `src/specs/card-metadata.md`, and this
  file, `src/specs/split-codex.md`. This replaces the root `CLAUDE.md` rule that specs live at
  `src/<feature>/specs-<topic>.md`.
- **The two weekly-challenge fetchers merge into one shared fetch, with a mapper per tool.**
  `src/codex/services/challengesApiBlightbane.ts` and
  `src/scoring/services/weeklyChallengeDataApi.ts` both export a `fetchLatestChallengeData` doing the
  identical two requests (`/allchallenges` → latest `uid` → `/challenge/<uid>`), with the same
  `response.ok` checks and `handleError`, and both already type the response with
  `@/shared/types/challengeApi`. They differ only in what they map the challenge to: Cardex derives
  filter data (keywords, special keywords, banners, card sets — tied to its `Banner`/`CardSet`
  enums), Scoring copies scoring params and display fields. So the fetch moves to
  `src/shared/services/challengesApiBlightbane.ts` as one function returning the raw
  `ChallengeApiResponse['challenge']`, and each mapper stays in its tool beside the hook that calls
  it. The hooks stay separate: each owns its SWR state and its mapped shape.

## How to work through this spec

### What to read first

- **Root `CLAUDE.md`** — Path Aliases (`next.config.ts` can't use `@/`; the explicit `@/codex/*`
  alias exists in three places), Data Layer and Data Synchronization (which scripts write into
  `src/codex/data/`), the testing policy, and "the dev server is the user's to run".
- **`src/codex/CLAUDE.md`** — not for the code changes (nothing about behaviour changes) but because
  Tasks 3–7 carve it up. The invariants that bite during a move:
  - **Both Booty route files must `export default` `BootyPage` itself.** After the move,
    `pages/booty/index.tsx` and `pages/booty/[card].tsx` must still each be a bare
    `export { default } from '@/booty/BootyPage'` — don't "tidy" them into a wrapper while editing the
    import path.
  - **`booty.tsx` owns the single `useCardData()` call** — moving `useCardData` to `shared/` must not
    invite a per-panel call.
  - **The talent-artwork and nil-expansion invariants span files that will now sit in different
    folders** (`talentNodeDimensions.ts` in `skilldex/`, `useCardSetFilters.ts` in `shared/`). The
    invariants keep their wording; they just need to say where the other half now lives.
- **`src/codex/utils/eventTreeSpacing/README.md`** and **`scripts/parse/README.md`** — both carry
  `src/codex/` paths and travel with the move.

### Where to stop

**Pause after every task.** Finish it, run its checks, mark it `COMPLETED` here, say what moved and
which pages to load, and wait — the user runs the dev server, and also owns the commits. Pausing
matters here for a specific reason: a commit per task is what keeps the history readable. Task 2's
content edits, each `git mv` batch and Task 8's fetcher merge need to be separate commits for rename
detection to hold (see decisions), and that only happens if the user commits at each boundary rather
than at the end.

**Tasks 1, 2, 3 and 9 have no visible effect.** Task 1 moves docs, Task 2 reshuffles exports inside
`src/codex/`, Task 3 moves shared code, Task 9 changes config. That's expected, not a broken step:
their check is that nothing changed.

### How it gets verified

Every task: **`npm run verify`** and **`npm run build`** (the moves touch `pages/` and data hooks).
Type-check catches every broken TS import, JSON import and dynamic `import()` path; `build` catches
SCSS `@use` paths. **Neither checks the `path.join(__dirname, '../../src/codex/...')` strings in
`scripts/`** — after any task that moves a data file, also run `git grep -n "src/codex" -- scripts`
and expect only the paths not yet migrated, and run `node scripts/generate-sitemap.js` (reads
`event-trees.json`) as a smoke test. `npm run type-check` does cover `tsconfig.scripts.json`'s
`include` of `types/events.ts`.

Visual smoke test after each move task, in the user's dev server, on the moved tool only:

- **Cardex**: a search with filters applied from a URL (`?query=...&set=...`), track a card and reload
  (tracked state survives — proves the storage key is unchanged), the weekly-challenge button.
- **Skilldex**: tree renders with artwork, expand/collapse, zoom slider (both the stops and Cover).
- **Eventmaps**: `/eventmaps` and a static `/eventmaps/<event>` route, zoom, filters persist across
  reload.
- **Booty**: `/booty`, a static `/booty/<card>` route with its modal open, click a related-card link
  (modal swaps in place, no flicker of the lower panels), an event link and a Skilldex talent link
  out of a modal.
- **Scoring** (Task 8 only): the weekly-challenge panels render the current challenge — name, intro,
  scoring rules, image.

Existing localStorage from before the refactor must keep working. Test in a browser profile that
already has cached data and filters, not a fresh one.

### Which docs change with the work

Found with `git grep -n -i "codex"` outside `src/codex/`:

- **Root `CLAUDE.md`** — Core Structure (`codex/` in the feature list), Main Features 2–5
  (`src/codex/` per tool), Path Aliases (explicit `@/codex/*`), Data Layer (store paths), Data
  Synchronization (`src/codex/data/` outputs, and the `cardsApiSupabase.ts` "unused legacy" note),
  the `specs-inp.md` and `specs-next-pwa-replacement.md` paths under PWA & Performance, and the
  "Long documents" example path. Shared Infrastructure gains the new `shared/` members briefly,
  pointing at `src/shared/CLAUDE.md` for detail. **Writing a spec** (Task 1): specs now live in
  `src/specs/<topic>.md`, and its "read first" guidance names the `CLAUDE.md` of whichever feature
  the spec covers rather than "the feature's own".
- **`src/codex/CLAUDE.md`** — dismantled across Tasks 3–7 (mapping below), deleted in Task 10.
- **`src/scoring/CLAUDE.md`** — its Key files entry for `services/weeklyChallengeDataApi.ts` (Task 8).
- **`.claude/skills/verify-changes/SKILL.md`** — lists `src/codex/utils/tree/` and
  `src/codex/utils/eventTreeSpacing/`.
- **`scripts/`** — `parse/parse-event-trees.js`, `parse/parse-validation.js`,
  `parse/tree-utils.js` (JSDoc import), `parse/README.md`, `generate-sitemap.js`,
  `find-same-depth-refs.js`, `sync/sync-treasures.js`, `sync/sync-weapons.js`, and the hint messages
  in `sync/sync-talents-preflight.js` (eight file paths it prints for a human to edit).
- **Config** — `tsconfig.json`, `next.config.ts` and `jest.config.ts` (`@/codex` alias; the `@/*`
  catch-all already resolves `@/cardex/…` etc. in all three), `tsconfig.scripts.json` (`include`),
  `.prettierignore` (`event-trees.json`).
- **`supabase/functions/README.md`** and **`supabase/functions/_shared/types.ts`** — links and
  "exact copy of" comments naming `src/codex/` files. The edge functions themselves need no redeploy:
  only comments change.
- **The three existing specs** — moved in Task 1; their "read first" pointers name
  `src/codex/CLAUDE.md` and `src/codex/...` files, fixed in Task 10 once the targets exist.
  `src/codex/CLAUDE.md` also cites `specs-inp.md`, `specs-card-metadata.md` and a
  `specs-booty-urls.md` that no longer exists; repoint the first two in Task 1 and drop the third
  when moving that bullet.

**New invariant to record** (in root `CLAUDE.md` under Project Architecture): tools don't import from
each other; anything a second tool needs moves to `shared/`, and `import/no-restricted-paths` enforces
it. If a move turns out to contradict an existing invariant, raise it with the user rather than
rewriting the invariant.

### Where `src/codex/CLAUDE.md`'s content goes

A new **`src/shared/CLAUDE.md`** takes the invariants about code that moves to `shared/`, so they
load only when working there rather than bloating the root file. Tool files point at it.

| Invariant / section                                                                                                                                          | Destination                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Layout/render split, zoom commits on drag end, `ZOOM_STOPS`, node-dimension cache keying, `utils/tree/`                                                      | `shared/CLAUDE.md`, with a one-line pointer from both `skilldex/` and `eventmaps/`                   |
| Nil expansion (`Core°`)                                                                                                                                      | `shared/CLAUDE.md` (lives in `useCardSetFilters`); the `TalentTree` half as a pointer in `skilldex/` |
| `TRACKED_FILTER_HANDLERS`, filter URL codes are permanent, no version bump for filter options, `<rarity:X>` tokens (`keywordMatching.ts` lives in `shared/`) | `shared/CLAUDE.md`                                                                                   |
| `blightbane_id`, cards vs talents sources, artwork `Map`s + per-category artwork + name collisions                                                           | `shared/CLAUDE.md` (card data layer), talent half to `skilldex/`                                     |
| Duplicate card names                                                                                                                                         | `shared/CLAUDE.md` for the rule; the Blightbane-link/strike-key specifics to `cardex/`               |
| Monster cards, `content-visibility` rows, `.result-card__name` widths, weekly-challenge data                                                                 | `cardex/CLAUDE.md`                                                                                   |
| Talent artwork (×5 bullets), talent text measurement                                                                                                         | `skilldex/CLAUDE.md`                                                                                 |
| `requirements` on dialogue/end nodes, `eventTreeSpacing/`, the un-shared `pages/eventmaps/` shape                                                            | `eventmaps/CLAUDE.md`                                                                                |
| Every treasure / pool / weapon / modal / route / striping bullet, `useCardData` ownership                                                                    | `booty/CLAUDE.md`                                                                                    |
| Visual verification of tree changes                                                                                                                          | each tree tool's file                                                                                |

Keep the wording; change only paths and the cross-references between files. Each new file follows
the `speedruns/CLAUDE.md` shape (title, one-line purpose, Key files, Invariants) and the root file's
length rule — no filler sections.

### Comment style

Moves add no comments. Where Task 2 splits a file, a split needs a comment only if the reason isn't
obvious from the names (e.g. why `KeywordsSummary` takes a structural type instead of the hook's).

## Tasks

### Task 1 — Move the specs to `src/specs/` — COMPLETED

Docs only. `git mv` `src/codex/specs-inp.md` → `src/specs/inp.md`,
`specs-next-pwa-replacement.md` → `next-pwa-replacement.md`, `specs-card-metadata.md` →
`card-metadata.md` (no content edits in the same commit, so the renames are detected). Then fix every
reference to their old names: root `CLAUDE.md` (Working Style, PWA & Performance, and the
**Writing a spec** section's location rule), `src/codex/CLAUDE.md`, and the specs' references to each
other — `git grep -n "specs-"` finds them. Paths _inside_ the specs that point at `src/codex/` code
wait for Task 10.

Verify: `npm run verify` (Prettier covers the markdown), and the `git grep` above returns nothing
that still means the old locations.

### Task 2 — Untangle the thin couplings, in place — COMPLETED

No file leaves `src/codex/` yet. Apart from Task 8, this is the only task that changes file contents
beyond import paths.

- Delete `services/cardsApiSupabase.ts`, and drop the "kept but imported by nothing" wording from the
  root `CLAUDE.md` Data Layer bullet and the cards-vs-talents bullet in `src/codex/CLAUDE.md`.
- Delete the `hooks/useSearchFilters/index.ts` barrel; its five importers import
  `useAllCardSearchFilters` / `useAllTalentSearchFilters` and their types from the files directly.
- `KeywordsSummary`: type the strike prop structurally (the members it actually calls, e.g.
  `undoLastTrackedCard`) instead of `ReturnType<typeof useCardStrike>`.
- Split `types/filters.ts` into what the filter framework and `Checkbox` need (`SharedFilterOption`,
  `CardSet*`, the `FilterType*` unions) and per-tool files for the rest (`types/cardFilters.ts`,
  `talentFilters.ts`, `eventFilters.ts`). Moving the `FilterType*` unions together is what lets
  `Checkbox` go to `shared/` without importing tool code.
- Split `codexFilterStore.ts` into three per-tool stores, **keeping each key string and version
  exactly**, including the show-description migration in the cards store.
- Split `cardHelper.ts`: `parseCardDescription` into its own module (shared-bound); everything else
  stays as Cardex's.
- Move `normalizeEventNameForUrl` out of `useEventUrlParam.ts` into `utils/urlHelper.ts`, beside
  `SkilldexTalentUrl`. Move `SEARCH_QUERY_PARAM`/`WEEKLY_CHALLENGE_PARAM` into a constants module so
  `urlHelper` no longer imports a hook. `findEventByName` stays with Eventmaps.
- Re-run the import-graph classification and confirm the shared set matches the table above before
  continuing; anything new in it gets raised, not silently moved.

Verify: `npm run verify`, `npm run build`. No visible change.

### Task 3 — Move the shared set to `src/shared/` — COMPLETED

`git mv` each shared file to its destination and rewrite imports; no content changes. Destinations:
`shared/components/` (`PanelHeader`, `Section`, `Codex*Message`, `CodexLastUpdated`, `ZoomSlider`,
`StickyZoomSlider`, `FilterGroup` + `Checkbox`, `SearchField`, `KeywordPills`, `KeywordsSummary`),
`shared/hooks/` (`useCardData`, `useEventImageSrc`, `useCodexUrlParams`, `useStickyZoom`,
`useScrollToResultsOnArrival`, and `useSearchFilters/` for `useFilterFactory`, `useFilterTracking`,
`useCardSetFilters`, `useKeywords`), `shared/services/cardsApiBlightbane.ts`, `shared/utils/`
(`cardsResponseMapper`, `codexCardsStore`, `filterUrlCodec`, `keywordMatching`, `urlHelper`, the
`cardDescription` module, `tree/`), `shared/types/` (`cards`, `filters` — now only the shared
filter types — and `events`), `shared/constants/` (`zoomValues.ts`, `urlParams.ts`),
`shared/data/event-trees.json`. Task 2 left these behind as tool-only, so they wait for their tool's
move: `types/cardFilters.ts`, `utils/cardFilterStore.ts`, `useCardStrike` (Cardex);
`types/talentFilters.ts`, `utils/talentFilterStore.ts` (Skilldex); `types/eventFilters.ts`,
`utils/eventFilterStore.ts` (Eventmaps).

Check for name collisions first — `shared/components/` and `shared/hooks/` have none today, but
confirm. Update `scripts/` and `tsconfig.scripts.json` / `.prettierignore` for `event-trees.json` and
`types/events.ts` in the same task, since the data file moves here. Create `src/shared/CLAUDE.md` and
move the shared invariants into it.

Verify: as above, plus the `scripts/` grep and `node scripts/generate-sitemap.js`. Smoke-test all four
tools briefly — this task touches every one of them.

### Task 4 — Booty → `src/booty/` — COMPLETED

Most self-contained (54 files, nothing else imports it). `booty.tsx` → `index.tsx`,
`booty.module.scss` → `index.module.scss`, `BootyPage.tsx` stays named. Treasure/weapon JSON to
`src/booty/data/`; update `sync-treasures.js`/`sync-weapons.js` `OUTPUT_DIR`. Update both
`pages/booty/` files, keeping them bare re-exports. Write `src/booty/CLAUDE.md`.

### Task 5 — Eventmaps → `src/eventmaps/` — COMPLETED

`events.tsx` → `index.tsx`. `eventTreeSpacing/` with its `README.md`. Both `pages/eventmaps/` files.
Write `src/eventmaps/CLAUDE.md`.

### Task 6 — Skilldex → `src/skilldex/` — COMPLETED

`skills.tsx` → `index.tsx`. Talent data layer (`useTalentData`, `talentsApiSupabase`,
`codexTalentsStore`) moves here. Update the path hints in `sync-talents-preflight.js` and the links in
`supabase/functions/README.md`. Write `src/skilldex/CLAUDE.md`.

### Task 7 — Cardex → `src/cardex/` — COMPLETED

`cards.tsx` → `index.tsx`. Weekly-challenge data (`useWeeklyChallengeFilterData`,
`challengesApiBlightbane`, `types/challenges`) is Cardex-only for now and moves here unchanged;
Task 8 then splits it. Write `src/cardex/CLAUDE.md`. _Done by `git mv`-ing what was left of
`src/codex/CLAUDE.md` — by then exactly Cardex's content — so `src/codex/` is gone after this task._

### Task 8 — Merge the weekly-challenge fetchers — COMPLETED

A content change, so its own commit after the moves (see decisions).

- Add `src/shared/services/challengesApiBlightbane.ts` exporting one fetch — e.g.
  `fetchLatestChallenge(): Promise<ChallengeApiResponse['challenge']>` — holding the two requests,
  both `response.ok` checks and the `handleError` + rethrow. It throws on failure like every fetcher.
- Cardex keeps its mapping as a pure function beside `useWeeklyChallengeFilterData` (the
  keyword/banner/card-set derivation and its `getBanners`/`getCardSets` helpers, unchanged), with the
  hook calling fetch then map. `src/cardex/services/challengesApiBlightbane.ts` is then deleted.
- Scoring does the same: its field mapping moves beside `useWeeklyChallengeData`, and
  `src/scoring/services/weeklyChallengeDataApi.ts` is deleted. Keep its commented-out
  `latestChallengeId` debugging override, in the shared fetch, if it's still wanted.
- Both hooks keep their own SWR keys and return shapes; check neither key changes, so neither tool's
  cache behaviour does.
- **Fold Cardex's duplicate challenge type.** `WeeklyChallengeFilterData` (in
  `types/cardFilters.ts`, used by `useWeeklyChallengeFilterData` and `useAllCardSearchFilters`) and
  `ChallengeData` (in `types/challenges.ts`, returned by the fetcher) are the same seven fields
  declared twice; the hook just re-types one as the other. Keep `WeeklyChallengeFilterData` as the
  mapper's return type and delete `types/challenges.ts`. Found in Task 2 and deliberately left for
  this task, since it's the one already rewriting that mapper.

Verify: `npm run verify`, `npm run build`; in the dev server, Cardex's weekly-challenge button applies
the same filters as before, and the Scoring weekly panels render the current challenge.

### Task 9 — Remove the `codex` alias and enforce the boundary

- Remove `@/codex` from `tsconfig.json`, `next.config.ts` and `jest.config.ts`.
- Add `import/no-restricted-paths` zones to `.eslintrc.js`: each tool folder may not import from the
  other three, and `src/shared/` may not import from any tool. **Confirm it fires** by temporarily
  adding a cross-tool import and seeing `npm run lint` fail — an alias the resolver doesn't map would
  make the rule silently pass.

### Task 10 — Docs and cleanup

Fix the `src/codex/` code paths inside `src/specs/*.md` (`src/codex/` itself is already gone, Task 7). Update the root `CLAUDE.md` (list above, plus the new boundary invariant),
`verify-changes/SKILL.md`, `scripts/parse/README.md`, `supabase/functions/`. Final check:
`git grep -n "src/codex\|@/codex"` returns only this spec — then delete this spec too.

### Task 11 — Optional: rename `Codex*` identifiers

Separate commit, after Task 10. Candidates: `CodexErrorMessage`/`CodexLoadingMessage`/`CodexLastUpdated`
(e.g. `DataErrorMessage`…), `useCodexUrlParams` → `useFilterUrlParams`, `codex*Store` →
`cards`/`talents`/`*FilterStore`, the `*CodexSearchFilterCache` types. **Storage key strings stay
exactly as they are.**

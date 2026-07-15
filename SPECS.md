# Dawn-Dash — Improvement Specs

Specs for changes and improvements to the codebase, ordered by impact (highest first).
Each spec is self-contained and implementation-ready. Unless stated otherwise, specs are independent — but **Spec 1 should land before Specs 2 and 3**, since they build on the registry it introduces.

**For the implementer (rules that apply to every spec):**

- Run `npm run verify` (format check, lint, type-check, tests) after each spec. It must pass before the spec is considered done.
- Do not change user-visible behavior unless the spec explicitly says so. These are refactors, fixes, and upgrades — the site should look and behave identically except where noted.
- Follow existing conventions: SCSS modules (`index.module.scss`), `createCx()` from `@/shared/utils/classnames`, path aliases (`@/shared/*`, `@/codex/*`, `@/speedruns/*`), Prettier (single quotes, no semicolons, 100 char width).
- Line numbers below are approximate — re-locate code by the identifiers given if lines have drifted.
- **No permanent tests.** Tests written to verify a spec during development are temporary — delete them once development is finished. Do not leave new test files behind unless explicitly requested (see the withdrawn Spec 18).

---

## Spec 1 — Central tool/page registry (extensibility) — ✅ COMPLETED

**Impact: Very high** — adding a new tool today requires touching ~9 files; this reduces it to 2 (the registry entry + the page component). It also becomes the single source of truth that Specs 2, and several smaller cleanups, consume.
**Effort: Medium**

### Problem

The app has 5 tools (Speedruns `/speedruns`, Cardex `/cardex`, Skilldex `/skilldex`, Event Maps `/eventmaps`, Scoring `/scoring`), and each tool's identity (path, title, icon, description, og-image) is duplicated across:

- `pages/index.tsx` + `src/landing/index.tsx` — hardcoded `NavItem`s for the landing page
- `src/shared/components/Header/SideMenu/index.tsx` — 6 hand-written `Link` blocks, each with its own `cx(...)` active-state expression (~lines 93–212)
- `src/shared/hooks/useNavigation.ts` — 6 near-identical `resetToX()` functions wrapping `router.replace(...)`
- `src/shared/constants/descriptions.ts` — tool descriptions
- `pages/{cardex,skilldex,speedruns,scoring}.tsx`, `pages/eventmaps/index.tsx` — per-page meta/OG tags (see Spec 2)
- `next.config.ts` — legacy redirects `/codex/cards → /cardex` etc. (lines ~26–44)

### Change

1. Create `src/shared/config/toolRegistry.ts`:

```ts
export interface ToolDefinition {
  id: string // 'cardex', 'skilldex', 'eventmaps', 'scoring', 'speedruns'
  path: string // '/cardex'
  title: string // 'Cardex'
  ogTitle: string // '🃏 Cardex'
  description: string // long description (from descriptions.ts)
  shortDescription: string // landing-page blurb
  ogImage: string // absolute URL
  logoImage: string // absolute URL of square logo
  landingImage: string // landing page artwork
  navIcon: string // icon/image used in SideMenu
  legacyPaths?: string[] // ['/codex/cards'] — used to generate redirects
}

export const TOOL_REGISTRY: ToolDefinition[] = [ /* one entry per tool */ ]
export const getTool = (id: string) => TOOL_REGISTRY.find((t) => t.id === id)
```

Populate it by lifting the existing values verbatim from the files listed above (do not invent new copy).

2. Refactor consumers to map over the registry:
   - **SideMenu**: replace the 6 hardcoded link blocks with a single `TOOL_REGISTRY.map(...)`, keeping the special-case `--home` class for the landing link (landing can stay outside the registry or be a registry entry with `id: 'landing'` — implementer's choice, but keep the rendered DOM/classes identical).
   - **Landing page** (`src/landing/index.tsx`): render `NavItem`s from the registry.
   - **useNavigation**: replace the per-tool `resetToX` functions with `navigateToTool(toolId, query?)`. Keep thin named wrappers exported temporarily if many call sites exist, or update all call sites (preferred — there are ~12 usages).
   - **next.config.ts**: generate redirects from `legacyPaths`. Note `next.config.ts` cannot use the `@/` alias — import via relative path.
   - **descriptions.ts**: delete once all consumers read from the registry.

### Acceptance criteria

- Every nav surface (landing, header side menu) renders identically to before (same text, hrefs, active states, icons).
- The three legacy `/codex/*` redirects still work.
- Adding a hypothetical 6th tool requires only: a registry entry + a `pages/` file.
- `npm run verify` passes.

---

## Spec 2 — Shared `PageHead` component (kills ~40 duplicated lines per page) — ✅ COMPLETED

**Impact: High** — 5 pages each repeat ~20 meta tags; SEO changes currently require 5 synchronized edits. Depends on Spec 1.
**Effort: Low**

### Problem

`pages/cardex.tsx`, `pages/skilldex.tsx`, `pages/speedruns.tsx`, `pages/scoring.tsx`, and `pages/eventmaps/index.tsx` each define `ogTitle`, `title`, `description`, `image`, `url`, `squareLogo` locally and repeat the same `<Head>` block (title, description, canonical, og:*, twitter:*).

### Change

Create `src/shared/components/PageHead/index.tsx`:

```tsx
export function PageHead({ toolId }: { toolId: string }) {
  const tool = getTool(toolId)
  // render the exact same set of meta tags the pages render today,
  // sourced from the registry entry
}
```

Replace each page's `<Head>` block with `<PageHead toolId="..." />`. Diff the rendered `<head>` before/after (e.g. via `next build` + inspecting the HTML, or a snapshot test) — the tags must be equivalent. `pages/eventmaps/[event].tsx` has dynamic per-event meta (see `src/codex/components/EventMapHead`); leave it as is, or let `PageHead` accept overrides and reuse it there.

### Acceptance criteria

- All 5 static pages emit the same meta tags as before.
- A new page needs only `<PageHead toolId="newtool" />`.
- `npm run verify` passes.

---

## Spec 3 — Unify duplicated talent-tree / event-tree infrastructure — ✅ COMPLETED (steps 1–4; step 5 skipped)

**Impact: High** — the single largest source of duplication (~1,000+ redundant lines). Every bug fix currently must be applied twice, and it demonstrably drifts (the two text-width estimators already diverge).
**Effort: High — do this in the sub-steps listed; each sub-step ships independently.**

### Problem

The talent tree (Skilldex) and event tree (Event Maps) features are parallel implementations of the same thing — a D3-hierarchy-based tree with measured node dimensions, cached dimensions, and canvas/heuristic text-width estimation:

| Talent | Event | Duplication |
|---|---|---|
| `src/codex/utils/talentNodeDimensions.ts` (~180 ln) | `src/codex/utils/eventNodeDimensions.ts` (~595 ln) | Same API: `getNodeHeight/getNodeWidth/cacheAllNodeDimensions`, same private caching pattern |
| `src/codex/utils/talentNodeDimensionCache.ts` | `src/codex/utils/eventNodeDimensionCache.ts` | Same `Map` + `createCacheKey` pattern; only the key fields differ |
| `src/codex/utils/talentTextWidthEstimation.ts` (~149 ln) | `src/codex/utils/eventTextWidthEstimation.ts` (~131 ln) | ~80 lines effectively identical (px-per-char heuristic, canvas fallback, emoji handling); event adds font variants |
| `src/codex/utils/talentTreeHelper.ts` | `src/codex/utils/eventTreeHelper.ts` | Both implement `buildNodeMap`, `calculateTreeBounds`, `findNodeById` over D3 hierarchies |
| `TalentResultsPanel/TalentTree/{index.tsx,talentNodes.ts,requirementNodes.ts,links.ts}` | `EventResultsPanel/EventTree/{index.tsx,nodes.ts,links.ts,badges.ts}` | Same render architecture (SVG setup, node/link draw passes) |

There is also `src/codex/utils/canvasTextMeasurement.ts` which overlaps with both estimators.

### Change (in order; each step keeps both features working)

1. **Text width estimation** — ✅ COMPLETED — create `src/codex/utils/tree/textWidthEstimation.ts` exposing one estimator parameterized by font config (`{ fontSize, fontFamily, approxPixelsPerChar, variants? }`). Port the superset of behavior (event's font variants). Delete both old files; update imports. This is the smallest, safest step — do it first.
2. **Dimension cache** — ✅ COMPLETED — create `src/codex/utils/tree/nodeDimensionCache.ts`: a factory `createDimensionCache<K>(makeKey: (k: K) => string)` returning `{ get, set, clear }`. Instantiate once per feature. Delete both old cache files.
3. **Dimensions** — ✅ COMPLETED — create `src/codex/utils/tree/nodeDimensions.ts` with a factory that takes feature-specific `measureHeight/measureWidth` callbacks and wires in the cache from step 2. The feature files shrink to just their business logic (talent: requirements/card sets; event: effects/choices).
4. **Tree helpers** — ✅ COMPLETED — move `buildNodeMap`, `calculateTreeBounds`, `findNodeById` into `src/codex/utils/tree/treeHelper.ts` (generic over node type). Keep feature-specific helpers where they are.
5. **⏭️ SKIPPED** — extract the shared SVG render skeleton from `TalentTree/index.tsx` and `EventTree/index.tsx`. Assessed after steps 1–4 landed: the remaining overlap is too small and the divergence too real to justify the abstraction — see "Explicitly considered and rejected" below. Re-evaluate a much smaller extraction after Spec 6 (note added there).

### Acceptance criteria

- Skilldex and Event Maps render pixel-identically (manually compare a couple of trees before/after, including expanded/collapsed nodes and zoom levels).
- Existing tests in `src/codex/utils/` still pass; add unit tests for the new shared estimator and cache factory.
- Net LOC in `src/codex/utils` decreases substantially (target: ≥600 lines removed by steps 1–4).
- `npm run verify` passes.

---

## Spec 4 — Decompose `eventTreeSpacing.ts` (1,221-line layout monolith) — ✅ COMPLETED (unit tests skipped by request; verified visually)

**Impact: High** — the file is effectively unmaintainable and untested, and it's where layout bugs will land. Independent of Spec 3 but pairs well with it.
**Effort: Medium**

### Problem

`src/codex/utils/eventTreeSpacing.ts` is a hand-rolled multi-pass layout engine:

- Pass 1 (center children under parents), Pass 1.5 (multi-parent centering), Pass 2 (fix overlaps, hardcoded max 10 iterations), Pass 3 (tighten gaps, max 10 iterations), Pass 4 (re-run 1.5).
- ~438 lines of geometry helpers (`getNodeLeftEdgeX`, `calculateGapBetweenNodes`, `calculateMaxShiftForNode`, …) share implicit state via parameters.
- `HORIZONTAL_SPACING_CONFIG` contains `*Enabled` flags that are never set to `false` anywhere — dead configurability.
- `console.error` on max-iteration exhaustion fires in production with no env guard (see Spec 12).
- Zero unit tests.

### Change

1. Split into a folder `src/codex/utils/eventTreeSpacing/`:
   - `index.ts` — public API, unchanged signature (whatever `EventTree` imports today).
   - `passes/centering.ts`, `passes/overlapResolution.ts`, `passes/gapTightening.ts`, `passes/multiParentCentering.ts` — one pass each, pure functions where possible.
   - `geometry.ts` — the edge/gap/shift helpers, as pure functions taking an explicit context object (`{ nodeMap, settings }`).
   - `config.ts` — constants. Delete the never-used `*Enabled` flags; name the magic numbers (`MAX_OVERLAP_ITERATIONS = 10`, the `minHorizontalGap / 10` threshold, etc.) with a one-line comment each explaining why.
   - `README.md` — a short doc: why multiple passes exist (multi-parent "ref children" break plain tree layout), what each pass guarantees, and the convergence caveat.
2. Add unit tests for `geometry.ts` and for at least Pass 2 (construct a small synthetic tree with a known overlap and assert it resolves).

### Acceptance criteria

- Event Maps render identically before/after (spot-check 2–3 complex events).
- No single file in the new folder exceeds ~350 lines.
- New tests pass; `npm run verify` passes.

**Follow-up:** the decomposition revealed that the repair-pass architecture itself is the complexity driver — see Spec 19 for replacing the horizontal passes with `d3-flextree`.

---

## Spec 5 — Shared filter engine for the search-filter hooks — ✅ COMPLETED (with deviations; verified via a differential test old-vs-new; final visual check pending)

> **Deviations (by request):** the generic `treeFilterEngine.ts` was initially built as spec'd, then collapsed into concrete talent functions (`talentTreeFilter.ts`) — with only one consumer (cards are a flat list, not a tree), the generic interface added indirection without value, and its synthetic-tree unit tests were too abstract to document real behavior. Engine unit tests were dropped for the same reason. Everything else landed: single-`useMemo` recompute in both hooks, O(n²) equality helpers deleted, stable filter callbacks, unchanged public return shapes.

**Impact: High** — `useAllTalentSearchFilters.ts` (532 lines) and `useAllCardSearchFilters.ts` (287 lines) duplicate the same orchestration, have a 10-entry `useEffect` dependency array, and re-traverse the whole tree on any filter change.
**Effort: Medium**

### Problem

In `src/codex/hooks/useSearchFilters/`:

- Both hooks follow the identical structure: ~9 `useCallback` predicates → a `collectAllMatchingSets`-style traversal capturing all predicates → a recursive tree filter → a `useEffect` with ~10 dependencies re-running everything.
- `useAllTalentSearchFilters.ts` ends with O(n²) tree-equality helpers (~lines 494–532).
- Any single toggled filter re-traverses the full talent tree.

### Change

1. Create `src/codex/hooks/useSearchFilters/treeFilterEngine.ts` — a plain (non-hook) module:

```ts
export interface FilterEngine<TNode> {
  collectMatches(root: TNode, predicate: (n: TNode) => boolean): Set<string>
  filterTree(root: TNode, matches: Set<string>): TNode | null
}
export const createTreeFilterEngine = <TNode>(opts: {
  getId: (n: TNode) => string
  getChildren: (n: TNode) => TNode[] | undefined
}): FilterEngine<TNode> => { /* pure, testable */ }
```

2. Rewrite both hooks to: build a single combined predicate with `useMemo` from the individual filter states (not chained `useCallback`s), and call the engine inside one `useMemo` keyed on `[tree, combinedPredicate]`. This removes the manual `useEffect`+`useState` recompute cycle and the equality helpers (memoization by reference replaces deep comparison).
3. Keep each hook's public return shape unchanged so consuming components don't change.

### Acceptance criteria

- Cardex and Skilldex filtering behaves identically for: keyword search, class/energy/event/card/offer filters, "include unavailable", formatting toggles, weekly-challenge tracking.
- The O(n²) equality helpers are gone.
- Unit tests for `treeFilterEngine` (match collection + tree pruning on a synthetic tree).
- `npm run verify` passes.

---

## Spec 6 — Separate tree layout from rendering; memoize expensive renders — ✅ COMPLETED (incl. both follow-up extractions; final visual check pending)

> **Verification:** layout/render split confirmed via a temporary instrumented test (removed after running): zoom changes (Cover → 100 → 150) trigger zero additional calls to `cacheAllNodeDimensions` / `adjustHorizontalNodeSpacing` / `adjustVerticalNodeSpacing` in both trees, while layout inputs (level of detail, formatting toggles) still re-run layout. Also done along the way: `getValueFromIndex`/`getValueToString` in `useFilterFactory` wrapped in `useCallback` (they were recreated every render, which would have defeated `React.memo`), and the event dimension cache is now only cleared on event change/unmount instead of on every settings change (cache keys already include all rendering settings, so toggling settings back and forth now reuses cached dimensions).

**Impact: Medium-high** — zoom changes currently re-run full layout (including the multi-pass spacing engine) instead of just re-rendering.
**Effort: Low-medium**

### Problem

- `TalentTree/index.tsx` and `EventTree/index.tsx` each have one big `useEffect` whose dependency array mixes layout inputs (tree, filters, formatting toggles) with render-only inputs (`zoomLevel`). Changing zoom re-runs layout.
- Neither component is wrapped in `React.memo`, so parent re-renders always re-render the trees.
- `TalentTree` receives entire hook results as props (`useSearchFilters: ReturnType<typeof useAllTalentSearchFilters>`), which defeats memoization and couples the component to hook internals.

### Change

1. In both tree components, split the single effect into: (a) a layout computation memoized on `[tree, ...filter/formatting inputs]`, and (b) a render effect depending on `[layout, zoomLevel]`.
2. Change `TalentTree`'s props from hook-result objects to the specific scalar/function values it uses (destructure in the parent panel). Do the same for `EventTree` if it has the same pattern.
3. Wrap both components in `React.memo`.

### Acceptance criteria

- Changing zoom level does not re-run dimension caching or spacing passes (verify by temporarily adding a counter/log during development, removed before finishing).
- Interaction behavior (expand/collapse, links, tooltips) unchanged.
- `npm run verify` passes.

### Follow-up check (after this spec lands) — ✅ both done

Both micro-extractions landed in `src/codex/utils/tree/svgHelper.ts`:

1. `setupTreeSvg(svgElement, { width, height, zoomScale, offsetX, offsetY, preserveAspectRatio })` — replaced the identical size/viewBox + `scale() translate()` group setup in both tree components (~25 lines each → 1 call). The SVG *clear* stayed in the components: the event tree must clear before measuring its container for zoom calculations, so ordering is caller-controlled.
2. `createGlowFilter` moved there too (was duplicated byte-for-byte); glow *rect* drawing stays feature-specific.

---

## Spec 7 — Standardize data-layer error handling and cache write feedback — ✅ COMPLETED (final visual check pending)

> **Notes:** All changes landed as spec'd, plus: (1) the two challenge fetchers (`challengesApiBlightbane.ts`, `scoring/services/weeklyChallengeDataApi.ts`) also silently returned `null` on failure — converted to throw-on-error like the rest; both consumers already handled errors, and `useWeeklyChallengeFilterData`'s `isFilterDataError` was previously unreachable on fetch failure (SWR saw a *successful* `null`). (2) The hooks' `isLoading`/`isLoadingInBackground` now exclude the error case — previously `isRefreshing` was never cleared on fetch error, so all three panels showed an infinite spinner instead of their error message (the error UI was gated behind `!isLoading`), and `CodexLastUpdated`'s "Error syncing" state was unreachable. (3) Fixed a latent bug in `cardsApiBlightbane.ts`: the progress timer was never cleared when `fetch` threw (now cleared in `finally`). (4) Created the minimal `src/shared/utils/logger.ts` exactly as Spec 12 defines it, since this spec's hooks log through it — Spec 12's codebase-wide console sweep remains to be done. The spec'd unit tests (`handleError`, `saveToCache`, `useCardData` hook-level) were written and used to verify all paths during development (fetch failure → visible error state; success → data cached + indicator cleared; cache-write failure → indicator kept + error logged), then removed by request — no permanent tests kept.

**Impact: Medium-high** — silent/inconsistent failures cause "stale data shown as fresh" and impossible debugging.
**Effort: Low-medium**

### Problem

1. **Inconsistent service contracts**: `src/codex/services/cardsApiBlightbane.ts` catches errors and returns `[]` at line ~51 (caller can't distinguish "no data" from "error"), while `talentsApiSupabase.ts` re-throws. `cardsApiSupabase.ts` mixes both: it throws on Supabase errors but silently `return []` mid-pagination when a page comes back empty (line ~37), discarding already-fetched pages without any error signal.
2. **`src/shared/utils/apiErrorHandling.ts`** only logs `isAxiosError(error)`; every non-Axios error (JSON parse, TypeError, Supabase client errors) is silently ignored.
3. **`src/shared/utils/storage.ts`** `saveToCache` swallows all errors (`console.warn`) — quota-exceeded failures are invisible to callers; stores in `src/codex/utils/codex*Store.ts` and `src/speedruns/utils/speedrunsStore.ts` inherit this.
4. **SWR hooks** (`useCardData`, `useTalentData`, `useSpeedrunData`) define `onSuccess` but no `onError`.

### Change

1. All service fetchers **throw** on failure (never return `[]`/partial silently). If a paginated fetch fails mid-way, throw.
2. Rewrite `handleError` to handle any `unknown`: extract status/message/data from Axios errors, `message` from `Error`, `String(error)` otherwise; always log; return a structured `ApiErrorInfo`.
3. `saveToCache` returns `{ success: boolean; error?: Error }` (keep the SSR no-op returning `{ success: true }`). Update the store wrappers to propagate it; hooks log a real error (via the Spec 12 logger) when a cache write fails and must not clear the "refreshing/stale" indicator in that case.
4. Add `onError` handlers to the three SWR hooks: log, and when stale local data exists, keep showing it while exposing the existing `isError`/error state so panels can show their error messages.

### Acceptance criteria

- Simulated API failure (e.g. temporarily breaking the URL in dev) produces a visible error state in Cardex, Skilldex, and Speedruns rather than an empty-but-happy UI.
- All fetchers have consistent throw-on-error contracts; `handleError` has unit tests covering Axios error, plain `Error`, and non-Error values.
- `npm run verify` passes.

---

## Spec 8 — Dependency updates (tiered) — ✅ COMPLETED (Tiers A + B; final visual check pending)

> **Notes:** All Tier A and Tier B updates landed; `npm outdated` now shows only the Spec 20 cluster (React 19 / Next 16 / ESLint 9+ and their paired plugins). Deviations and findings:
> (1) `eslint-config-next@15` bundles `eslint-plugin-react-hooks@5`, which conflicted with the project's direct v4 copy — the direct dep was bumped to `^5.2.0` so both dedupe to one plugin instance (lint passes with v5's stricter rules unchanged). `eslint-config-next` is pinned `~15.3.9` to stay on the Next 15.3.x line per this spec.
> (2) `@typescript-eslint` v8 removed `no-var-requires` → replaced with `no-require-imports` in `.eslintrc.js`; v8's `no-unused-vars` also checks catch params by default, which flagged one unused `catch (error)` in `useWeeklyChallengeData.ts` (now `catch {}`).
> (3) `web-vitals` was deleted, not upgraded — nothing imports it; `reportWebVitals` in `pages/_app.tsx` uses Next's built-in metric pipeline (`NextWebVitalsMetric` from `next/app`) and keeps working without the package.
> (4) **Pre-existing bug found and fixed:** `next.config.ts` spread `withPWA(options)` (a curried *function*) into the exported config object, which silently dropped the plugin — no service worker had been built since ~July 2025; `public/sw.js` was a stale committed artifact. Now correctly applied as `withPWA(options)(nextConfig)`; the build emits `[PWA]` output and regenerates `sw.js`/`workbox-*.js` again. This *is* a user-visible behavior restoration (clients get a fresh service worker).
> (5) New `sass` deprecated the Sass `if()` function → the three usages in `src/styles/_gradients.scss` were rewritten as `@if/@else` (identical compiled CSS); build is warning-free.
> (6) New `prettier` reformatted one union type in `src/codex/types/events.ts` (formatting only).
> Visual checklist for manual verification: speedrun charts (time axes via `chartjs-adapter-date-fns` + date-fns 4), "last updated" relative times (`useFromNow`), sliders (react-aria), PWA install/offline, Vercel Analytics events arriving, gradient text colors (hover + base).

**Impact: Medium-high** — several packages are years behind; a few combinations are genuinely inconsistent today.
**Effort: Tier A low, Tier B medium** (the former Tier C is now Spec 20 — a decision for later)

Current state (from `npm outdated`, July 2026) — apply in tiers, running `npm run verify` + `npm run build` after each tier:

### Tier A — safe, in-range or trivial (do all at once)

`sass`, `prettier`, `jest`, `jest-environment-jsdom`, `axios`, `chart.js` (4.4→4.5), `swr` (2.2→2.4), `@supabase/supabase-js` (2.49→2.110, same major), all `@react-aria/*` + `@react-stately/slider`, `eslint-plugin-import`, `eslint-plugin-react`, `eslint-plugin-prettier`, `eslint-config-prettier` (patch), `eslint-import-resolver-typescript`, `inkjs`, `@types/node` (within 22.x), `supabase` CLI.

### Tier B — majors that need small code/config changes

1. **`eslint-config-next` 14.2.35 → 15.3.x** — currently mismatched with `next@15.3.6`. Match the Next major/minor. (Do NOT jump to 16 — that pairs with Next 16, Tier C.)
2. **`@typescript-eslint/*` 5.62 → 8.x** — v5 predates TS 5.9 and is unsupported. v8 works with ESLint 8. Update `.eslintrc.js` rule names that changed; fix any newly flagged issues.
3. **Testing stack**: `@testing-library/react` 13→16 (compatible with React 18; import `render` API is unchanged, but v14+ requires `@testing-library/dom` peer), `@testing-library/jest-dom` 5→6 (update `jest.setup.js` import to `@testing-library/jest-dom` new entrypoint if needed), `@testing-library/user-event` 13→14 (API is promise-based: `await userEvent.click(...)`), `@types/jest` 30.
4. **`date-fns` 3→4** — mostly compatible; check the few call sites (`formatDistanceToNow` in `useFromNow`, chart date adapter). `chartjs-adapter-date-fns` supports v4 — verify chart time axes still render.
5. **`web-vitals` 2→5** — check how it's used (likely only in a reporting stub from CRA days); if unused, delete the dependency and the stub instead of upgrading.
6. **`@vercel/analytics` 1→2, `@vercel/speed-insights` 1→2** — check changelogs; imports are typically unchanged.

### Tier C — moved to Spec 20

The React 19 / Next 16 / ESLint flat-config migration is a separate decision, not part of this spec — see **Spec 20** at the bottom of this file.

### Acceptance criteria

- `npm run verify` and `npm run build` pass after each tier.
- `npm outdated` shows no remaining Tier A/B entries (Spec 20 items may remain).
- Manual smoke test: charts render with time axes, PWA still builds, tests pass.

---

## Spec 9 — Fix speedruns cache-duration mismatch and document intent — ✅ COMPLETED

> **Notes:** Kept the 10-minute TTL (intentional — leaderboard data receives new runs continuously, unlike codex data that only changes with game updates) and added a comment in `speedrunsStore.ts` saying so. Fixed both inaccurate `CLAUDE.md` lines: the "24-hour cache for speedruns" claim, and the cache-key list — which was doubly stale (`speedrun-...` vs actual `speedruns_v4_...` prefix; `codex_talents_filters_v2` vs actual `_v3`). The keys are now documented as pointers to the store files instead of literal values, so future version bumps can't re-create the drift. The cache-key strings were already constants co-located with their stores — no code change needed there.

**Impact: Medium** — verified real inconsistency between docs and code.
**Effort: Trivial**

`src/speedruns/utils/speedrunsStore.ts:7` sets `CACHE_DURATION = 10 * 60 * 1000` (10 minutes), while `CLAUDE.md` documents a "24-hour cache for speedruns". The codex stores use 24h (`src/codex/utils/codexCardsStore.ts:8`, `codexTalentsStore.ts:8`).

Decide the intended value (10 minutes is plausible for frequently-updated leaderboard data — if so, keep it), then fix the documentation in `CLAUDE.md` (see Spec 15) and add a comment in `speedrunsStore.ts` explaining why speedruns use a shorter TTL than codex data. Also extract the shared cache-key strings listed in CLAUDE.md into constants next to their stores if they aren't already.

**Acceptance:** code and docs agree; `npm run verify` passes.

---

## Spec 10 — Consolidate button components — ✅ COMPLETED

> **Notes:** The problem statement was partially stale: `PrimaryButton`/`SecondaryButton` were already thin styled wrappers over the shared `Button` (the spec's preferred end state) — what they duplicated was *each other* (identical structure, only class-color variants differed), and they are **not** visually interchangeable with `GradientButton` (class-colored theming vs gradients), so the replace-with-GradientButton option was out. Landed: (1) `src/shared/components/Buttons/types.ts` with `BaseButtonProps` as spec'd; `Button`, `GradientButton`, and `IllustratedButton` (via `Omit<..., 'children'>`) now extend it — purely additive props (`disabled`, `ariaLabel`, `type` where missing), all wired through, no behavior change for existing call sites. (2) Primary/Secondary merged into one `src/speedruns/components/Buttons/ClassColorButton` with `variant: 'primary' | 'secondary'` (both SCSS blocks kept verbatim in one module); all 6 usages across 4 call sites updated; old components deleted. Verified: no `PrimaryButton`/`SecondaryButton` references remain; `npm run verify` + `npm run build` pass.

**Impact: Medium**
**Effort: Low**

### Problem

- `src/speedruns/components/Buttons/PrimaryButton/index.tsx` and `SecondaryButton/index.tsx` (33 lines each) duplicate what `src/shared/components/Buttons/Button` + `GradientButton` provide.
- The shared buttons have inconsistent prop APIs: `Button` (`onClick, className, isLoading, type, style`), `GradientButton` (adds `subtle, bold, showClickAnimation`), `IllustratedButton` (`classType, imageUrl, isActive` — entirely different shape).

### Change

1. Add `src/shared/components/Buttons/types.ts` with a `BaseButtonProps` interface (`children, onClick, className?, disabled?, type?, ariaLabel?`); make all shared buttons extend it.
2. Reimplement speedruns' `PrimaryButton`/`SecondaryButton` as thin styled wrappers over the shared `Button` (keep their SCSS), or replace their usages outright with `GradientButton`/`Button` variants if visually identical. Delete the duplicated logic either way.

**Acceptance:** all buttons render/behave as before across Speedruns pages; no duplicated button logic remains; `npm run verify` passes.

---

## Spec 11 — Fix unstable React list keys — ✅ COMPLETED

> **Notes:** All listed occurrences verified and fixed; details on the non-obvious ones:
> (1) **EventList** — the outer `key={index}` was actually the group's event-type id (destructured as `index`, shadowed by the inner map's `index`); renamed to `typeIndex` for clarity. Item key is now `event.name` — checked `src/codex/data/event-trees.json`: no duplicate names (183 events), so the key is safe even under filtering.
> (2) **ParameterInfoList** — the old key was `` `${label}-${index}` `` where `label` can be JSX, i.e. effectively `[object Object]-N` (index-based). Now keys by `label`, with an optional `key` field on `Parameter` for JSX labels; the one JSX-label producer (`getFixedValueScoringParameters`) supplies `action-keyword-pointValue`.
> (3) **ScoringList** — its `items: JSX.Element[]` prop offered no content to derive keys from, so it was converted to a children-based component (callers render `<li>` directly). The ~17 static prose lists are no longer mapped arrays and need no keys at all; the three data-driven usages (`MAX_SCORES`, `KEYWORD_EXAMPLES`, `RARITY_BASE_POINTS`) map to `<li>`s keyed by `difficulty`/`card.key`/`rarity`. Rendered DOM is unchanged.
> (4) **ScoringTable** — `<th>`/`<td>` now keyed by `column.header` (verified unique per table). Row keys remain positional (`rowIndex`): rows are generic `Record<string, unknown>` data with no id, the tables are static, and the spec only flagged the column keys.
> (5) **Slider** — thumbs keyed by thumb index, which is the domain identity here (it's also the `index` prop passed to `Thumb`), not an incidental list position.
> (6) **AdvancedInsight** — comparisons keyed by `cardName-fixedPoints`.

**Impact: Medium** — latent reconciliation bugs when lists reorder/filter.
**Effort: Trivial**

Verified occurrences of index-based keys:

- `src/codex/components/ResultsPanels/EventResultsPanel/EventList/index.tsx`: line 92 `key={index}` on the event-type group div (use the group's type/name), and line 97 `key={`${event.name}-${index}`}` → use `event.name` (or an id if present) alone.
- `src/speedruns/components/Sliders/Slider/index.tsx:96`: `key={index}`
- `src/scoring/components/ParameterInfoList/index.tsx:37`, `src/scoring/components/ScoringTable/index.tsx:41`, `src/scoring/components/ScoringList/index.tsx:18`, `src/scoring/components/BolgarsBlueprintsPanel/AdvancedInsight.tsx:144,180`: `key={index}` variants.

For each: use a stable identifier from the data (name, label, mode). For truly static hardcoded content lists (some scoring lists), index keys are technically harmless — still switch to content-derived keys (`key={item}` or `key={label}`) for consistency, unless items can duplicate.

**Acceptance:** no `key={index}`-style keys remain in `src/` (grep `key={index}` and ``key={`${``…``-${index}`` patterns); UI unchanged; `npm run verify` passes.

---

## Spec 12 — Environment-guarded logger; remove stray console output — ✅ COMPLETED

> **Notes:** The problem list had drifted (earlier specs already resolved parts of it): the `codexCardsStore`/`codexTalentsStore` warns were gone (Spec 7), `eventNodeDimensionCache.ts` became `eventNodeDimensions.ts` (Spec 3), and the spacing `console.error` had moved to `eventTreeSpacing/logging.ts` (Spec 4). Beyond the listed sites, the sweep also found and converted `src/codex/utils/tree/textWidthEstimation.ts` (2 warns) and `src/speedruns/components/Chart/index.tsx` (2 warns). Decisions: `logMaxSweepsWarning` uses `logger.warn`, so the max-iterations message is now dev-only — silencing it in production was the stated goal; layout still completes when it fires. `ErrorBoundary` logs via `logger.error` (still always logs) and reports `track('error-boundary', { component, error: name+message })` wrapped in try/catch. Acceptance grep verified: `console.*` appears only in `logger.ts`.

**Impact: Medium**
**Effort: Low**

### Problem

Production console noise and inconsistent logging:

- `src/codex/utils/eventTreeSpacing.ts` (~line 648): `console.error` on max-iterations with no env guard.
- `console.warn` in `src/codex/utils/{codexCardsStore,codexTalentsStore}.ts:14`, `talentsResponseMapper.ts:~82`, `src/shared/utils/storage.ts`.
- `src/codex/utils/eventNodeDimensionCache.ts` (~lines 58–62) already env-guards — inconsistent with the rest.
- `src/shared/components/ErrorBoundary/index.tsx` (~line 36) only does `console.error`; errors are invisible in production. Vercel Analytics is already installed.

### Change

1. Create `src/shared/utils/logger.ts` with `logger.debug/warn/error`; `debug`/`warn` no-op outside development, `error` always logs. *(Already created by Spec 7 — this step is done.)*
2. Replace all direct `console.*` calls in `src/` with the logger (the ESLint `no-console` warning already nudges this).
3. In `ErrorBoundary.componentDidCatch`, additionally report via Vercel Analytics' `track()` (from `@vercel/analytics`) with the error name/message, wrapped in try/catch so reporting can never crash the boundary.

**Acceptance:** `grep -rn "console\." src/` returns only `logger.ts`; error boundary still renders its fallback; `npm run verify` passes.

---

## Spec 13 — Small verified hook fixes (bundle) — ✅ COMPLETED

> **Notes:** Items 1–3 landed as spec'd; item 4 was **already done** — both `useBreakpoint.ts` and `_breakpoints.scss` already carry the cross-referencing "NB: Values should match …" drift-guard comments the spec asks for, so no change was made. Details: (1) `useFromNow` now uses a self-rescheduling `setTimeout` (not a fixed `setInterval`) so the cadence adapts *as the timestamp ages* across the minute/hour boundaries, plus the `setFromNow(prev => …)` guard. One claim nuance: React already bails out when the new state string equals the old (strings compare by value), so consumers weren't literally re-rendering every second — the real waste was the interval firing and recomputing `formatDistanceToNow` each second, which the fix removes. (2) `useDeviceOrientation`: `isLandscape`'s `useState(checkIsLandscape())` initializer had the same hydration risk as the render-time `isMobile` — both now start `false` and are set in the mount effect; the `typeof window/navigator` guards became unnecessary (checks only run inside the effect). (3) `useScrollToTop` keeps the single effect guard; the callback guards were dead (click handler / scroll listener / rAF can't run server-side). Verified via temporary Jest tests (removed after passing, per project convention): adaptive tick cadence at second/minute/hour ages incl. boundary crossings, no consumer re-render on unchanged label, first client render of `useDeviceOrientation` matches SSR output (`isMobile === false`) with the real value applied after mount. `npm run verify` + `npm run build` pass.

**Impact: Medium** — real correctness/perf issues, each tiny.
**Effort: Low**

1. **`src/shared/hooks/useFromNow.ts`**: interval fires every 1000ms forever, re-rendering consumers each second even when the label is "3 days ago". Make the interval adaptive (every second under a minute old, every minute under an hour, hourly beyond) and only `setState` when the formatted string actually changed (`setFromNow(prev => prev === next ? prev : next)`).
2. **`src/shared/hooks/useDeviceOrientation.ts`**: `isMobile` is computed synchronously at render (`checkIsMobile()`) while `isLandscape` lives in state — this risks SSR hydration mismatch. Move both into state initialized `false` and set them in the mount effect (alongside the existing orientation listeners).
3. **`src/shared/hooks/useScrollToTop.ts`**: three separate `typeof window === 'undefined'` guards; keep one guard in the effect (the callbacks can't run server-side once listeners are only attached in the effect) and simplify.
4. **`src/shared/hooks/useBreakpoint.ts` + `src/styles/_breakpoints.scss`**: both hardcode 48rem/64rem. Add a comment in each file cross-referencing the other as the drift guard (a full SCSS-from-TS export is over-engineering for two values), or export the values from a small `breakpoints.ts` consumed by the hook.

**Acceptance:** hydration warnings absent in dev console on mobile emulation; relative-time labels still update; `npm run verify` passes.

---

## Spec 14 — Scoring feature: extract constants and reduce hardcoded repetition — ✅ COMPLETED (verified via before/after HTML diff; final visual check pending)

> **Notes:** The `220` claims all verified (only line numbers had drifted slightly). Landed: (1) `src/scoring/constants/scoring.ts` with `MAX_MALIGNANCY_PERCENT = 220` plus the other repeated game numbers found: `RARITY_SCORE_MULTIPLIER = 1.5`, `DUPLICATE_SCORE_MULTIPLIER = 0.5`, `ACCURACY_PENALTY_RATE = 0.1`; all logic usages replaced (`advancedScoring.ts`, `KeywordsBonusScoring` copy table, `AccuracyBonusScoring` penalties, `AdvancedInsight` break target) and the two prose spots now interpolate the constant. (2) Mechanical dedup: the ⚠️ unsupported-calculation-type block (was duplicated in `KeywordsBonusScoring` + `AdvancedInsight`) → `UnsupportedCalculationType`; the +50/+100/+200% scaling list (duplicated in `KeywordsBonusScoring` + `AccuracyBonusScoring`) → `MalignancyScalingList`; the 7 near-identical accuracy-table rows are now generated from offsets; `ExamplesPanel`'s three copies of the 6-parameter score list moved verbatim into typed data arrays + one renderer (~75 lines of JSX removed); `AccuracyBonusScoring` now reuses `getAccuracyWindowRange` instead of two inline copies of the same formula. `BlightbaneScorePanel` and `ParameterRankTable` were already data-driven (`FLAT_SCORE_BONUSES`, `PARAMETER_DETAILS`, etc.) — no change needed there. **Verification (temp tests, removed after):** a differential snapshot of all `advancedScoring` functions over a grid of inputs, and a jsdom render of every touched component (all modes + both unsupported-type branches) — rendered HTML is byte-identical before/after. **Found along the way:** `jest.config.ts` maps SCSS modules to `identity-obj-proxy`, which is not installed — pure-util tests never hit it, but any component test will fail until it's added as a devDependency (left as is; flagging for Spec 18).

**Impact: Medium** — the scoring feature is ~2,000 lines of prose-heavy panels with duplicated structure and magic numbers.
**Effort: Medium**

### Problem

- The max-malignancy value `220` appears as a bare literal in `src/scoring/utils/advancedScoring.ts` (lines ~205, 221, 228, 239, 245, 262) plus prose in `InGameScorePanel/index.tsx:276` and `BolgarsBlueprintsPanel/AdvancedInsight.tsx:155`.
- Panels (`BlightbaneScorePanel` 628 ln, `ParameterRankTable` 450 ln, `InGameScorePanel` 376 ln, `ExamplesPanel` 367 ln) repeat similar section/table/example structures with inline content.

### Change

1. Add `src/scoring/constants/scoring.ts`: `export const MAX_MALIGNANCY_PERCENT = 220` (and any other repeated numeric game constants found in `advancedScoring.ts`, e.g. score multipliers). Replace all logic usages; prose can interpolate the constant where it's rendered as a value.
2. Where two or more panels render the same visual structure (ranked parameter tables, example boxes with title/description/score), extract the repeated JSX into the existing small components (`ExampleBox`, `ScoringTable`, `ParameterInfoList`) or new ones, and move the content into typed data arrays (`const EXAMPLES: ScoringExample[] = [...]`) co-located per panel. Do **not** rewrite the prose content — move it, verbatim, into data.
3. Do not attempt a full CMS-style data-driven rewrite; target the mechanical duplication only.

**Acceptance:** scoring pages render identically (manual visual check of each panel); `grep -rn "220" src/scoring` shows only the constant definition + prose interpolations; `npm run verify` passes.

---

## Spec 15 — Documentation accuracy (`CLAUDE.md`) + AI-workflow improvements — ✅ COMPLETED (Part B items 2 & 4 skipped by request)

> **Notes:** All Part A claims were verified before implementing; two were stale: (3) the speedruns cache-duration line was already fixed by Spec 9, and beyond the spec's list the rewrite fixed further drift found during verification — speedrun charts are **Chart.js**, not "D3.js charts" (D3 is only used for the codex trees); `/src/codex/cards/` and `/src/codex/skills/` directories don't exist (codex is one feature dir with `cards.tsx`/`skills.tsx`/`events.tsx` entries); RTL is 16.x not 13.4; stale component/hook/util lists (missing IllustratedButton, PageHead, Select, ScrollableWithFade, Code, Image, useDraggable, logger/lists/object/textHelper; `imageUrls.tsx` → `.ts`); and no mention of the Spec 1–4 infrastructure (toolRegistry, PageHead, `utils/tree/`, `eventTreeSpacing/`). The rewrite also documents the two sync-ownership paths (edge functions own cards/talents; local scripts own events/artwork; speedruns fetched live), `deno.json`'s sole purpose, and `npm run verify` as the required pre-done check. Part B: feature `CLAUDE.md` files added for `src/codex/`, `src/speedruns/`, `src/scoring/` (architecture, key files, invariants like the intentional 10-min speedruns TTL and the visual-verification convention for trees), and `.claude/skills/{verify-changes,add-new-tool}/SKILL.md` committed — the add-new-tool checklist includes `scripts/generate-sitemap.js`, which the registry does not feed. **Skipped by request:** item 2 (docs/specs/ workflow — overhead for a single-developer project) and item 4 (testing guidance — tests may be removed from the project entirely).

**Impact: Medium for humans, high for AI-assisted development** — the project is developed with Claude, and its primary context file is wrong in several places, which degrades every future AI session.
**Effort: Low**

### Part A — fix `CLAUDE.md` (verified inaccuracies)

1. "three main features" → the app has **five**: Speedruns, Card Codex (`/cardex`), Talent/Skills (`/skilldex`), **Event Maps** (`/eventmaps`, `src/codex/` event components + `pages/eventmaps/`), and **Scoring** (`/scoring`, `src/scoring/` — ~20 components, entirely undocumented).
2. "6 test suites" → there are **2** (`src/codex/utils/cardHelper.test.ts`, `cardsResponseMapper.test.ts`).
3. "24-hour cache for speedruns" → speedruns cache is **10 minutes** (align with Spec 9's decision).
4. "Zustand-style stores" → the stores are plain localStorage wrapper modules, not subscription stores; describe them accurately.
5. Add missing sections: `src/landing/`, `src/scoring/`, `supabase/functions/` (`sync-cards`, `sync-talents`, `talents-name`) and their relationship to `scripts/sync-events.js` + `scripts/fetch-card-artwork-mapping.js` (document which sync path owns which data; `deno.json` exists solely for the edge functions — say so).
6. Document `npm run verify` as the required pre-commit check for AI-generated changes.

### Part B — AI workflow improvements

1. **Feature-level context files**: add a short `CLAUDE.md` (10–20 lines) inside `src/codex/`, `src/speedruns/`, `src/scoring/` describing that feature's architecture, key files, and invariants (e.g. "talent/event trees share `utils/tree/` after Spec 3 — change shared code in one place"). Claude Code automatically picks up nested CLAUDE.md files when working in those directories.
2. **Spec workflow**: add `docs/specs/` with a `TEMPLATE.md` (Problem / Change / Files / Acceptance criteria / Verification commands — the format of this document). New non-trivial work gets a spec file first; the spec is then handed to the implementing model. Keep completed specs as decision records.
3. **Skills**: add a `.claude/skills/` directory with two project skills:
   - `verify-changes`: instructs the agent to run `npm run verify`, then `npm run build` for changes touching `pages/`, `next.config.ts`, or data hooks, and to visually diff affected pages via the dev server when styling/tree-layout code changed.
   - `add-new-tool`: step-by-step checklist for adding a tool (registry entry per Spec 1, page file with `PageHead` per Spec 2, landing/menu verification) so future tools are added consistently.
4. **Testing guidance**: state in root `CLAUDE.md` that pure utils (`src/**/utils/*.ts`) must get Jest tests when created or refactored, and that tree-layout changes require before/after visual comparison.

**Acceptance:** every factual claim in `CLAUDE.md` matches the codebase; nested CLAUDE.md files exist for the three feature dirs; skills and spec template committed.

---

## Spec 16 — Split `icons.tsx` for tree-shaking — ✅ COMPLETED (final visual check pending)

> **Notes:** All claims verified before implementing: the file was exactly 399 lines with 18 exports — but only 17 are SVG icon components; `DropdownArrowIconUrl` is a helper returning a CSS `url(...)` data-URI string (used by `Select` as a background-image). It moved into the folder as a plain `.ts` file so the old module could be deleted cleanly. Landed: `src/shared/components/Icons/` with one file per icon (content copied verbatim), shared `IconProps` in `types.ts`, and a barrel `index.ts` with named re-exports; all 9 import sites updated mechanically; `src/shared/utils/icons.tsx` deleted. Bundle check: `next build` route output is **byte-identical** before/after (every Size and First Load JS value unchanged) — expected, since all imports were already named imports of tiny components; the win is organizational plus tree-shaking readiness for future partial consumers. `npm run verify` + `npm run build` pass.

**Impact: Low-medium**
**Effort: Low**

`src/shared/utils/icons.tsx` (~399 lines) holds ~18 inline-SVG icon components in one module imported across the app. Move to `src/shared/components/Icons/` with one file per icon and a barrel `index.ts` re-exporting them (named exports enable tree-shaking; verify with `next build` bundle output that page chunks shrink or stay equal). Update imports codebase-wide (mechanical find/replace). Keep `imageUrls.tsx` where it is.

**Acceptance:** all icons render as before; no imports from `@/shared/utils/icons` remain; `npm run verify` + `npm run build` pass.

---

## Spec 17 — Consolidate `Modal` / `InfoModal` — ✅ COMPLETED (option (a); final visual check pending)

> **Notes:** All claims verified true before implementing (InfoModal hid `borderColor`/`maxWidth` and hardcoded the "Got it!" button), with the honest caveat that none of the 6 InfoModal call sites actually needed the hidden props — this was API hygiene/future-proofing, not an active problem; performance impact is zero. Landed as option (a): `Modal` gained `footer?: ReactNode`, and `InfoModal` is now a preset extending `Omit<ModalProps, 'footer'>` that forwards all Modal props and passes the button as footer (`additionalText` stays InfoModal-specific). One deliberate rendering decision: `footer` renders **inside** the (possibly scrollable) content container, after children — previously the button was part of Modal's children, so in scrollable modals (SideMenu About) it scrolls with the content; a footer pinned outside the scroll area would have changed rendering. DOM output is unchanged at every call site.

**Impact: Low**
**Effort: Low**

`src/shared/components/Modals/InfoModal/index.tsx` wraps `Modal` but hides its props (`borderColor`, `maxWidth`) and hardcodes the "Got it!" `GradientButton`. Either (a) give `Modal` an optional `footer?: ReactNode` prop and reimplement `InfoModal` as a 10-line preset passing the button as footer while forwarding all `Modal` props, or (b) keep two components but make `InfoModal` accept and forward the full `ModalProps`. Prefer (a).

**Acceptance:** all existing modal usages render identically; `npm run verify` passes.

---

## Spec 18 — Expand test coverage for critical pure logic — ❌ WITHDRAWN

> **Withdrawn (July 2026):** decision reversed — the project keeps **no permanent tests**. Tests are written only as temporary aids during development and deleted once development is finished (this was already the working convention for Specs 4–14). The two pre-existing permanent suites (`src/codex/utils/cardHelper.test.ts`, `cardsResponseMapper.test.ts`) were removed; `npm test` now runs with `--passWithNoTests` so `npm run verify` stays green with zero test files. Jest + React Testing Library remain configured for temporary development tests. The original spec text is kept below as a decision record only — do not implement it.

**Impact: Low-medium standalone, but multiplies the safety of every other spec — consider doing the relevant tests *within* each spec above.**
**Effort: Medium (spread out)**

Only 2 test files exist for ~222 source files. Priority order for new tests (pure logic, no DOM needed):

1. `src/shared/utils/storage.ts` — save/get/staleness/error paths (mock localStorage).
2. `src/shared/utils/{lists,object,textHelper}.ts` — trivial to test, used everywhere.
3. `src/scoring/utils/advancedScoring.ts` — real game logic with zero tests; verify score calculations and the `outscaledAt` search against hand-computed values.
4. `src/speedruns/utils/{time,gameVersion}.ts` — date handling is a classic silent-bug zone; pin timezone in tests (`TZ=UTC` in jest config or use fixed timestamps).
5. New shared modules from Specs 3, 4, 5 (estimator, cache factory, geometry, filter engine) — covered by those specs.
6. Hooks (via `@testing-library/react` `renderHook`): `useBreakpoint`, `useFromNow` (fake timers), `useSpeedrunData` cache/refresh flow (mock SWR or the fetcher).

Optionally add a modest `coverageThreshold` to `jest.config.ts` once the above land (e.g. 30% lines) to prevent regression — don't set it higher than what's actually achieved.

**Acceptance:** `npm run test:coverage` shows the listed modules covered; `npm run verify` passes.

---

## Spec 19 — Replace the hand-rolled horizontal spacing passes with `d3-flextree`

**Impact: High for maintainability** — deletes ~450 lines of the most intricate logic in the codebase and eliminates the "may not converge" failure mode entirely.
**Effort: Medium — the code change is small; the work is visual QA across many events.**
**Follow-up to Spec 4; pairs naturally with Spec 6** (layout becomes a pure function call, which is exactly the seam Spec 6 opens).

### Problem

The spacing engine in `src/codex/utils/eventTreeSpacing/` (decomposed in Spec 4) is a greedy top-down layout followed by repair passes: `centerChildrenUnderParents` places children optimistically, `resolveOverlaps` patches the collisions that causes, `tightenGaps` removes the excess air that `resolveOverlaps`'s recentering causes, and `centerMultiParentChildren` runs twice because tightening breaks its invariant. Each pass exists to undo damage from the previous one — which is why the passes iterate, need sweep caps (`MAX_*_SWEEPS = 10`), and can fail to converge (the `console.error` warnings).

This is the problem the Reingold–Tilford family of algorithms solves properly: lay out **bottom-up**, packing each subtree against its sibling's contour, then center parents over their finished children. One deterministic sweep; overlaps are impossible by construction; there is no air to tighten and no convergence concept. d3's built-in `tree()` doesn't do this only because it assumes uniform node size — the exact gap the spacing engine fills by hand.

### Change

1. Add [`d3-flextree`](https://github.com/Klortho/d3-flextree) (d3-hierarchy-compatible; `nodeSize` is a function per node). In `EventTree`, replace the `tree()` layout + `adjustHorizontalNodeSpacing` call with `flextree({ nodeSize: (d) => [width(d) + minGap, VERTICAL_SPACING_DEFAULT] })` (~30-line adapter; verify whether flextree's `x` is the node center or left edge and adjust).
2. Delete from `eventTreeSpacing/`: `passes/centerChildrenUnderParents.ts`, `passes/resolveOverlaps.ts`, `passes/tightenGaps.ts`, the sweep-cap constants and `logging.ts`, and the now-unused `grouping.ts` helpers (`buildParentGroups`, `getAllChildrenForParentGroup`). Net: roughly 450 lines removed.
3. **Keep**: `passes/centerMultiParentChildren.ts` (run once, after flextree) plus the `geometry.ts`/`grouping.ts` code it uses — refChildren make the data a DAG, and no tree algorithm handles multi-parent constraints; this is the essential complexity. Also keep `adjustVerticalNodeSpacing` and `centerRootNodeHorizontally` unchanged (flextree only owns horizontal placement; use a constant vertical `nodeSize` so rows stay depth-aligned).
4. Update the folder README to describe the new two-step pipeline (flextree → multi-parent centering).

### Benefits

- ~450 lines of incidental complexity replaced by a library whose whole job is variable-width tidy layout; what remains (multi-parent centering) is the genuinely irreducible part.
- The convergence caps and their production `console.error` warnings disappear — layout becomes deterministic with guaranteed-no-overlap output.
- Contour packing generally produces tighter, better-balanced trees than greedy-plus-repair.
- Layout becomes a pure function call, simplifying Spec 6's layout/render split.

### Caveats (assessed July 2026)

- **Output will be similar, not pixel-identical** — every tree shifts a little, so this needs visual QA across a broad sample of events (refChildren-heavy, looping paths, compact + detailed modes), not a before/after diff of two screenshots.
- **Behavioral nuance to watch**: today, parents sharing a refChild get pulled toward it as a group (`resolveOverlaps`'s recentering step); with flextree only the child moves toward its parents (`centerMultiParentChildren`). Usually visually equivalent, but check refChildren-heavy events specifically.
- **`d3-flextree` is stable but dormant** (pure algorithm, no DOM dependency; unmaintained for years). Acceptable for pure math, but noted.
- Optional cheap experiment before committing to this spec: delete the *first* `centerMultiParentChildren` run and keep only the final one — if refChildren-heavy events look unchanged, one pass invocation goes away for free regardless of whether flextree lands.

### Acceptance criteria

- Event Maps render without overlaps and visually as-good-or-better across a broad spot-check (including refChildren/looping events, all levels of detail and zoom).
- `passes/centerChildrenUnderParents.ts`, `passes/resolveOverlaps.ts`, `passes/tightenGaps.ts`, and the sweep-cap machinery are gone.
- `npm run verify` passes.

---

## Spec 20 — React 19 + Next 16 + ESLint flat-config migration (deferred — do not start until needed)

**Impact: Low today** — nothing in the codebase requires React 19 or Next 16 features.
**Effort: High — a coordinated migration, not an incremental update.**
**Formerly Spec 8 Tier C.**

Deliberately deferred: do not start this until the project actually needs functionality from newer React or Next versions (or a hard external forcing function appears, e.g. a security fix only shipped for Next 16, or a required dependency dropping React 18 support). Until then, staying on React 18 + Next 15 has no cost.

When it is picked up, migrate as one coordinated unit:

- **React 19 + Next 16** — follow both official codemods/upgrade guides; expect `@types/react`/`@types/react-dom` 19 fallout across components.
- **ESLint 9/10 flat config** — `eslint-config-next@16` pairs with Next 16 and requires flat config; migrate `.eslintrc.js` → `eslint.config.js`, and re-check `@typescript-eslint`, `eslint-plugin-react-hooks`, and the prettier/import plugins for flat-config-compatible versions.
- **`next-pwa` 5.6 → `@serwist/next`** — `next-pwa` is effectively unmaintained (bundles workbox 6, babel-loader 8) and is the likeliest hard blocker under Next 16. Replace with `@serwist/next` (the maintained successor) and port the runtime-caching config from `next.config.ts` (Blightbane image CacheFirst strategy, 10-day expiry).

**Acceptance (when eventually done):** all five tools render and behave identically; PWA install + offline caching still work; `npm run verify` and `npm run build` pass; `npm outdated` is clean.

---

## Explicitly considered and rejected

- **Spec 3 step 5 — shared SVG render skeleton for TalentTree/EventTree** — assessed after steps 1–4 completed (July 2026). The genuinely identical code is only ~25–35 lines (SVG clear, zoomed-vs-viewBox sizing, zoom transform group), and even that differs in details (`preserveAspectRatio` values). Everything that makes the two effects look similar is different in substance: layout (d3 `separation()` by node height vs. flat separation + multi-pass spacing engine), zoom (stateless depth multiplier vs. stateful container-measuring calculator), and render passes (links/nodes/indicators/expansion-buttons vs. three link types/glow rects/content/six badge passes/cleanup/scroll-centering). A shared orchestrator would be a callback framework with exactly two divergent clients — more surface area than the duplication it removes. It would also cut across the layout/render seam Spec 6 needs to open. Two micro-extractions remain worth checking after Spec 6 (see the follow-up note there).
- **`.env.local` secret exposure** — investigated; `.env.local` is gitignored (`.gitignore:16`) and has never been committed (`git log --all -- .env.local` is empty). The Supabase anon key is also public-by-design (`NEXT_PUBLIC_*`). No action needed.
- **useSpeedrunData race condition** — the hook already guards against stale responses via `prevCacheKeyRef` checks in `onSuccess`. The pattern is unusual but correct; Spec 7 adds the missing `onError` handling instead.
- **Full data-driven scoring CMS / generic rendering framework** — the scoring feature is content-heavy by nature; a full rewrite has poor cost/benefit. Spec 14 targets only mechanical duplication.
- **React 19 / Next 16 migration** — deferred until functionality from newer React/Next is actually needed (see Spec 20).

## Suggested implementation order for a Sonnet agent

Quick wins first to build confidence, then the big refactors:

1. ~~Spec 9 (trivial)~~ (done), ~~Spec 11 (trivial)~~ (done), ~~Spec 12~~ (done), ~~Spec 13~~ (done) — small, isolated, verifiable.
2. ~~Spec 8 Tier A, then Tier B~~ (done) — toolchain is current.
3. Spec 1 → Spec 2 (registry, then PageHead).
4. ~~Spec 7 (error handling)~~ (done) and ~~Spec 10 (buttons)~~ (done).
5. ~~Spec 5 (filter engine)~~ (done), ~~Spec 6 (layout/render split)~~ (done).
6. ~~Spec 3 (tree unification, step by step)~~ (done) → ~~Spec 4 (spacing decomposition)~~ (done) → Spec 19 (flextree swap; ideally alongside Spec 6).
7. ~~Spec 14~~ (done), ~~Spec 16~~ (done), ~~Spec 17~~ (done).
8. ~~Spec 15 (docs/AI workflow)~~ (done) and ~~Spec 18~~ (withdrawn — no permanent tests).

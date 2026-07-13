# Dawn-Dash — Improvement Specs

Specs for changes and improvements to the codebase, ordered by impact (highest first).
Each spec is self-contained and implementation-ready. Unless stated otherwise, specs are independent — but **Spec 1 should land before Specs 2 and 3**, since they build on the registry it introduces.

**For the implementer (rules that apply to every spec):**

- Run `npm run verify` (format check, lint, type-check, tests) after each spec. It must pass before the spec is considered done.
- Do not change user-visible behavior unless the spec explicitly says so. These are refactors, fixes, and upgrades — the site should look and behave identically except where noted.
- Follow existing conventions: SCSS modules (`index.module.scss`), `createCx()` from `@/shared/utils/classnames`, path aliases (`@/shared/*`, `@/codex/*`, `@/speedruns/*`), Prettier (single quotes, no semicolons, 100 char width).
- Line numbers below are approximate — re-locate code by the identifiers given if lines have drifted.
- Add or update unit tests for any pure logic you touch (Jest 30 + React Testing Library are configured).

---

## Spec 1 — Central tool/page registry (extensibility)

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

## Spec 2 — Shared `PageHead` component (kills ~40 duplicated lines per page)

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

## Spec 3 — Unify duplicated talent-tree / event-tree infrastructure

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

1. **Text width estimation** — create `src/codex/utils/tree/textWidthEstimation.ts` exposing one estimator parameterized by font config (`{ fontSize, fontFamily, approxPixelsPerChar, variants? }`). Port the superset of behavior (event's font variants). Delete both old files; update imports. This is the smallest, safest step — do it first.
2. **Dimension cache** — create `src/codex/utils/tree/nodeDimensionCache.ts`: a factory `createDimensionCache<K>(makeKey: (k: K) => string)` returning `{ get, set, clear }`. Instantiate once per feature. Delete both old cache files.
3. **Dimensions** — create `src/codex/utils/tree/nodeDimensions.ts` with a factory that takes feature-specific `measureHeight/measureWidth` callbacks and wires in the cache from step 2. The feature files shrink to just their business logic (talent: requirements/card sets; event: effects/choices).
4. **Tree helpers** — move `buildNodeMap`, `calculateTreeBounds`, `findNodeById` into `src/codex/utils/tree/treeHelper.ts` (generic over node type). Keep feature-specific helpers where they are.
5. **(Optional, only if steps 1–4 went cleanly)** Extract the shared SVG render skeleton from `TalentTree/index.tsx` and `EventTree/index.tsx` (container setup, zoom transform, render-pass orchestration) into a shared module, leaving node/link/badge drawing feature-specific.

### Acceptance criteria

- Skilldex and Event Maps render pixel-identically (manually compare a couple of trees before/after, including expanded/collapsed nodes and zoom levels).
- Existing tests in `src/codex/utils/` still pass; add unit tests for the new shared estimator and cache factory.
- Net LOC in `src/codex/utils` decreases substantially (target: ≥600 lines removed by steps 1–4).
- `npm run verify` passes.

---

## Spec 4 — Decompose `eventTreeSpacing.ts` (1,221-line layout monolith)

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

---

## Spec 5 — Shared filter engine for the search-filter hooks

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

## Spec 6 — Separate tree layout from rendering; memoize expensive renders

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

---

## Spec 7 — Standardize data-layer error handling and cache write feedback

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

## Spec 8 — Dependency updates (tiered)

**Impact: Medium-high** — several packages are years behind; a few combinations are genuinely inconsistent today.
**Effort: Tier A low, Tier B medium, Tier C is a decision for later**

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

### Tier C — flag, but treat as separate decisions (do NOT do as part of this spec)

- **React 19 + Next 16 + eslint 9/10 flat config** — a coordinated migration; worth planning but out of scope here.
- **`next-pwa` 5.6** — effectively unmaintained (bundles workbox 6, babel-loader 8). When moving to Next 16, replace with `@serwist/next` (the maintained successor) and port the runtime-caching config from `next.config.ts`. Until then, leave it.

### Acceptance criteria

- `npm run verify` and `npm run build` pass after each tier.
- `npm outdated` shows no remaining Tier A/B entries.
- Manual smoke test: charts render with time axes, PWA still builds, tests pass.

---

## Spec 9 — Fix speedruns cache-duration mismatch and document intent

**Impact: Medium** — verified real inconsistency between docs and code.
**Effort: Trivial**

`src/speedruns/utils/speedrunsStore.ts:7` sets `CACHE_DURATION = 10 * 60 * 1000` (10 minutes), while `CLAUDE.md` documents a "24-hour cache for speedruns". The codex stores use 24h (`src/codex/utils/codexCardsStore.ts:8`, `codexTalentsStore.ts:8`).

Decide the intended value (10 minutes is plausible for frequently-updated leaderboard data — if so, keep it), then fix the documentation in `CLAUDE.md` (see Spec 15) and add a comment in `speedrunsStore.ts` explaining why speedruns use a shorter TTL than codex data. Also extract the shared cache-key strings listed in CLAUDE.md into constants next to their stores if they aren't already.

**Acceptance:** code and docs agree; `npm run verify` passes.

---

## Spec 10 — Consolidate button components

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

## Spec 11 — Fix unstable React list keys

**Impact: Medium** — latent reconciliation bugs when lists reorder/filter.
**Effort: Trivial**

Verified occurrences of index-based keys:

- `src/codex/components/ResultsPanels/EventResultsPanel/EventList/index.tsx`: line 92 `key={index}` on the event-type group div (use the group's type/name), and line 97 `key={`${event.name}-${index}`}` → use `event.name` (or an id if present) alone.
- `src/speedruns/components/Sliders/Slider/index.tsx:96`: `key={index}`
- `src/scoring/components/ParameterInfoList/index.tsx:37`, `src/scoring/components/ScoringTable/index.tsx:41`, `src/scoring/components/ScoringList/index.tsx:18`, `src/scoring/components/BolgarsBlueprintsPanel/AdvancedInsight.tsx:144,180`: `key={index}` variants.

For each: use a stable identifier from the data (name, label, mode). For truly static hardcoded content lists (some scoring lists), index keys are technically harmless — still switch to content-derived keys (`key={item}` or `key={label}`) for consistency, unless items can duplicate.

**Acceptance:** no `key={index}`-style keys remain in `src/` (grep `key={index}` and ``key={`${``…``-${index}`` patterns); UI unchanged; `npm run verify` passes.

---

## Spec 12 — Environment-guarded logger; remove stray console output

**Impact: Medium**
**Effort: Low**

### Problem

Production console noise and inconsistent logging:

- `src/codex/utils/eventTreeSpacing.ts` (~line 648): `console.error` on max-iterations with no env guard.
- `console.warn` in `src/codex/utils/{codexCardsStore,codexTalentsStore}.ts:14`, `talentsResponseMapper.ts:~82`, `src/shared/utils/storage.ts`.
- `src/codex/utils/eventNodeDimensionCache.ts` (~lines 58–62) already env-guards — inconsistent with the rest.
- `src/shared/components/ErrorBoundary/index.tsx` (~line 36) only does `console.error`; errors are invisible in production. Vercel Analytics is already installed.

### Change

1. Create `src/shared/utils/logger.ts` with `logger.debug/warn/error`; `debug`/`warn` no-op outside development, `error` always logs.
2. Replace all direct `console.*` calls in `src/` with the logger (the ESLint `no-console` warning already nudges this).
3. In `ErrorBoundary.componentDidCatch`, additionally report via Vercel Analytics' `track()` (from `@vercel/analytics`) with the error name/message, wrapped in try/catch so reporting can never crash the boundary.

**Acceptance:** `grep -rn "console\." src/` returns only `logger.ts`; error boundary still renders its fallback; `npm run verify` passes.

---

## Spec 13 — Small verified hook fixes (bundle)

**Impact: Medium** — real correctness/perf issues, each tiny.
**Effort: Low**

1. **`src/shared/hooks/useFromNow.ts`**: interval fires every 1000ms forever, re-rendering consumers each second even when the label is "3 days ago". Make the interval adaptive (every second under a minute old, every minute under an hour, hourly beyond) and only `setState` when the formatted string actually changed (`setFromNow(prev => prev === next ? prev : next)`).
2. **`src/shared/hooks/useDeviceOrientation.ts`**: `isMobile` is computed synchronously at render (`checkIsMobile()`) while `isLandscape` lives in state — this risks SSR hydration mismatch. Move both into state initialized `false` and set them in the mount effect (alongside the existing orientation listeners).
3. **`src/shared/hooks/useScrollToTop.ts`**: three separate `typeof window === 'undefined'` guards; keep one guard in the effect (the callbacks can't run server-side once listeners are only attached in the effect) and simplify.
4. **`src/shared/hooks/useBreakpoint.ts` + `src/styles/_breakpoints.scss`**: both hardcode 48rem/64rem. Add a comment in each file cross-referencing the other as the drift guard (a full SCSS-from-TS export is over-engineering for two values), or export the values from a small `breakpoints.ts` consumed by the hook.

**Acceptance:** hydration warnings absent in dev console on mobile emulation; relative-time labels still update; `npm run verify` passes.

---

## Spec 14 — Scoring feature: extract constants and reduce hardcoded repetition

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

## Spec 15 — Documentation accuracy (`CLAUDE.md`) + AI-workflow improvements

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

## Spec 16 — Split `icons.tsx` for tree-shaking

**Impact: Low-medium**
**Effort: Low**

`src/shared/utils/icons.tsx` (~399 lines) holds ~18 inline-SVG icon components in one module imported across the app. Move to `src/shared/components/Icons/` with one file per icon and a barrel `index.ts` re-exporting them (named exports enable tree-shaking; verify with `next build` bundle output that page chunks shrink or stay equal). Update imports codebase-wide (mechanical find/replace). Keep `imageUrls.tsx` where it is.

**Acceptance:** all icons render as before; no imports from `@/shared/utils/icons` remain; `npm run verify` + `npm run build` pass.

---

## Spec 17 — Consolidate `Modal` / `InfoModal`

**Impact: Low**
**Effort: Low**

`src/shared/components/Modals/InfoModal/index.tsx` wraps `Modal` but hides its props (`borderColor`, `maxWidth`) and hardcodes the "Got it!" `GradientButton`. Either (a) give `Modal` an optional `footer?: ReactNode` prop and reimplement `InfoModal` as a 10-line preset passing the button as footer while forwarding all `Modal` props, or (b) keep two components but make `InfoModal` accept and forward the full `ModalProps`. Prefer (a).

**Acceptance:** all existing modal usages render identically; `npm run verify` passes.

---

## Spec 18 — Expand test coverage for critical pure logic

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

## Explicitly considered and rejected

- **`.env.local` secret exposure** — investigated; `.env.local` is gitignored (`.gitignore:16`) and has never been committed (`git log --all -- .env.local` is empty). The Supabase anon key is also public-by-design (`NEXT_PUBLIC_*`). No action needed.
- **useSpeedrunData race condition** — the hook already guards against stale responses via `prevCacheKeyRef` checks in `onSuccess`. The pattern is unusual but correct; Spec 7 adds the missing `onError` handling instead.
- **Full data-driven scoring CMS / generic rendering framework** — the scoring feature is content-heavy by nature; a full rewrite has poor cost/benefit. Spec 14 targets only mechanical duplication.
- **React 19 / Next 16 migration** — deferred to a dedicated future spec (see Spec 8 Tier C).

## Suggested implementation order for a Sonnet agent

Quick wins first to build confidence, then the big refactors:

1. Spec 9 (trivial), Spec 11 (trivial), Spec 12, Spec 13 — small, isolated, verifiable.
2. Spec 8 Tier A, then Tier B — get the toolchain current before large refactors.
3. Spec 1 → Spec 2 (registry, then PageHead).
4. Spec 7 (error handling) and Spec 10 (buttons).
5. Spec 5 (filter engine), Spec 6 (layout/render split).
6. Spec 3 (tree unification, step by step) → Spec 4 (spacing decomposition).
7. Spec 14, 16, 17.
8. Spec 15 (docs/AI workflow — do Part A early if preferred; it's independent) and Spec 18 (ongoing).

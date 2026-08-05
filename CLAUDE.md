# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Style

- **Progress cadence**: before the first tool call, say in one sentence what you are about to do. While working, post an update only when you find something important or change direction — not per file or per step.
- **Suggestions**: if the request looks mistaken or a better approach exists, say so in a single sentence prefixed with `💡 [SUGGESTION]`, then continue with the task as asked.
- **Written deliverables**: match a document's length to its substance. No filler sections, redundant summaries, or boilerplate — this file and the per-feature `CLAUDE.md` files included.
- **Long tasks**: for multi-session or long-running work, keep a short running state file in the session scratchpad (not in the repo — the working tree stays clean) and re-read it after a context refresh, along with `git log`/`git status`, before acting.
- **Long documents**: when analyzing or summarizing a large document (roughly >20k tokens — e.g. `src/codex/specs-*.md`, `event-trees.json`), quote the relevant lines before drawing conclusions from them rather than working from recall.
- **The dev server is the user's to run**: never start `npm run dev` yourself, in the foreground or the background. The user typically already has one running, so a second either dies on the busy port or outlives the session as an orphan holding port 3000. When a change needs looking at, say it's ready and name the pages and states to check, then wait. `npm run verify`, `npm run build`, and `npm run check-sw` are yours to run as usual.

## Writing a spec

Specs live next to the feature they describe, as `src/<feature>/specs-<topic>.md`. Before writing one,
read the root `CLAUDE.md`, the feature's own `CLAUDE.md`, and any `README.md` under the directories the
work will touch — the invariants recorded there are usually the reason a task is harder than it looks,
and a spec that contradicts one is worth catching before any code is written, not after.

Every spec gets a **"How to work through this spec"** section, placed before the task list, covering:

- **What to read first.** Name the root `CLAUDE.md`, the feature's own `CLAUDE.md`, and any `README.md`
  covering the directories the tasks touch — with the specific invariants that constrain this work, so
  they're visible without opening every file. Implementation often starts in a fresh context that has
  none of the discussion behind the spec, so the spec has to point at its own background rather than
  assume it.
- **Where to stop.** State whether tasks may be chained or must pause for confirmation, and say *why*
  for this particular spec — e.g. several tasks restructuring the same DOM and stylesheet, where a
  mistake in an early task gets buried under later ones. If tasks pause: finish the task, get it into
  a state the user can look at, say what changed and what specifically to look at, and wait — **the
  user spins up the dev server, not the agent** (see Working Style). Call out any task with no visible
  effect of its own so it isn't mistaken for a broken step. **Mark the finished task `COMPLETED` in the
  spec before asking the user to verify it** — the spec is the shared record of progress, so a fresh
  context picking the work up later can tell what is already done from the spec alone.
- **How it gets verified.** Visually in the user's dev server, via `npm run verify`, `npm run build`, or
  `npm run check-sw` — name the actual check. For visual verification, name the states to compare
  (expanded/collapsed, zoom levels, mobile/desktop), since "looks fine" on one state routinely misses
  the others.
- **Which docs change with the work.** List the specific files and sections the tasks will
  invalidate, with the reason each is affected — grep for whatever the spec touches rather than
  guessing. Note any new invariant worth recording once implemented, and say that a change
  contradicting a documented invariant gets raised with the user rather than quietly rewritten.
- **Comment style.** The non-obvious *why*, in a line or two. No restating the code, no narrating the
  history of a change.

Also state up front any **decisions already made** so they aren't re-litigated mid-implementation, and
mark anything deliberately left to trial and error in the browser as exactly that. Order tasks
operationally — the sequence they should be built in, not a topical grouping.

## Development Commands

### Core Development
- `npm run dev` - Start the Next.js development server
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint on src directory
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting without writing changes
- `npm run type-check` - Run TypeScript type checking
- `npm run verify` - Run format:check, lint, type-check, and test together
- `npm run icon-viewbox -- <IconName>` - Inspect an icon's viewBox fill and print candidate viewBoxes for making it look bigger/smaller (see `Icons/` under Shared Infrastructure)
- `npm run check-sw` - Fail if the built service worker precaches a URL that will 404. **Run after `npm run build` whenever `next.config.ts` or the PWA setup changes** — Workbox precaching is atomic, so one bad entry silently disables the entire worker including all runtime caching

**`npm run verify` is the required check before any change (AI-generated changes included) is considered done.** For changes touching `pages/`, `next.config.ts`, or data hooks, also run `npm run build`.

### Testing
- `npm test` - Run Jest tests (uses `--passWithNoTests`; zero test files is the expected steady state)
- `npm run test:watch` - Run Jest in watch mode
- `npm run test:coverage` - Run tests with coverage report
- **Test framework**: Jest 30 with React Testing Library 16 (kept configured for temporary development tests)
- **Testing policy: no permanent tests.** Tests are written only as temporary aids *during* development to verify a change, then **deleted before the work is considered done**. Do not add permanent test files unless the user explicitly requests them. Visual/rendering code (e.g. the codex trees) is verified by manual before/after comparison in the user's dev server instead.

## Project Architecture

This is a Next.js application (dawn-dash.com) for Dawncaster game data visualization with **five tools**: Speedruns, Cardex, Skilldex, Eventmaps, and Scoring.

### Core Structure
- **Next.js 15** (pages router) with React 18, TypeScript, and SCSS modules
- **`/pages`**: thin page components — one per tool, plus `pages/eventmaps/[event].tsx` for per-event pages
- **`/src`**: application logic organized by feature: `landing/`, `speedruns/`, `codex/` (Cardex + Skilldex + Eventmaps), `scoring/`, `shared/`
- **Supabase backend**: database and edge functions for cards/talents data synchronization

### Tool Registry
`src/shared/config/toolRegistry.ts` is the single source of truth for each tool's identity: path, title, descriptions, meta/OG copy, images, nav icon, and legacy redirect paths. It is consumed by the landing page, the header side menu, `useNavigation`, `PageHead`, and `next.config.ts` (generated redirects). Adding a new tool requires only a registry entry + a `pages/` file (see the `add-new-tool` skill in `.claude/skills/`), plus a URL entry in `scripts/generate-sitemap.js`.

### Main Features

Each feature directory has its own `CLAUDE.md` with architecture details and invariants — read it before changing that feature.

1. **Speedruns** (`/speedruns`, `src/speedruns/`) — interactive Chart.js charts of speedrun data from the external Blightbane API, with class/difficulty/time controls
2. **Cardex** (`/cardex`, `src/codex/`) — multi-keyword card search and advanced filtering, plus card tracking for weekly challenges; data in Supabase
3. **Skilldex** (`/skilldex`, `src/codex/`) — interactive talent-tree visualizer (D3 hierarchy) with prerequisite tracking and requirement filters; data in Supabase
4. **Eventmaps** (`/eventmaps`, `src/codex/`) — fully mapped event trees (branches, requirements, rewards) rendered from static `src/codex/data/event-trees.json`
5. **Scoring** (`/scoring`, `src/scoring/`) — prose-heavy scoring guides per game mode plus real score-calculation logic (`advancedScoring.ts`)

### Shared Infrastructure (`/src/shared/`)
**Components**:
- Layout: Header (with SideMenu), Footer, ErrorBoundary
- `PageHead` — renders each tool page's meta/OG tags from the tool registry
- Buttons: Button, GradientButton, IllustratedButton, ButtonRow — all extend `BaseButtonProps` from `Buttons/types.ts`
- Modals: Modal, InfoModal
- UI elements: LoadingDots, ScrollToTopButton, GradientDivider, GradientLink, ScrollableWithFade, Select, Code, Image
- `Sliders/Thumb` — the draggable energy-orb thumb shared by the speedruns sliders and the codex zoom slider; takes an `orientation` prop because the CSS centering axis differs between horizontal and vertical tracks
- Notifications: Notification (toast-style with auto-dismiss and progress bar)
- `Icons/` — one component per SVG icon, each taking only `className` and `onClick`, so **size and colour are set entirely in CSS**. An icon's apparent size depends on its *fill* (how much of the viewBox is ink rather than margin), which varies a lot between icons — so equal CSS sizes do not look equal. To make an icon look bigger or smaller, crop or widen its `viewBox` rather than fighting it with CSS: run `npm run icon-viewbox -- <IconName>` for its current fill and a table of candidate viewBoxes. These components are shared (result cards *and* search-panel filters), so a viewBox change affects every consumer — use a stylesheet's `svg { width/height }` when only one place should change.

**Custom Hooks**:
- `useNavigation()` - registry-driven `navigateTo(toolId, query?)` + `resetToLandingPage()`
- `useBreakpoint()` - responsive breakpoint detection (values cross-referenced with `src/styles/_breakpoints.scss`)
- `useScrollToTop()` - animated scroll-to-top with easing and threshold detection
- `useFromNow()` - relative time formatting with adaptive update interval
- `useDeviceOrientation()` - portrait/landscape + mobile detection (state set on mount to avoid hydration mismatch)
- `useDraggable()` - drag-to-scroll behavior
- `useCardImageSrc(cardName, fallbackImageSrc?)` - resolves a card/talent name to its Blightbane artwork URL via a module-scope `Map` built from `src/shared/data/card-artwork.json`. The optional fallback is what unresolved names return; it defaults to `PestilenceDecreeUrl` for scoring, and Cardex passes `null` to get a placeholder square instead. Both the hook and the plain `getCardImageSrc(name, fallback?, category?)` it delegates to take an optional `category`, which disambiguates names whose artwork differs per category (Skilldex passes the exported `TALENT_ARTWORK_CATEGORY`); the lookup falls back to name-only. The plain function exists for callers outside React's render — Skilldex draws its nodes with D3. Both lookups use module-scope `Map`s built once at import; never build another copy

**Utilities**:
- `classnames.ts` - `createCx()` wrapper for SCSS modules
- `classColors.ts` - character class color mappings
- `storage.ts` - localStorage wrapper with cache duration and staleness detection; `saveToCache` returns `{ success, error? }`
- `apiErrorHandling.ts` - `handleError` normalizes any unknown error (Axios, Error, other) into a structured `ApiErrorInfo`
- `logger.ts` - `logger.debug/warn` no-op outside development, `logger.error` always logs. **Never call `console.*` directly** (ESLint `no-console` enforces this)
- `imageUrls.ts` - centralized Blightbane asset URLs
- `energyImages.ts` - `getEnergyImageUrl(CharacterClass)` → energy orb asset. Speedruns wraps this in its own `utils/images.ts` to also handle the speedruns-only `SpeedRunSubclass` members (`All`, `Hybrid`); `shared/` must not import speedruns types
- `lists.ts`, `object.ts`, `textHelper.ts` - small pure helpers

**Global Styles**: SCSS design system in `/src/styles/` with colors, gradients, animations, typography

### Path Aliases
- `@/*` maps to `src/*` (so `@/scoring/*`, `@/landing/*`, `@/styles/*` work via the catch-all)
- Explicit aliases: `@/shared/*`, `@/codex/*`, `@/speedruns/*`
- `next.config.ts` cannot use `@/` aliases — it imports via relative paths

### Data Layer
- **SWR** for client-side data fetching with `onSuccess`/`onError` handling; fetch failures surface visible error states in the panels
- **Service contracts**: all API fetchers **throw** on failure — never return `[]` or partial data silently
- **Custom hooks** (`useCardData`, `useTalentData`, `useSpeedrunData`) abstract data fetching with progress callbacks
- **localStorage caching** with staleness detection: 10-minute TTL for speedrun leaderboard data (intentionally short — new runs arrive continuously), 24-hour TTL for codex card/talent data
- **Stores are plain localStorage wrapper modules** (not subscription/Zustand stores): versioned cache keys are co-located with each store — `src/speedruns/utils/speedrunsStore.ts`, `src/codex/utils/codexCardsStore.ts`, `codexTalentsStore.ts`, `codexFilterStore.ts`

### Data Synchronization (two ownership paths)
- **Supabase Edge Functions** (`supabase/functions/`, Deno) own the **cards and talents** data: `sync-cards` and `sync-talents` pull from the Blightbane API into the Supabase `Cards`/`Talents` tables; `talents-name` is a public read-only endpoint. Deploy with `npx supabase functions deploy <name>`. The root `deno.json` exists **solely** for these edge functions.
- **Local Node scripts** (`scripts/`) own the **events and artwork** data: `sync-events.js` runs the event pipeline (fetch from Blightbane → extract → parse into `src/codex/data/event-trees.json`); `fetch-card-artwork-mapping.js` writes `src/shared/data/card-artwork.json`; `generate-sitemap.js` builds `public/sitemap.xml` from the event data (tool URLs are hardcoded in it)
- **Speedrun data** is not synced — it is fetched live from the Blightbane API at runtime

### PWA & Performance
- **Progressive Web App** with `next-pwa` (applied as `withPWA(options)(nextConfig)` in `next.config.ts`). **`next-pwa` 5.6.0 is the latest release and dates from 2022**, well before Next 15 — its peer range (`next >=9.0.0`) means nothing warns about the mismatch. It precached a Next 15 build file that 404s (`dynamic-css-manifest.json`), and because Workbox precaching is atomic that silently disabled the whole service worker, `runtimeCaching` included. Hence the `buildExcludes` entry — don't remove it. A broken worker looks identical to a working one outside DevTools, so **verify service-worker changes against `npm run build && npm start`** and check the caches actually fill. Replacement options are scoped in `src/codex/specs-next-pwa-replacement.md`.
- **Service worker** with CacheFirst strategy for Blightbane images (10-day cache expiry), split across **two** `runtimeCaching` buckets: `card-artwork` for `/images/icons/**` (1500 entries, ~3.2MB — sized for Cardex result sets, which easily exceed 100 images) and `external-images` for everything else (100 entries: classes, energy orbs, events). The specific pattern must stay **first**, since Workbox uses the first match. Keeping them separate is what stops a large Cardex session from evicting the rest of the site's images.
- **Offline support** via localStorage + service worker caching
- **Dynamic imports** with `next/dynamic` for code splitting (each tool page lazy-loads its feature component)
- **Image optimization** via `next/image` with remote patterns for Blightbane assets

### Styling Conventions
- **SCSS Modules** with consistent naming (`index.module.scss`)
- **Custom classnames utility** (`createCx`) for conditional classes
- **Responsive design** with custom breakpoint hooks
- **Design system** in `/src/styles/` with colors, gradients, typography, animations, and textures

## Code Style & Linting

The project uses strict TypeScript with comprehensive ESLint rules:
- React/JSX best practices enforced
- Import organization with path groups (react, @/shared, etc.)
- No `console.*` outside `src/shared/utils/logger.ts`
- Prettier formatting: single quotes, no semicolons, 100 char width

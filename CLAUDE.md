# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

**`npm run verify` is the required check before any change (AI-generated changes included) is considered done.** For changes touching `pages/`, `next.config.ts`, or data hooks, also run `npm run build`.

### Testing
- `npm test` - Run Jest tests (uses `--passWithNoTests`; zero test files is the expected steady state)
- `npm run test:watch` - Run Jest in watch mode
- `npm run test:coverage` - Run tests with coverage report
- **Test framework**: Jest 30 with React Testing Library 16 (kept configured for temporary development tests)
- **Testing policy: no permanent tests.** Tests are written only as temporary aids *during* development to verify a change, then **deleted before the work is considered done**. Do not add permanent test files unless the user explicitly requests them. Visual/rendering code (e.g. the codex trees) is verified by manual before/after comparison in the dev server instead.

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
- Notifications: Notification (toast-style with auto-dismiss and progress bar)

**Custom Hooks**:
- `useNavigation()` - registry-driven `navigateTo(toolId, query?)` + `resetToLandingPage()`
- `useBreakpoint()` - responsive breakpoint detection (values cross-referenced with `src/styles/_breakpoints.scss`)
- `useScrollToTop()` - animated scroll-to-top with easing and threshold detection
- `useFromNow()` - relative time formatting with adaptive update interval
- `useDeviceOrientation()` - portrait/landscape + mobile detection (state set on mount to avoid hydration mismatch)
- `useDraggable()` - drag-to-scroll behavior

**Utilities**:
- `classnames.ts` - `createCx()` wrapper for SCSS modules
- `classColors.ts` - character class color mappings
- `storage.ts` - localStorage wrapper with cache duration and staleness detection; `saveToCache` returns `{ success, error? }`
- `apiErrorHandling.ts` - `handleError` normalizes any unknown error (Axios, Error, other) into a structured `ApiErrorInfo`
- `logger.ts` - `logger.debug/warn` no-op outside development, `logger.error` always logs. **Never call `console.*` directly** (ESLint `no-console` enforces this)
- `icons.tsx` - SVG icon components library
- `imageUrls.ts` - centralized Blightbane asset URLs
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
- **Progressive Web App** with `next-pwa` (applied as `withPWA(options)(nextConfig)` in `next.config.ts`)
- **Service worker** with CacheFirst strategy for Blightbane images (10-day cache expiry)
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

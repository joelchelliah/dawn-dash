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

### Testing
- `npm test` - Run Jest tests
- `npm run test:watch` - Run Jest in watch mode
- `npm run test:coverage` - Run tests with coverage report
- **Test framework**: Jest 30.2.0 with React Testing Library 13.4.0
- **Test files**: 6 test suites in `/src/codex/utils/` (helpers, mappers, tree utilities)

## Project Architecture

This is a Next.js application for Dawncaster game data visualization with three main features:

### Core Structure
- **Next.js 15** with TypeScript and SCSS modules
- **Pages directory routing**: `/pages` contains Next.js page components
- **Source code**: `/src` contains all application logic organized by feature
- **Supabase backend**: Database and serverless functions for data synchronization

### Main Features

1. **Speedruns** (`/src/speedruns/`)
   - Interactive D3.js charts for speedrun data visualization  
   - Character class selection, difficulty filters, and time controls
   - Data fetched from external Blightbane API

2. **Card Codex** (`/src/codex/cards/`)
   - Multi-keyword search and advanced filtering for game cards
   - Card tracking functionality for weekly challenges
   - Data stored in Supabase with periodic sync from Blightbane API

3. **Talent/Skills System** (`/src/codex/skills/`)
   - Interactive skill tree visualization with prerequisite tracking
   - Expandable/collapsible tree nodes with complex requirement inheritance
   - Advanced filtering: class, energy, event, card, and offer requirements
   - Mobile-friendly rendering toggle with notification system
   - Tree structure with 5 requirement node types (Class, Energy, Event, Card, Offer)

### Shared Infrastructure (`/src/shared/`)
**Components**:
- Layout: Header, Footer, ErrorBoundary
- Buttons: Button, GradientButton, ButtonRow
- Modals: Modal, InfoModal
- UI Elements: LoadingDots, ScrollToTopButton, GradientDivider, GradientLink
- Notifications: Notification (toast-style with auto-dismiss and progress bar)

**Custom Hooks**:
- `useNavigation()` - Router functions for feature page navigation
- `useBreakpoint()` - Responsive breakpoint detection (1024px tablet threshold)
- `useScrollToTop()` - Animated scroll-to-top with easing and threshold detection
- `useFromNow()` - Relative time formatting (e.g., "2 days ago")
- `useDeviceOrientation()` - Portrait/landscape detection

**Utilities**:
- `classnames.ts` - `createCx()` wrapper for SCSS modules
- `classColors.ts` - Character class color mappings
- `storage.ts` - localStorage wrapper with type safety, cache duration, and staleness detection
- `apiErrorHandling.ts` - Error handler for API calls
- `icons.tsx` - SVG icon components library
- `imageUrls.tsx` - Centralized Blightbane asset URLs

**Global Styles**: SCSS design system in `/src/styles/` with colors, gradients, animations, typography

### Path Aliases
- `@/*` maps to `src/*`
- `@/shared/*` maps to `src/shared/*`  
- `@/codex/*` maps to `src/codex/*`
- `@/speedruns/*` maps to `src/speedruns/*`

### Data Layer
- **SWR** for client-side data fetching and caching with automatic deduplication
- **Supabase** for cards/talents data with real-time capabilities
- **localStorage caching** with expiry times and staleness detection (24-hour cache for speedruns)
- **Custom hooks** (`useCardData`, `useTalentData`, `useSpeedrunData`) abstract data fetching with progress callbacks
- **Zustand-style stores** for client-side state management (filter state persisted to localStorage)
- **Progress tracking** - Real-time progress callbacks during large data fetches
- **Cache keys**: `speedrun-${class}-${difficulty}`, `codex_cards_v2`, `codex_talents_filters_v2`

### PWA & Performance
- **Progressive Web App** with `next-pwa` package
- **Service worker** with CacheFirst strategy for Blightbane images (10-day cache expiry)
- **Offline support** via localStorage + service worker caching
- **Dynamic imports** with `next/dynamic` for code splitting
- **Image optimization** via `next/image` with remote patterns for Blightbane assets

### Styling Conventions
- **SCSS Modules** with consistent naming (`index.module.scss`)
- **Custom classnames utility** (`createCx`) for conditional classes
- **Responsive design** with custom breakpoint hooks (1024px tablet threshold)
- **Design system** in `/src/styles/` with colors, gradients, typography, animations, and textures
- **Animated star textures** with dual-layer background animations

### API Integration
- External Blightbane API for speedrun and card data
- Supabase Edge Functions for data synchronization
- Custom response mappers to normalize external API data

## Code Style & Linting

The project uses strict TypeScript with comprehensive ESLint rules:
- React/JSX best practices enforced
- Import organization with path groups (react, @/shared, etc.)
- No console.log in production (warnings only)
- Prettier formatting: single quotes, no semicolons, 100 char width
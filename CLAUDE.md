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

### Testing
No specific test commands are configured. Check with the user if tests need to be added.

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
   - Skills and talents browser (in development)

### Shared Infrastructure (`/src/shared/`)
- Reusable UI components (Buttons, Modals, Header, Footer)
- Custom hooks for navigation, breakpoints, and data fetching
- Utility functions for classnames, colors, and API error handling
- Global SCSS variables and mixins in `/src/styles/`

### Path Aliases
- `@/*` maps to `src/*`
- `@/shared/*` maps to `src/shared/*`  
- `@/codex/*` maps to `src/codex/*`
- `@/speedruns/*` maps to `src/speedruns/*`

### Data Layer
- **SWR** for client-side data fetching and caching
- **Supabase** for cards/talents data with real-time capabilities
- **Custom hooks** (`useCardData`, `useTalentData`, `useSpeedrunData`) abstract data fetching
- **Zustand-style stores** for client-side state management

### Styling Conventions
- **SCSS Modules** with consistent naming (`index.module.scss`)
- **Custom classnames utility** (`createCx`) for conditional classes
- **Responsive design** with custom breakpoint hooks
- **Design system** in `/src/styles/` with colors, gradients, typography

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
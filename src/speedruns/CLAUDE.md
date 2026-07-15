# src/speedruns/ — Speedrun charts

Interactive speedrun leaderboard charts for all Dawncaster game modes, classes, and difficulties.

## Key files
- `index.tsx` — the feature entry (dashboard: chart + controls)
- `components/Chart/` — **Chart.js** (not D3) with `chartjs-adapter-date-fns` for time axes
- `hooks/useSpeedrunData.ts` — SWR-based fetching from the Blightbane API with progress callbacks
- `utils/speedrunsStore.ts` — localStorage cache with versioned keys (`speedruns_<version>_<class>-<difficulty>`)
- `components/Buttons/ClassColorButton/` — class-colored button with `variant: 'primary' | 'secondary'`; class-color theming comes from `@/shared/utils/classColors`

## Invariants
- The cache TTL is **10 minutes on purpose** (leaderboards receive new runs continuously, unlike codex data) — don't "align" it with the codex 24h TTL.
- `useSpeedrunData` guards against stale responses via `prevCacheKeyRef` checks in `onSuccess` — the pattern is unusual but correct; don't simplify it away.
- Data is fetched live from Blightbane at runtime; there is no sync/backend step for speedruns.

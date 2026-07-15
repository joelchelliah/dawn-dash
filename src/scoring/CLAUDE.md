# src/scoring/ — Scoring guides

Prose-heavy scoring guide panels per game mode (Standard, Sunforge, Weekly Challenges) plus real score-calculation logic.

## Key files
- `components/` — ~20 panel/building-block components; the big panels (`BlightbaneScorePanel`, `ParameterRankTable`, `InGameScorePanel`, `ExamplesPanel`) render typed data arrays through small shared components (`ExampleBox`, `ScoringTable`, `ScoringList`, `ParameterInfoList`)
- `utils/advancedScoring.ts` — the actual game score math (incl. the `outscaledAt` search)
- `constants/scoring.ts` — repeated game numbers (`MAX_MALIGNANCY_PERCENT = 220`, rarity/duplicate multipliers, accuracy penalty rate). **Never re-hardcode these** in logic or prose; interpolate the constant.
- `services/weeklyChallengeDataApi.ts` — weekly challenge fetcher (throws on failure, like all fetchers)

## Invariants
- The guide content is deliberately hand-written prose stored verbatim in data arrays — when refactoring structure, move content, don't rewrite it. A full data-driven/CMS rewrite was explicitly rejected.
- Scoring pages are static content: verify changes with a before/after render comparison of each touched panel.

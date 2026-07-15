---
name: verify-changes
description: Verify a code change in dawn-dash before considering it done — run npm run verify, build when pages/config/data hooks changed, and visually diff affected pages when styling or tree-layout code changed. Use after completing any non-trivial code change to this repo.
---

# Verify changes

Run these checks, in order, after completing a change. All applicable checks must pass before the change is considered done.

## 1. Always: `npm run verify`

Runs format check, lint, type-check, and tests. Fix any failure and re-run until clean.

## 2. If the change touches `pages/`, `next.config.ts`, or data hooks: `npm run build`

Data hooks means `useCardData`, `useTalentData`, `useSpeedrunData`, `useWeeklyChallengeData`, or SWR configuration. The build catches Next.js-specific issues (SSR/prerender errors, PWA config, redirects) that `verify` cannot.

## 3. If styling or tree-layout code changed: visual diff via the dev server

Applies to changes in `src/styles/`, any `*.module.scss`, `src/codex/utils/tree/`, `src/codex/utils/eventTreeSpacing/`, `*NodeDimensions*`, `*TextMeasurer*`, or the `TalentTree`/`EventTree` components.

- Start `npm run dev` and open the affected pages.
- Compare against the pre-change rendering (screenshot or a second checkout/stash if needed).
- For tree-layout changes, spot-check 2–3 complex events / expanded talent trees, including expanded/collapsed nodes and multiple zoom levels — small layouts can look fine while large ones regress.

## Notes

- **The repo keeps no permanent tests.** Tests written to verify a change during development are temporary: delete them once they've served their purpose, unless permanent tests were explicitly requested. `npm test` uses `--passWithNoTests`, so zero test files is the expected end state.
- Report failures honestly with output; never mark a change done with a failing check.

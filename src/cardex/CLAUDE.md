# src/cardex/ — Cardex

Multi-keyword card search with advanced filtering, plus card tracking for weekly challenges. Card data is fetched live from the Blightbane API through the shared card data layer — `src/shared/CLAUDE.md` covers it, along with the filter framework, URL codes and artwork lookup Cardex builds on.

## Key files

- `index.tsx` — the feature entry
- `components/CardSearchPanel/` + `components/CardResultsPanel/` — search UI and result rendering. `CardResultsPanel/ResultCard/` wraps the shared `ResultCard` with Cardex's keyword pills, exact-match highlight and card tracking (`CardStrikeBadge`, `STRUCK_TRIGGER`)
- `hooks/useWeeklyChallengeFilterData.ts` — the latest weekly challenge, fetched through the shared `fetchLatestChallenge` (also used by Scoring) and turned into filter settings for the weekly-challenge button by a mapper private to the hook
- `hooks/useSearchFilters/` — Cardex's filter groups and `useAllCardSearchFilters`; the shared framework and `useCardSetFilters.ts` (which exports **two** hooks — see the nil-expansion invariant) live in `src/shared/hooks/useSearchFilters/`

## Invariants

- **The filter-framework, URL-code, card-data and artwork invariants live in `src/shared/CLAUDE.md`** — notably the nil-expansion (`Core°`) rule, duplicate card names, and the `<rarity:X>` token the weekly optimization emits.
- **Monster cards are rarity 4 / banner 11 — _not_ card type 7.** Cardex treats monster cards as one opt-in population behind the single _Include Monster cards_ checkbox in Extras, so every filter group whose `indexMap` can address them must defer to `shouldIncludeMonsterCards` for them (see `isCardMatching` in `useAllCardSearchFilters.ts`). Rarity and banner get this for free — indices 4 and 11 are absent from their `indexMap`s, so nothing can select them. **Card type is the dangerous case**: ~1000 monster cards carry an ordinary type (mostly Utility), all of which _are_ selectable, so keying the deferral on the card's type instead of on the card lets the Type group silently veto monster cards the user opted into. Type 7 invites exactly that mistake — it looks like a monster marker but sits on only ~10 cards, one of which (`Infernal Racket`) `getActualColor` deliberately remaps to a normal banner. It has no checkbox, and stays in `indexToValueMap` only so those cards render a label. Verify changes here against the live `cards-codex` payload rather than by eye: the failure mode is one filter combination over ~1000 cards.
- **The `.result-card` row invariants (`content-visibility`, the name's minimum widths) live in `src/shared/CLAUDE.md`**, with the shared `ResultCard`.

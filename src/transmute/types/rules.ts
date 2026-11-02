/*
 * Mirrors the output of `scripts/sync/sync-transmute-rules.js`, so a change to that output means
 * editing both. Card ids are game ids (`CardData.blightbane_id`).
 */

export type TransmuteRoute = 'transmute' | 'sidemute' | 'tradepost'

export type TransmuteEnergy = 'dex' | 'int' | 'str' | 'holy'

/*
 * `[color, rarity]` in `CardData`'s numbering (banner 1–11, rarity 0–4), as the game computes them.
 * Use these instead of Blightbane's `color`/`rarity`, which differ for ~100 cards.
 */
export type CardColorAndRarity = [color: number, rarity: number]

export interface CannotBeSourceGroup {
  // e.g. `EXCEPTION-CURSE`. For mapping to UI copy only: which routes are blocked comes from `blocks`
  id: string
  reason: string
  blocks: TransmuteRoute[]
  cards: number[]
}

export interface TransmuteRules {
  version: string
  date: string
  // Where each route is offered, for display only
  routes: {
    transmute: { events: string[]; cards: string[] }
    sidemute: { events: string[] }
    tradepost: { cards: string[] }
  }
  // Every card in the game data, enemy-only cards included
  cards: Record<string, CardColorAndRarity>
  // Allowed as transmute and sidemute results
  pool: number[]
  // The only results when sidemuting a Monster-banner card, whatever its rarity
  monsterSidemute: number[]
  // Tradepost's results are `pool` plus `adds`, minus `removes`
  tradepost: { adds: number[]; removes: number[] }
  potions: number[]
  // Read by `blocks`, never by position: upstream can add groups
  cannotBeSource: CannotBeSourceGroup[]
  /*
   * Replaces the color's default requirement. Any one of the listed energies is enough, and an
   * empty list means anyone can transmute into the card.
   */
  castRequirements: Record<string, TransmuteEnergy[]>
}

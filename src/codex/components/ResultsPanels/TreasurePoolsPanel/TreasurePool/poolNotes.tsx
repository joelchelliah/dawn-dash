import { PoolId } from '@/codex/constants/treasurePools'

interface PoolNotes {
  above?: JSX.Element
  below?: JSX.Element
}

export const POOL_NOTES: Record<PoolId, PoolNotes> = {
  'booty-shovel': {
    above: (
      <>
        The largest pool in the game, and only used by <strong>Shovel</strong> and{' '}
        <strong>Booty</strong> cards, letting you delve between 3 random cards from this pool during
        combat.
      </>
    ),
    below: (
      <>
        Both <strong>Shovel</strong> and <strong>Booty</strong> can delve <strong>Unique</strong>{' '}
        cards you already own. cards you already own.
      </>
    ),
  },
  'only-treasure': {
    above: (
      <>
        The only pool that consists entirely of <strong>Treasure</strong> cards. Used by all
        Treasure-granting events, and by the <strong>Explorer's Trick</strong> card's secondary
        effect.
      </>
    ),
    below: (
      <>
        A few of the <strong>Treasure events</strong> have additional restrictions, preventing you
        from getting certain cards from them.
      </>
    ),
  },
  'pirate-parlour': {
    above: (
      <>
        Only used by the <strong>Pirate Parlour</strong> talent, which lets you delve between 3
        random cards from this pool during combat.
      </>
    ),
    below: (
      <>
        The delved cards are <strong>played</strong> immediately. No cards are permanently added to
        the deck.
      </>
    ),
  },
}

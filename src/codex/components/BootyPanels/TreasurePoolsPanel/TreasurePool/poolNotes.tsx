import { PoolId } from '@/codex/constants/treasurePools'

interface PoolNotes {
  above?: JSX.Element
  below?: JSX.Element
}

export const POOL_NOTES: Record<PoolId, PoolNotes> = {
  'booty-shovel': {
    above: (
      <>
        The largest pool in the game. Only used by <strong>Shovel</strong> and{' '}
        <strong>Booty</strong>, which let you delve between 3 random cards from this pool during
        combat.
      </>
    ),
    below: (
      <>
        Both <strong>Shovel</strong> and <strong>Booty</strong> can delve <strong>Unique</strong>{' '}
        cards you already own.
        <br />
        <br />
        This pool&apos;s size is limited by which card sets you&apos;ve enabled.
      </>
    ),
  },
  'only-treasure': {
    above: (
      <>
        The only pool that consists entirely of <strong>Treasure</strong> cards. Used by all
        Treasure-granting events, and by the <strong>Explorer&apos;s Trick</strong> card&apos;s
        secondary effect.
      </>
    ),
    below: (
      <>
        Some of the <strong>Treasure events</strong> have additional hidden restrictions, preventing
        you from getting certain cards.
        <br />
        <br />
        This pool&apos;s size is limited by which card sets you&apos;ve enabled.
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
        Cards delved via <strong>Pirate Parlour</strong> are played immediately. No cards are
        permanently added to the deck.
        <br />
        <br />
        This pool&apos;s size is always the same, regardless of which card sets you&apos;ve enabled.
      </>
    ),
  },
}

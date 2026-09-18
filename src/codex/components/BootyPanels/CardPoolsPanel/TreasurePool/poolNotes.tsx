import { PoolId, TREASURE_POOL_DISPLAYS } from '@/codex/constants/treasurePools'
import { getTreasureShareOfPool } from '@/codex/utils/treasureHelper'

interface PoolNotes {
  above?: JSX.Element
  below?: JSX.Element
}

const getPoolsOf = (id: PoolId): string[] =>
  TREASURE_POOL_DISPLAYS.find((display) => display.id === id)?.pools ?? []

const BOOTY_TREASURE_SHARE = getTreasureShareOfPool(getPoolsOf('booty'))

export const POOL_NOTES: Record<PoolId, PoolNotes> = {
  booty: {
    above: (
      <>
        The largest treasure pool, with only <strong>{BOOTY_TREASURE_SHARE?.toFixed(1)}%</strong> of
        the total pool consisting of actual <strong>Treasure</strong> cards.
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
  treasure: {
    above: (
      <>
        The only pool consisting entirely of <strong>Treasure</strong> cards.
      </>
    ),
    below: (
      <>
        Some <strong>Treasure events</strong> may have additional hidden restrictions.
        <br />
        <br />
        This pool&apos;s size is limited by which card sets you&apos;ve enabled.
      </>
    ),
  },
  'pirate-parlour': {
    above: (
      <>
        Apart from the <strong>Pirate Inks</strong>, all rewards from this pool are temporary.
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

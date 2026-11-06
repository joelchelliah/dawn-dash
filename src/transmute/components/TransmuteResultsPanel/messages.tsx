import { ReactNode } from 'react'

import { createCx } from '@/shared/utils/classnames'

import { TransmuteEnergyAttribute } from '@/transmute/types/rules'
import { COLOR, RARITY } from '@/transmute/utils/transmuteLookup'

import BannerPill from './BannerPill'
import ModeName from './ModeName'
import RarityLabel from './RarityLabel'
import EnergyAttributeIconsInline from './EnergyAttributeIconsInline'
import styles from './messages.module.scss'

const cx = createCx(styles)

interface Context {
  Card: ReactNode
  Mode: ReactNode
}

export const MESSAGES = {
  // - - - - - - - - - - - - - - - -
  // - - - - Header messages - - - -
  // - - - - - - - - - - - - - - - -

  // No card selected yet
  searchPromptFrom: ({ Mode }: Pick<Context, 'Mode'>) => (
    <>Search for a card to see which cards it can {Mode} into.</>
  ),
  searchPromptTo: ({ Mode }: Pick<Context, 'Mode'>) => (
    <>Search for a card to see which cards can {Mode} into it.</>
  ),

  // A list of results. `cardsPhrase` is the count plus any shared banner/rarity.
  listedFrom: ({
    Card,
    Mode,
    cardsPhrase,
    isSingular,
    includingItself,
  }: Context & { cardsPhrase: ReactNode; isSingular: boolean; includingItself: ReactNode }) => (
    <>
      {Card} can {isSingular && 'only '}
      {Mode} into {cardsPhrase}
      {includingItself}.
    </>
  ),
  listedTo: ({
    Card,
    Mode,
    cardsPhrase,
    isSingular,
    includingItself,
  }: Context & { cardsPhrase: ReactNode; isSingular: boolean; includingItself: ReactNode }) => (
    <>
      {isSingular ? 'Only ' : ''}
      {cardsPhrase} can {Mode} into {Card}
      {includingItself}.
    </>
  ),
  // Tradepost, when the card's only result is itself
  listedOnlyItselfFrom: ({ Card, Mode }: Context) => (
    <>
      {Card} can only {Mode} into itself.
    </>
  ),
  listedOnlyItselfTo: ({ Card, Mode }: Context) => (
    <>
      Only {Card} itself can {Mode} into {Card}.
    </>
  ),

  // Subtexts under a list, for the branches that break the usual same-banner rule
  blackSidemutesIntoBrown: () => (
    <>
      <BannerPill color={COLOR.Black} /> cards always <ModeName mode="sidemute" /> into{' '}
      <BannerPill color={COLOR.Brown} /> cards.
    </>
  ),
  monsterBannerSidemuteResults: () => (
    <>
      All <BannerPill color={COLOR.Monster} /> cards can <ModeName mode="sidemute" /> into any of
      the following <RarityLabel rarity={RARITY.Monster} /> cards.
    </>
  ),
  brownSidemuteSources: () => (
    <>
      Both <BannerPill color={COLOR.Brown} /> and <BannerPill color={COLOR.Black} /> cards{' '}
      <ModeName mode="sidemute" /> into <BannerPill color={COLOR.Brown} /> cards.
    </>
  ),
  monsterTransmuteResults: () => (
    <>
      <RarityLabel rarity={RARITY.Monster} /> cards <ModeName mode="transmute" /> into{' '}
      <RarityLabel rarity={RARITY.Common} /> cards of any <strong>banner color</strong> you have
      access to.
    </>
  ),

  // No list: the card itself rules the mode out
  missingTransmuteData: ({ Card }: Pick<Context, 'Card'>) => (
    <>Failed to find transmute data for {Card}!</>
  ),
  whiteSidemuteUnknown: ({ Mode }: Pick<Context, 'Mode'>) => (
    <>
      Not enough data to know how <BannerPill color={COLOR.White} /> cards {Mode}.
    </>
  ),
  tradepostExcludesMonsterRarity: ({ Mode }: Pick<Context, 'Mode'>) => (
    <>
      {Mode} does not work with any <RarityLabel rarity={RARITY.Monster} /> cards.
    </>
  ),
  tradepostExcludesWhiteBanner: ({ Mode }: Pick<Context, 'Mode'>) => (
    <>
      {Mode} does not work with any <BannerPill color={COLOR.White} /> cards.
    </>
  ),
  noResults: ({ Card, Mode }: Context) => (
    <>
      {Card} has no {Mode} results.
    </>
  ),
  // `blocked` subtexts. Not blocked as such: no result is Monster rarity, so the same-color
  // sidemute is empty.
  monsterRarityWithoutMonsterBanner: ({ Mode }: Pick<Context, 'Mode'>) => (
    <>
      <RarityLabel rarity={RARITY.Monster} /> cards without a <BannerPill color={COLOR.Monster} />{' '}
      cannot {Mode} into anything.
    </>
  ),
  cursedCannotBeTarget: ({ Mode }: Pick<Context, 'Mode'>) => (
    <>
      <strong>Cursed</strong> cards can never be selected as the target of a {Mode}.
    </>
  ),

  // No list: the card can never be a result
  cannotBeObtainedFrom: ({ Card, Mode }: Context) => (
    <>
      {Card} can never be obtained <strong>from</strong> a {Mode}.
    </>
  ),
  // Monster is the bottom of the ladder, so nothing transmutes into a Monster-rarity card
  monsterRarityCannotBeObtainedFrom: ({ Mode }: Pick<Context, 'Mode'>) => (
    <>
      <RarityLabel rarity={RARITY.Monster} /> cards can never be obtained <strong>from</strong> a{' '}
      {Mode}.
    </>
  ),
  blackBannerCannotBeObtainedFrom: ({ Mode }: Pick<Context, 'Mode'>) => (
    <>
      <BannerPill color={COLOR.Black} /> cards can never be obtained <strong>from</strong> a {Mode}.
    </>
  ),
  blackBannerCannotBeObtainedFromReason: ({ Mode }: Pick<Context, 'Mode'>) => (
    <>
      This is because <BannerPill color={COLOR.Black} /> cards {Mode} into{' '}
      <BannerPill color={COLOR.Brown} /> cards.
    </>
  ),
  monsterBannerSidemuteSources: ({ Card, Mode, count }: Context & { count: number }) => (
    <>
      Any of the <strong>{count}</strong> <BannerPill color={COLOR.Monster} /> cards can {Mode} into{' '}
      {Card}.
    </>
  ),
  // Mirrors `listedTo`. The Monster-banner route is the `monsterBannerFallback` below.
  noSameBannerMonsterSources: ({ Card, Mode, color }: Context & { color?: number }) => (
    <>
      No {color !== undefined && <BannerPill color={color} />}{' '}
      <RarityLabel rarity={RARITY.Monster} /> cards can {Mode} into {Card}.
    </>
  ),

  // No list: the filters hide every result
  allResultsHiddenByFilters: ({ Card, Mode, count }: Context & { count: number }) => (
    <>
      All of {Card}’s <strong>{count}</strong> {Mode} results are hidden by your{' '}
      <strong>filters</strong>.
    </>
  ),
  hiddenInCardSets: ({ cardSets }: { cardSets: string[] }) => (
    <>
      They are in the following card {cardSets.length > 1 ? 'sets' : 'set'}:
      {/* Spans rather than a list, since this renders inside the detail paragraph */}
      <span className={cx('list')}>
        {cardSets.map((cardSet) => (
          <span key={cardSet} className={cx('list__item')}>
            <strong>{cardSet}</strong>
          </span>
        ))}
      </span>
    </>
  ),
  randomOfferWithoutEnergy: ({
    rarity,
    requiredEnergyAttributes,
  }: {
    rarity: number
    requiredEnergyAttributes: TransmuteEnergyAttribute[]
  }) => (
    <>
      Without <EnergyAttributeIconsInline attributes={requiredEnergyAttributes} />{' '}
      <strong>energy</strong>, you will be offered random <RarityLabel rarity={rarity} /> cards of
      any <strong>banner color</strong> you have access to.
    </>
  ),
  randomOffer: ({ rarity }: { rarity: number }) => (
    <>
      You will be offered random <RarityLabel rarity={rarity} /> cards of any{' '}
      <strong>banner color</strong> you have access to.
    </>
  ),
  // `Comes from`: the filters hide the selected card itself as a result
  cannotBeObtainedWithFilters: ({ Card }: Pick<Context, 'Card'>) => (
    <>
      {Card} cannot be obtained with your current <strong>filters</strong>.
    </>
  ),
  cannotBeObtainedWithFiltersRequirements: ({
    Mode,
    requiredCardSet,
    requiredEnergyAttributes,
  }: Pick<Context, 'Mode'> & {
    requiredCardSet?: string
    requiredEnergyAttributes: TransmuteEnergyAttribute[]
  }) => {
    const cardSetPhrase = requiredCardSet && (
      <>
        the <strong>{requiredCardSet}</strong> card set
      </>
    )
    const energyPhrase = requiredEnergyAttributes.length > 0 && (
      <>
        <strong>{requiredEnergyAttributes.length > 1 ? 'one of ' : ''}</strong>
        <EnergyAttributeIconsInline attributes={requiredEnergyAttributes} /> <strong>energy</strong>
      </>
    )
    return (
      <>
        It requires {cardSetPhrase}
        {cardSetPhrase && energyPhrase && ' and '}
        {energyPhrase} to be obtainable via {Mode}.
      </>
    )
  },

  // - - - - - - - - - - - - - - - -
  // - - - - Footer messages - - - -
  // - - - - - - - - - - - - - - - -

  // Transmute _From_: what the game offers once the same-color results run out
  transmuteFallbackPool: ({ Mode, count, rarity }: Pick<Context, 'Mode'> & FallbackPoolProps) => (
    <>
      If you run out of valid {Mode} options, you are offered cards from a pool of{' '}
      <strong>{count}</strong> <RarityLabel rarity={rarity} /> cards, of any{' '}
      <strong>banner color</strong> you have access to.
    </>
  ),
  // Sidemute _From_: the potion top-up
  sidemuteFallbackPool: ({ Mode, count, rarity }: Pick<Context, 'Mode'> & FallbackPoolProps) => (
    <>
      If you run out of valid {Mode} options, you are offered cards from a pool of{' '}
      <strong>{count}</strong> <RarityLabel rarity={rarity} /> potions.
    </>
  ),
  // Transmute _To_ a Common: Monster-banner cards offer random Commons of any color
  monsterBannerFallback: ({
    Card,
    count,
    hasDirectSources,
  }: Pick<Context, 'Card'> & { count: number; hasDirectSources: boolean }) => (
    <>
      {!hasDirectSources && 'However, '}
      {Card} can {hasDirectSources ? 'also' : 'still'} show up among the random{' '}
      <RarityLabel rarity={RARITY.Common} /> cards offered by any of the <strong>{count}</strong>{' '}
      <BannerPill color={COLOR.Monster} /> cards.
    </>
  ),
}

interface FallbackPoolProps {
  count: number
  rarity: number
}

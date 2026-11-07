import { ReactNode } from 'react'

import { createCx } from '@/shared/utils/classnames'
import { CardData } from '@/shared/types/cards'

import { TransmuteMode } from '@/transmute/types/rules'
import { TransmuteDirection } from '@/transmute/types/filters'
import { TransmuteState, TransmuteView } from '@/transmute/hooks/useTransmuteResults'
import {
  ARE_ALL_POTIONS_REMOVED_FROM_TRADEPOST,
  COLOR,
  getTradepostExcludedGroup,
  isPotion,
  RARITY,
} from '@/transmute/utils/transmuteLookup'
import { isMetaprogressCard } from '@/transmute/utils/transmuteCards'

import BannerPill from '../BannerPill'
import { MESSAGES } from '../messages'
import ModeName from '../ModeName'
import RarityLabel from '../RarityLabel'

import styles from './index.module.scss'

const cx = createCx(styles)

// The value every item shares, or `undefined` when they differ
const getSharedValue = (values: number[]) =>
  values.length > 0 && values.every((value) => value === values[0]) ? values[0] : undefined

interface ResultsHeaderProps {
  view: TransmuteView
  selectedCard: CardData | null
  direction: TransmuteDirection
  mode: TransmuteMode
}

// The headline above the results, plus the detail lines the filters and results call for
const ResultsHeader = ({ view, selectedCard, direction, mode }: ResultsHeaderProps) => {
  const Mode = <ModeName mode={mode} />
  const Card = <strong>{selectedCard?.name}</strong>
  const context = { Card, Mode }

  // The headline, plus an optional detail line under it
  const getStateText = (state: TransmuteState): [ReactNode, ReactNode?] => {
    switch (state.kind) {
      case 'unknown':
        return [MESSAGES.missingTransmuteData(context)]
      // Tradepost is covered by the excluded-group headline below, so only sidemute gets here
      case 'white':
        return [MESSAGES.whiteSidemuteUnknown(context)]
      case 'blocked':
        return [
          MESSAGES.noResults(context),
          state.groupId === 'EXCEPTION-MONSTER'
            ? MESSAGES.monsterRarityWithoutMonsterBanner(context)
            : state.groupId === 'EXCEPTION-CURSE'
              ? MESSAGES.cursedCannotBeTarget(context)
              : state.reason,
        ]
      case 'transmute-fallback':
        return [
          // A color with nothing at the next rarity also lands here, with nothing to hide
          state.count > 0
            ? MESSAGES.allResultsHiddenByFilters({ ...context, count: state.count })
            : MESSAGES.noResults(context),
          state.requiredEnergyAttributes.length > 0
            ? MESSAGES.randomOfferWithoutEnergy(state)
            : MESSAGES.randomOffer(state),
        ]
      case 'all-hidden-by-card-sets':
        return [
          MESSAGES.allResultsHiddenByFilters({ ...context, count: state.count }),
          MESSAGES.hiddenInCardSets(state),
        ]
      case 'tradepost-nothing':
        return [MESSAGES.noResults(context)]
      case 'not-a-result':
        if (mode === 'transmute' && selectedCard?.rarity === RARITY.Monster)
          return [MESSAGES.monsterRarityCannotBeObtainedFrom(context)]
        if (
          mode === 'tradepost' &&
          selectedCard &&
          isPotion(selectedCard.blightbane_id) &&
          ARE_ALL_POTIONS_REMOVED_FROM_TRADEPOST
        )
          return [MESSAGES.cannotBeObtainedFrom(context), MESSAGES.potionsNeverOfferedBy(context)]
        return [MESSAGES.cannotBeObtainedFrom(context)]
      case 'black-target':
        return [
          MESSAGES.blackBannerCannotBeObtainedFrom(context),
          MESSAGES.blackBannerCannotBeObtainedFromReason(context),
        ]
      case 'unreachable-with-filters':
        return [
          MESSAGES.cannotBeObtainedWithFilters(context),
          MESSAGES.cannotBeObtainedWithFiltersRequirements({ ...context, ...state }),
        ]
      case 'monster-sidemute-target':
        return [MESSAGES.monsterBannerSidemuteSources({ ...context, count: state.count })]
      case 'monster-transmute-target':
        return [MESSAGES.noSameBannerMonsterSources({ ...context, color: selectedCard?.color })]
      // _From_ only empties through data drift: live data missing every id in the result list
      case 'empty':
        return [
          direction === 'from'
            ? MESSAGES.noResults(context)
            : MESSAGES.cannotBeObtainedFrom(context),
        ]
    }
  }

  // Lines about the selected card itself, stacked under whatever detail the state or list has
  const isComesFrom = direction === 'to' && selectedCard
  const unlockLine =
    isComesFrom && isMetaprogressCard(selectedCard) && MESSAGES.onlyOfferedOnceUnlocked(context)

  const renderHeadline = (headline: ReactNode, ...details: ReactNode[]) => (
    <>
      <h2 className={cx('headline')}>{headline}</h2>
      {[...details, unlockLine].filter(Boolean).map((detail, index) => (
        <p key={index} className={cx('detail')}>
          {detail}
        </p>
      ))}
    </>
  )

  if (view.kind === 'no-card') {
    return renderHeadline(
      direction === 'from' ? MESSAGES.searchPromptFrom(context) : MESSAGES.searchPromptTo(context)
    )
  }

  const tradepostExcludedGroup =
    mode === 'tradepost' && selectedCard && getTradepostExcludedGroup(selectedCard)
  // One rule covers both directions
  if (view.kind === 'state' && tradepostExcludedGroup) {
    // Monster is excluded by rarity, not banner: Monster-banner Rares and Legendaries are fine
    return renderHeadline(
      tradepostExcludedGroup === 'Monster'
        ? MESSAGES.tradepostExcludesMonsterRarity(context)
        : MESSAGES.tradepostExcludesWhiteBanner(context)
    )
  }

  if (view.kind === 'state') return renderHeadline(...getStateText(view.state))

  const subtext =
    direction === 'from' && view.branch === 'black-to-brown'
      ? MESSAGES.blackSidemutesIntoBrown()
      : direction === 'from' && view.branch === 'monster'
        ? MESSAGES.monsterBannerSidemuteResults()
        : view.branch === 'monster-transmute'
          ? MESSAGES.monsterTransmuteResults()
          : direction === 'to' && mode === 'sidemute' && selectedCard?.color === COLOR.Brown
            ? MESSAGES.brownSidemuteSources()
            : ''

  // Read off the visible cards rather than the rules, so the special branches (Black→Brown, Brown's
  // mixed sources, White's any-color results) name exactly what is listed, or nothing at all
  const sharedBanner = getSharedValue(view.cards.map((card) => card.color))
  const sharedRarity = getSharedValue(view.cards.map((card) => card.rarity))
  const hasDescriptor = sharedBanner !== undefined || sharedRarity !== undefined
  const descriptor = hasDescriptor && (
    <>
      {sharedBanner !== undefined && (
        <>
          <BannerPill color={sharedBanner} />{' '}
        </>
      )}
      {sharedRarity !== undefined && (
        <>
          <RarityLabel rarity={sharedRarity} />{' '}
        </>
      )}
    </>
  )

  // Checked rather than assumed for Tradepost: an unticked card set can filter the card itself out
  const includesItself = view.cards.some(
    (card) => card.blightbane_id === selectedCard?.blightbane_id
  )
  const isOnlyItself = includesItself && view.cards.length === 1
  const includingItself = !subtext && mode === 'tradepost' && includesItself && ', including itself'
  const isSingular = view.cards.length === 1
  const count = <strong>{view.cards.length}</strong>
  const cardsPhrase = hasDescriptor ? (
    <>
      {count} {descriptor}
      {isSingular ? 'card' : 'cards'}
    </>
  ) : isSingular ? (
    <>{count} card</>
  ) : (
    <>{count} different cards</>
  )
  const listedContext = { ...context, cardsPhrase, isSingular, includingItself }

  const headline =
    direction === 'from'
      ? isOnlyItself
        ? MESSAGES.listedOnlyItselfFrom(context)
        : MESSAGES.listedFrom(listedContext)
      : isOnlyItself
        ? MESSAGES.listedOnlyItselfTo(context)
        : MESSAGES.listedTo(listedContext)

  // Not under a state headline: the all-hidden states already say it
  const hiddenResultsLine =
    view.hiddenCount !== undefined &&
    view.hiddenCount > 0 &&
    MESSAGES.hiddenResults({ count: view.hiddenCount })

  return renderHeadline(headline, subtext, hiddenResultsLine)
}

export default ResultsHeader

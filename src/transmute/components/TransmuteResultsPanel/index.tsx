import { createCx } from '@/shared/utils/classnames'
import { CardData } from '@/shared/types/cards'
import { getCardSetName } from '@/shared/hooks/useSearchFilters/useCardSetFilters'
import { getCardTypeEmoji, getCardTypeName } from '@/shared/utils/cardTypes'
import PanelHeader from '@/shared/components/PanelHeader'
import ResultCard from '@/shared/components/ResultCard'
import ResultCardsByBanner from '@/shared/components/ResultCardsByBanner'

import { UseAllTransmuteSearchFilters } from '@/transmute/hooks/useSearchFilters/useAllTransmuteSearchFilters'
import { useTransmuteResults } from '@/transmute/hooks/useTransmuteResults'
import { TransmuteCards } from '@/transmute/utils/transmuteCards'

import ResultsFooter from './ResultsFooter'
import ResultsHeader from './ResultsHeader'
import styles from './index.module.scss'

const cx = createCx(styles)

interface TransmuteResultsPanelProps {
  cards: TransmuteCards
  useSearchFilters: UseAllTransmuteSearchFilters
}

const TransmuteResultsPanel = ({ cards, useSearchFilters }: TransmuteResultsPanelProps) => {
  const { selectedCard, direction, mode, useCardSetFilters, useEnergyAttributeFilters } =
    useSearchFilters
  const { shouldShowCardArt, shouldShowBlightbaneLink } = useSearchFilters.useFormattingFilters
  const { isCardSetIndexSelected } = useCardSetFilters
  const { selectedEnergyAttributes } = useEnergyAttributeFilters

  const view = useTransmuteResults({
    cards,
    selectedCard,
    direction,
    mode,
    selectedEnergyAttributes,
    isCardSetIndexSelected,
  })

  return (
    <div className={cx('results-panel')}>
      <PanelHeader type="TransmuteResults" />

      {/* Keyed on the query, so a new card, mode or direction replays the rows' entry animation */}
      <div className={cx('results')} key={`${selectedCard?.blightbane_id}-${direction}-${mode}`}>
        <ResultsHeader view={view} selectedCard={selectedCard} direction={direction} mode={mode} />
        {view.kind === 'cards' && (
          <ResultCardsByBanner
            cards={view.cards}
            renderCard={(card: CardData, entryIndex: number) => (
              <ResultCard
                key={card.blightbane_id}
                card={card}
                entryIndex={entryIndex}
                shouldShowDescription
                shouldShowCardArt={shouldShowCardArt}
                shouldShowBlightbaneLink={shouldShowBlightbaneLink}
                shouldShowCardSet
                shouldShowCardType
                getCardSetNameFromIndex={getCardSetName}
                getCardTypeNameFromIndex={getCardTypeName}
                getCardTypeEmojiFromIndex={getCardTypeEmoji}
              />
            )}
          />
        )}
        <ResultsFooter view={view} selectedCard={selectedCard} mode={mode} />
      </div>
    </div>
  )
}

export default TransmuteResultsPanel

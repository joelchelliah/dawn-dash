import { createCx } from '@/shared/utils/classnames'
import { CardData } from '@/shared/types/cards'
import { getCardSetName } from '@/shared/hooks/useSearchFilters/useCardSetFilters'
import ResultCard from '@/shared/components/ResultCard'

import styles from './index.module.scss'

const cx = createCx(styles)

interface SelectedCardProps {
  card: CardData | null
  shouldShowCardArt: boolean
  shouldShowBlightbaneLink: boolean
}

// The slot keeps its height when empty, so selecting a card doesn't push the filters down
const SelectedCard = ({ card, shouldShowCardArt, shouldShowBlightbaneLink }: SelectedCardProps) => (
  <div className={cx('selected-card')}>
    {card ? (
      <ResultCard
        // Keyed so the entry animation replays when another card is picked
        key={card.blightbane_id}
        card={card}
        entryIndex={0}
        shouldShowDescription
        shouldShowCardArt={shouldShowCardArt}
        shouldShowBlightbaneLink={shouldShowBlightbaneLink}
        shouldShowCardSet
        getCardSetNameFromIndex={getCardSetName}
      />
    ) : (
      <p className={cx('selected-card__placeholder')}>No card selected</p>
    )}
  </div>
)

export default SelectedCard

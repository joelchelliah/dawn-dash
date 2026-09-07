import InfoModal from '@/shared/components/Modals/InfoModal'
import RarityBorderedArtwork, { RARITIES } from '@/shared/components/RarityBorderedArtwork'
import { createCx } from '@/shared/utils/classnames'

import { getCardSetName } from '@/codex/hooks/useSearchFilters/useCardSetFilters'
import { EnrichedTreasureCard, TreasureCard } from '@/codex/types/treasures'
import { parseCardDescription } from '@/codex/utils/cardHelper'
import { getTreasureEvents } from '@/codex/utils/treasureHelper'

import CardPill from './CardPill'
import TreasureEventList from './TreasureEventList'
import TreasureFlag from './TreasureFlag'
import TreasureSection from './TreasureSection'
import styles from './index.module.scss'

const cx = createCx(styles)

const ARTWORK_SIZE = 50
const ARTWORK_SIZE_MOBILE = 44
const ARTWORK_BORDER_OPACITY = 75
const MODAL_MAX_WIDTH = 800

interface TreasureAvailability {
  label: string
  value: boolean
}

const EXPLORERS_TRICK = "Explorer's Trick"
const BOOTY_AND_SHOVEL = ['Booty', 'Shovel']

const getAvailability = (treasure: TreasureCard): TreasureAvailability[] => {
  const sourceCards = treasure.fromCards.map(({ card }) => card)

  return [
    { label: 'Card rewards', value: treasure.inCardRewards },
    { label: 'Sold by Merchant', value: treasure.inMerchant },
    { label: 'Sold by Alchemist', value: treasure.inAlchemist },
    { label: 'Transmute', value: treasure.fromTranspose || treasure.fromTrade },
    { label: "Explorer's Trick (card)", value: sourceCards.includes(EXPLORERS_TRICK) },
    {
      label: 'Booty / Shovel (card)',
      value: BOOTY_AND_SHOVEL.some((card) => sourceCards.includes(card)),
    },
  ]
}

const UNINFORMATIVE_TYPES = ['Utility']

const getSubtitle = ({ type, category }: TreasureCard, rarityName?: string) =>
  [rarityName, UNINFORMATIVE_TYPES.includes(type) ? '' : type, splitCategoryWords(category)]
    .filter(Boolean)
    .join(' ')

const splitCategoryWords = (category: string) => category.replace(/([a-z])([A-Z])/g, '$1 $2')

interface TreasureModalProps {
  treasure: EnrichedTreasureCard
  onClose: () => void
}

function TreasureModal({ treasure, onClose }: TreasureModalProps): JSX.Element {
  const { treasureDetails, cardDetails } = treasure
  const rarity = RARITIES[cardDetails.rarity]
  const subtitle = getSubtitle(treasureDetails, rarity?.name)

  const events = getTreasureEvents(treasureDetails)

  return (
    <InfoModal isOpen onClose={onClose} maxWidth={MODAL_MAX_WIDTH} scrollable>
      <div className={cx('treasure-modal')}>
        <div className={cx('treasure-modal__card')}>
          <div className={cx('treasure-modal__header')}>
            <RarityBorderedArtwork
              cardName={cardDetails.name}
              rarity={cardDetails.rarity}
              category={cardDetails.category}
              size={ARTWORK_SIZE}
              sizeMobile={ARTWORK_SIZE_MOBILE}
              borderOpacity={ARTWORK_BORDER_OPACITY}
            />
            <div className={cx('treasure-modal__header-text')}>
              <span className={cx('treasure-modal__name')}>{treasureDetails.name}</span>
              {subtitle && (
                <span
                  className={cx('treasure-modal__subtitle', {
                    [`treasure-modal__subtitle--${rarity?.slug}`]: Boolean(rarity),
                  })}
                >
                  {subtitle}
                </span>
              )}
            </div>
            <CardPill cardSet={getCardSetName(cardDetails.expansion)} />
          </div>

          {cardDetails.description && (
            <div
              className={cx('treasure-modal__description')}
              dangerouslySetInnerHTML={{
                __html: parseCardDescription(
                  cardDetails.description,
                  cx('treasure-modal__description__icon')
                ),
              }}
            />
          )}
        </div>

        <TreasureSection title="Acquired outside events">
          <div className={cx('treasure-modal__availability')}>
            {getAvailability(treasureDetails).map(({ label, value }) => (
              <TreasureFlag key={label} label={label} value={value} />
            ))}
          </div>
        </TreasureSection>

        {events.length > 0 && (
          <TreasureSection title={`Acquired from events (${events.length})`}>
            <TreasureEventList events={events} />
          </TreasureSection>
        )}
      </div>
    </InfoModal>
  )
}

export default TreasureModal

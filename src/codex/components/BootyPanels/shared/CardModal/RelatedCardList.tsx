import { TALENT_ARTWORK_CATEGORY, useCardImageSrc } from '@/shared/hooks/useCardImageSrc'
import { capitalize } from '@/shared/utils/textHelper'

import { RelatedCard } from '@/codex/types/treasures'

import { ArtworkLinkItem, ArtworkLinkList } from '../ArtworkLinkList'

const getBlightbaneUrl = ({ name, isTalent }: RelatedCard) =>
  `https://www.blightbane.io/${isTalent ? 'talent' : 'card'}/${name.replaceAll(' ', '_')}`

interface RelatedCardListProps {
  relatedCards: RelatedCard[]
  showPools?: boolean
  showSourceType?: boolean
}

function RelatedCardList({
  relatedCards,
  showPools,
  showSourceType,
}: RelatedCardListProps): JSX.Element | null {
  if (relatedCards.length === 0) return null

  return (
    <ArtworkLinkList>
      {relatedCards.map((relatedCard) => (
        <RelatedCardItem
          key={`${relatedCard.name}-${relatedCard.isTalent}`}
          relatedCard={relatedCard}
          showPools={showPools}
          showSourceType={showSourceType}
        />
      ))}
    </ArtworkLinkList>
  )
}

interface RelatedCardItemProps {
  relatedCard: RelatedCard
  showPools?: boolean
  showSourceType?: boolean
}

function RelatedCardItem({
  relatedCard,
  showPools,
  showSourceType,
}: RelatedCardItemProps): JSX.Element {
  const { name, isTalent, category, pools } = relatedCard
  const { cardImageSrc, onImageSrcError } = useCardImageSrc(
    name,
    null,
    isTalent ? TALENT_ARTWORK_CATEGORY : category
  )

  const subtitles = showPools ? pools : showSourceType ? [isTalent ? 'talent' : 'card'] : undefined

  return (
    <ArtworkLinkItem
      name={name}
      href={getBlightbaneUrl(relatedCard)}
      isExternal
      src={cardImageSrc}
      onImageSrcError={onImageSrcError}
      subtitles={subtitles?.map(capitalize) ?? []}
    />
  )
}

export default RelatedCardList

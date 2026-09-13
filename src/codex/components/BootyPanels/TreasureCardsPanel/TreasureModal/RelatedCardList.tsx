import { TALENT_ARTWORK_CATEGORY, useCardImageSrc } from '@/shared/hooks/useCardImageSrc'

import { RelatedCard } from '@/codex/types/treasures'

import { ArtworkLinkItem, ArtworkLinkList } from './ArtworkLinkList'

const getBlightbaneUrl = ({ name, isTalent }: RelatedCard) =>
  `https://www.blightbane.io/${isTalent ? 'talent' : 'card'}/${name.replaceAll(' ', '_')}`

interface RelatedCardListProps {
  relatedCards: RelatedCard[]
  showPool?: boolean
}

function RelatedCardList({ relatedCards, showPool }: RelatedCardListProps): JSX.Element | null {
  if (relatedCards.length === 0) return null

  return (
    <ArtworkLinkList>
      {relatedCards.map((relatedCard) => (
        <RelatedCardItem
          key={`${relatedCard.name}-${relatedCard.pool ?? ''}`}
          relatedCard={relatedCard}
          showPool={showPool}
        />
      ))}
    </ArtworkLinkList>
  )
}

interface RelatedCardItemProps {
  relatedCard: RelatedCard
  showPool?: boolean
}

function RelatedCardItem({ relatedCard, showPool }: RelatedCardItemProps): JSX.Element {
  const { name, isTalent, category, pool } = relatedCard
  const { cardImageSrc, onImageSrcError } = useCardImageSrc(
    name,
    null,
    isTalent ? TALENT_ARTWORK_CATEGORY : category
  )

  return (
    <ArtworkLinkItem
      name={name}
      href={getBlightbaneUrl(relatedCard)}
      isExternal
      src={cardImageSrc}
      onImageSrcError={onImageSrcError}
      subtitle={showPool ? pool : undefined}
    />
  )
}

export default RelatedCardList

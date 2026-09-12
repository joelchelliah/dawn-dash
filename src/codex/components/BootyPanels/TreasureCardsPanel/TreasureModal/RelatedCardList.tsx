import { TALENT_ARTWORK_CATEGORY, useCardImageSrc } from '@/shared/hooks/useCardImageSrc'

import { RelatedCard } from '@/codex/types/treasures'

import { ArtworkLinkItem, ArtworkLinkList } from './ArtworkLinkList'

const getBlightbaneUrl = ({ name, isTalent }: RelatedCard) =>
  `https://www.blightbane.io/${isTalent ? 'talent' : 'card'}/${name.replaceAll(' ', '_')}`

interface RelatedCardListProps {
  relatedCards: RelatedCard[]
}

function RelatedCardList({ relatedCards }: RelatedCardListProps): JSX.Element | null {
  if (relatedCards.length === 0) return null

  return (
    <ArtworkLinkList>
      {relatedCards.map((relatedCard) => (
        <RelatedCardItem key={relatedCard.name} relatedCard={relatedCard} />
      ))}
    </ArtworkLinkList>
  )
}

interface RelatedCardItemProps {
  relatedCard: RelatedCard
}

function RelatedCardItem({ relatedCard }: RelatedCardItemProps): JSX.Element {
  const { name, isTalent, category } = relatedCard
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
    />
  )
}

export default RelatedCardList

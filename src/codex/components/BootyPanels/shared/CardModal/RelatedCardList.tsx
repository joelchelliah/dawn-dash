import { capitalize } from '@/shared/utils/textHelper'

import { RelatedCard } from '@/codex/types/treasures'

import { ArtworkLinkList } from '../ArtworkLinkList'
import { CardSourceItem } from '../ArtworkSourceItem'

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
      {relatedCards.map(({ name, isTalent, category, pools }) => {
        const subtitles = showPools
          ? pools
          : showSourceType
            ? [isTalent ? 'talent' : 'card']
            : undefined

        return (
          <CardSourceItem
            key={`${name}-${isTalent}`}
            name={name}
            isTalent={isTalent}
            category={category}
            subtitles={subtitles?.map(capitalize) ?? []}
          />
        )
      })}
    </ArtworkLinkList>
  )
}

export default RelatedCardList

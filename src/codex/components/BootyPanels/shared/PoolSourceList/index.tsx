import { capitalize } from '@/shared/utils/textHelper'

import { PoolReachedBy } from '@/codex/types/treasures'

import { ArtworkLinkLayout, ArtworkLinkList } from '../ArtworkLinkList'
import { CardSourceItem, EventSourceItem } from '../ArtworkSourceItem'

const ARTWORK_SIZE = 40
const ARTWORK_SIZE_MOBILE = 24
const ARTWORK_SIZE_MOBILE_LARGE = 32

interface PoolSourceListProps {
  sources: PoolReachedBy[]
  layout: ArtworkLinkLayout
  unshaded?: boolean
  allowLargerMobileArtwork?: boolean
}

function PoolSourceList({
  sources,
  layout,
  unshaded,
  allowLargerMobileArtwork = false,
}: PoolSourceListProps): JSX.Element | null {
  if (sources.length === 0) return null

  const artworkSizeMobile = allowLargerMobileArtwork
    ? ARTWORK_SIZE_MOBILE_LARGE
    : ARTWORK_SIZE_MOBILE

  return (
    <ArtworkLinkList layout={layout} unshaded={unshaded}>
      {sources.map(({ name, sourceType }) => {
        const key = `${name}-${sourceType}`
        const sizes = { artworkSize: ARTWORK_SIZE, artworkSizeMobile }

        return sourceType === 'event' ? (
          <EventSourceItem key={key} name={name} {...sizes} />
        ) : (
          <CardSourceItem
            key={key}
            name={name}
            isTalent={sourceType === 'talent'}
            subtitles={[capitalize(sourceType)]}
            {...sizes}
          />
        )
      })}
    </ArtworkLinkList>
  )
}

export default PoolSourceList

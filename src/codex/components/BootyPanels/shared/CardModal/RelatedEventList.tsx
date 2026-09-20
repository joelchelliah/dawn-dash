import { capitalize } from '@/shared/utils/textHelper'

import { EnrichedEvent } from '@/codex/types/treasures'

import { ArtworkLinkList } from '../ArtworkLinkList'
import { EventSourceItem } from '../ArtworkSourceItem'

interface RelatedEventListProps {
  events: EnrichedEvent[]
  showPools?: boolean
}

function RelatedEventList({ events, showPools }: RelatedEventListProps): JSX.Element | null {
  if (events.length === 0) return null

  return (
    <ArtworkLinkList>
      {events.map(({ name, pools }) => (
        <EventSourceItem
          key={name}
          name={name}
          subtitles={showPools ? pools.map(capitalize) : []}
        />
      ))}
    </ArtworkLinkList>
  )
}

export default RelatedEventList

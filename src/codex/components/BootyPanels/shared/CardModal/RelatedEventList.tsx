import { useEventImageSrc } from '@/codex/hooks/useEventImageSrc'
import { normalizeEventNameForUrl } from '@/codex/hooks/useEventUrlParam'
import { EnrichedEvent } from '@/codex/types/treasures'

import { ArtworkLinkItem, ArtworkLinkList } from './ArtworkLinkList'

interface RelatedEventListProps {
  events: EnrichedEvent[]
  showPools?: boolean
}

function RelatedEventList({ events, showPools }: RelatedEventListProps): JSX.Element | null {
  if (events.length === 0) return null

  return (
    <ArtworkLinkList>
      {events.map((enrichedEvent) => (
        <RelatedEventItem
          key={enrichedEvent.name}
          enrichedEvent={enrichedEvent}
          showPools={showPools}
        />
      ))}
    </ArtworkLinkList>
  )
}

interface RelatedEventItemProps {
  enrichedEvent: EnrichedEvent
  showPools?: boolean
}

function RelatedEventItem({ enrichedEvent, showPools }: RelatedEventItemProps): JSX.Element {
  const { name, artwork, pools } = enrichedEvent
  const { eventImageSrc, onImageSrcError } = useEventImageSrc(artwork)

  return (
    <ArtworkLinkItem
      name={name}
      href={`/eventmaps/${normalizeEventNameForUrl(name)}`}
      isExternal={false}
      src={eventImageSrc}
      onImageSrcError={onImageSrcError}
      subtitles={showPools ? pools : undefined}
    />
  )
}

export default RelatedEventList

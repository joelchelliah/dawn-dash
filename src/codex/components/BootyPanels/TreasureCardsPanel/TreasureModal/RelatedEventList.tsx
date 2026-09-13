import { useEventImageSrc } from '@/codex/hooks/useEventImageSrc'
import { normalizeEventNameForUrl } from '@/codex/hooks/useEventUrlParam'
import { EnrichedEvent } from '@/codex/types/treasures'

import { ArtworkLinkItem, ArtworkLinkList } from './ArtworkLinkList'

interface RelatedEventListProps {
  events: EnrichedEvent[]
  // Off by default: a list whose heading already names the pool would only repeat it on every row.
  showPool?: boolean
}

function RelatedEventList({ events, showPool }: RelatedEventListProps): JSX.Element | null {
  if (events.length === 0) return null

  return (
    <ArtworkLinkList>
      {events.map((enrichedEvent) => (
        <RelatedEventItem
          key={`${enrichedEvent.name}-${enrichedEvent.pool ?? ''}`}
          enrichedEvent={enrichedEvent}
          showPool={showPool}
        />
      ))}
    </ArtworkLinkList>
  )
}

interface RelatedEventItemProps {
  enrichedEvent: EnrichedEvent
  showPool?: boolean
}

function RelatedEventItem({ enrichedEvent, showPool }: RelatedEventItemProps): JSX.Element {
  const { name, artwork, pool } = enrichedEvent
  const { eventImageSrc, onImageSrcError } = useEventImageSrc(artwork)

  return (
    <ArtworkLinkItem
      name={name}
      href={`/eventmaps/${normalizeEventNameForUrl(name)}`}
      isExternal={false}
      src={eventImageSrc}
      onImageSrcError={onImageSrcError}
      subtitle={showPool ? pool : undefined}
    />
  )
}

export default RelatedEventList

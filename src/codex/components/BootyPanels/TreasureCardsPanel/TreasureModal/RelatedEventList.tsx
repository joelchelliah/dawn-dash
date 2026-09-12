import { useEventImageSrc } from '@/codex/hooks/useEventImageSrc'
import { normalizeEventNameForUrl } from '@/codex/hooks/useEventUrlParam'
import { Event } from '@/codex/types/events'

import { ArtworkLinkItem, ArtworkLinkList } from './ArtworkLinkList'

interface RelatedEventListProps {
  events: Event[]
}

function RelatedEventList({ events }: RelatedEventListProps): JSX.Element | null {
  if (events.length === 0) return null

  return (
    <ArtworkLinkList>
      {events.map((event) => (
        <RelatedEventItem key={event.name} event={event} />
      ))}
    </ArtworkLinkList>
  )
}

interface RelatedEventItemProps {
  event: Event
}

function RelatedEventItem({ event }: RelatedEventItemProps): JSX.Element {
  const { eventImageSrc, onImageSrcError } = useEventImageSrc(event.artwork)

  return (
    <ArtworkLinkItem
      name={event.name}
      href={`/eventmaps/${normalizeEventNameForUrl(event.name)}`}
      isExternal={false}
      src={eventImageSrc}
      onImageSrcError={onImageSrcError}
    />
  )
}

export default RelatedEventList

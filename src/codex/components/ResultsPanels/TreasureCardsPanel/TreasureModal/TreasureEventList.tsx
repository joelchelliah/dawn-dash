import Link from 'next/link'

import BorderedArtwork, {
  BORDERED_ARTWORK_HOVER_TRIGGER,
} from '@/shared/components/BorderedArtwork'
import { createCx } from '@/shared/utils/classnames'

import { useEventImageSrc } from '@/codex/hooks/useEventImageSrc'
import { normalizeEventNameForUrl } from '@/codex/hooks/useEventUrlParam'
import { Event } from '@/codex/types/events'

import styles from './TreasureEventList.module.scss'

const cx = createCx(styles)

const EVENT_ARTWORK_SIZE = 40
const EVENT_ARTWORK_SIZE_MOBILE = 24
const EVENT_ARTWORK_BORDER_OPACITY = 75

interface TreasureEventListProps {
  events: Event[]
}

function TreasureEventList({ events }: TreasureEventListProps): JSX.Element {
  return (
    <>
      <div className={cx('treasure-event-list')}>
        {events.map((event) => (
          <TreasureEventItem key={event.name} event={event} />
        ))}
      </div>
      <div className={cx('treasure-event-list__hint')}>
        Some of these events have a large pool of cards, including many{' '}
        <strong>non-treasure</strong> equipment and items.
      </div>
    </>
  )
}

interface TreasureEventItemProps {
  event: Event
}

function TreasureEventItem({ event }: TreasureEventItemProps): JSX.Element {
  const { eventImageSrc, onImageSrcError } = useEventImageSrc(event.artwork)

  const itemClassName = `${cx('treasure-event-item')} ${BORDERED_ARTWORK_HOVER_TRIGGER}`

  return (
    <Link
      href={`/eventmaps/${normalizeEventNameForUrl(event.name)}`}
      className={itemClassName}
      title={event.name}
      target="_blank"
      rel="noopener noreferrer"
    >
      <BorderedArtwork
        src={eventImageSrc}
        alt={event.name}
        size={EVENT_ARTWORK_SIZE}
        sizeMobile={EVENT_ARTWORK_SIZE_MOBILE}
        borderOpacity={EVENT_ARTWORK_BORDER_OPACITY}
        onImageSrcError={onImageSrcError}
        className={cx('treasure-event-item__artwork')}
      />
      <div className={cx('treasure-event-item__text')}>
        <span className={cx('treasure-event-item__name')}>{event.name}</span>
      </div>
    </Link>
  )
}

export default TreasureEventList

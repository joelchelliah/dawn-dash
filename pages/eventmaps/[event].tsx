import { GetServerSideProps } from 'next'
import dynamic from 'next/dynamic'

import { findEventByName } from '@/codex/hooks/useEventUrlParam'
import { Event } from '@/codex/types/events'
import eventTreesData from '@/codex/data/event-trees.json'
import { EventmapHead } from '@/codex/components/EventMapHead'

const Events = dynamic(() => import('../../src/codex/events'), {
  loading: () => <div>Loading events...</div>,
})

interface EventmapPageProps {
  event: Event | null
  eventUrlParam: string
}

/**
 * Dynamic route handler for `/eventmaps/[event]`
 * Handles URLs like `/eventmaps/a_familiar_face` where the event name
 * is passed as a URL parameter and automatically selects that event.
 * The event name in the URL should be lowercase with spaces replaced by underscores.
 * See `useEventUrlParam` hook for parameter parsing logic.
 */
export default function EventmapPage({ event, eventUrlParam }: EventmapPageProps) {
  return (
    <>
      <EventmapHead event={event} eventUrlParam={eventUrlParam} />
      <Events />
    </>
  )
}

export const getServerSideProps: GetServerSideProps<EventmapPageProps> = async (context) => {
  const eventParam = context.params?.event as string | undefined
  const eventTrees = eventTreesData as Event[]

  if (!eventParam) {
    return {
      props: {
        event: null,
        eventUrlParam: '',
      },
    }
  }

  const event = findEventByName(eventTrees, eventParam)

  return {
    props: {
      event,
      eventUrlParam: eventParam,
    },
  }
}

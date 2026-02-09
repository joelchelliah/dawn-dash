import { GetStaticProps, GetStaticPaths } from 'next'
import dynamic from 'next/dynamic'

import { findEventByName, normalizeEventNameForUrl } from '@/codex/hooks/useEventUrlParam'
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
 * Static route handler for `/eventmaps/[event]`
 * Handles URLs like `/eventmaps/a_familiar_face` where the event name
 * is passed as a URL parameter and automatically selects that event.
 * The event name in the URL should be lowercase with spaces replaced by underscores.
 * See `useEventUrlParam` hook for parameter parsing logic.
 *
 * This page uses Static Site Generation (SSG) - all event pages are pre-built
 * at build time for optimal performance and SEO.
 */
export default function EventmapPage({ event, eventUrlParam }: EventmapPageProps) {
  return (
    <>
      <EventmapHead event={event} eventUrlParam={eventUrlParam} />
      <Events />
    </>
  )
}

/**
 * Generates all possible event paths at build time.
 * This tells Next.js which pages to pre-render.
 */
export const getStaticPaths: GetStaticPaths = async () => {
  const eventTrees = eventTreesData as Event[]

  // Generate a path for each event
  const paths = eventTrees.map((event) => ({
    params: { event: normalizeEventNameForUrl(event.name) },
  }))

  return {
    paths,
    fallback: false, // Return 404 for any path not returned by getStaticPaths
  }
}

/**
 * Fetches event data at build time for each path.
 * This runs once per event during the build process.
 */
export const getStaticProps: GetStaticProps<EventmapPageProps> = async (context) => {
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

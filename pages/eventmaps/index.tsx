import dynamic from 'next/dynamic'

import { EventmapHead } from '@/codex/components/EventMapHead'

const Events = dynamic(() => import('../../src/codex/events'), {
  loading: () => <div>Loading events...</div>,
})

export default function EventmapPage() {
  return (
    <>
      <EventmapHead />
      <Events />
    </>
  )
}

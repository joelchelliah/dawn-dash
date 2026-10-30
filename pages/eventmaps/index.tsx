import dynamic from 'next/dynamic'

import { EventmapHead } from '@/eventmaps/components/EventMapHead'

const Events = dynamic(() => import('../../src/eventmaps'), {
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

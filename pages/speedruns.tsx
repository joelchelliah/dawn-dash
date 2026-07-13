import dynamic from 'next/dynamic'

import { PageHead } from '@/shared/components/PageHead'

const Speedruns = dynamic(() => import('../src/speedruns'), {
  loading: () => <div>Loading speedrun charts...</div>,
})

export default function SpeedrunsPage() {
  return (
    <>
      <PageHead toolId="speedruns" />
      <Speedruns />
    </>
  )
}

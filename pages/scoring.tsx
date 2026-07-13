import dynamic from 'next/dynamic'

import { PageHead } from '@/shared/components/PageHead'

const Scoring = dynamic(() => import('../src/scoring'), {
  loading: () => <div>Loading scoring guide...</div>,
})

export default function ScoringPage() {
  return (
    <>
      <PageHead toolId="scoring" />
      <Scoring />
    </>
  )
}

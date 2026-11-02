import dynamic from 'next/dynamic'

import { PageHead } from '@/shared/components/PageHead'

const Transmute = dynamic(() => import('../src/transmute'), {
  loading: () => <div>Loading transmute...</div>,
})

export default function TransmutePage() {
  return (
    <>
      <PageHead toolId="transmute" />
      <Transmute />
    </>
  )
}

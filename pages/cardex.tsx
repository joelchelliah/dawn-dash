import dynamic from 'next/dynamic'

import { PageHead } from '@/shared/components/PageHead'

const Cards = dynamic(() => import('../src/codex/cards'), {
  loading: () => <div>Loading cardex...</div>,
})

export default function CardexPage() {
  return (
    <>
      <PageHead toolId="cardex" />
      <Cards />
    </>
  )
}

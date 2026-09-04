import dynamic from 'next/dynamic'

import { PageHead } from '@/shared/components/PageHead'

const Booty = dynamic(() => import('../src/codex/booty'), {
  loading: () => <div>Loading booty...</div>,
})

export default function BootyPage() {
  return (
    <>
      <PageHead toolId="booty" />
      <Booty />
    </>
  )
}

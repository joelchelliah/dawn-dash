import dynamic from 'next/dynamic'

import { PageHead } from '@/shared/components/PageHead'

const Skills = dynamic(() => import('../src/codex/skills'), {
  loading: () => <div>Loading skilldex...</div>,
})

export default function SkilldexPage() {
  return (
    <>
      <PageHead toolId="skilldex" />
      <Skills />
    </>
  )
}

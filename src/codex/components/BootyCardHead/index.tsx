import { PageHead } from '@/shared/components/PageHead'

import { BootyCard } from '@/codex/utils/bootyCardUrl'

interface BootyCardHeadProps {
  card: BootyCard | null
  cardUrlParam: string
}

// Per-card meta arrives in Task 5; until then a card URL serves Booty's own tags.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function BootyCardHead(_props: BootyCardHeadProps): JSX.Element {
  return <PageHead toolId="booty" />
}

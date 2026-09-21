import dynamic from 'next/dynamic'

import { BootyCardHead } from '@/codex/components/BootyCardHead'
import { BootyCard } from '@/codex/utils/bootyCardUrl'

const Booty = dynamic(() => import('./booty'), {
  loading: () => <div>Loading booty...</div>,
})

export interface BootyPageProps {
  // Null on `/booty`, and on `/booty/[card]` for the `<Head>` only — the modal itself is resolved
  // from `router.query`, since shallow navigation never re-runs `getStaticProps`.
  card?: BootyCard | null
  cardUrlParam?: string
}

/**
 * The page behind both `/booty` and `/booty/[card]` — a card URL is the same page with that card's
 * modal open, so only the `<Head>` differs between them.
 *
 * **Both route files must `export default` this component itself, not a wrapper around it.**
 */
export default function BootyPage({ card = null, cardUrlParam = '' }: BootyPageProps): JSX.Element {
  return (
    <>
      <BootyCardHead card={card} cardUrlParam={cardUrlParam} />
      <Booty />
    </>
  )
}

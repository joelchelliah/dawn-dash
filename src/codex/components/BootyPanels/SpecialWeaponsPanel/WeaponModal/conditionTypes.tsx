import { createCx } from '@/shared/utils/classnames'

import { BootyCardKind } from '@/codex/utils/bootyCardUrl'

import cardModalStyles from '../../shared/CardModal/index.module.scss'

const cxCardModal = createCx(cardModalStyles)

/*
 * A condition source that isn't a card, talent or event the generic lists already cover.
 */
export type CustomConditionSource =
  | { name: string; bootyCard: BootyCardKind; kind?: undefined }
  | { name: string; kind: string; link: string; imageUrl: string | null; bootyCard?: undefined }

export interface SpecialCondition {
  cards?: string[]
  talents?: string[]
  events?: string[]
  customs?: CustomConditionSource[]
  description: JSX.Element
}

export function Hl({ children }: { children: React.ReactNode }): JSX.Element {
  return <span className={cxCardModal('card-modal__hint__highlighted')}>{children}</span>
}

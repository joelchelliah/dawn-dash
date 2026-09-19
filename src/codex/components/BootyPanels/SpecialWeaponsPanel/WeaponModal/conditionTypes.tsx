import { createCx } from '@/shared/utils/classnames'

import cardModalStyles from '../../shared/CardModal/index.module.scss'

const cxCardModal = createCx(cardModalStyles)

export interface CustomConditionSource {
  name: string
  type: string
  link: string
  imageUrl: string
}

export interface SpecialCondition {
  cards?: string[]
  talents?: string[]
  events?: string[]
  custom?: CustomConditionSource
  description: JSX.Element
}

export function Hl({ children }: { children: React.ReactNode }): JSX.Element {
  return <span className={cxCardModal('card-modal__hint__highlighted')}>{children}</span>
}

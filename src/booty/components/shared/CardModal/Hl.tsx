import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cxCardModal = createCx(styles)

export function Hl({ children }: { children: React.ReactNode }): JSX.Element {
  return <span className={cxCardModal('card-modal__hint__highlighted')}>{children}</span>
}

import { createCx } from '@/shared/utils/classnames'

import styles from './CardPill.module.scss'

const cx = createCx(styles)

interface CardPillProps {
  cardSet: string
}

function CardPill({ cardSet }: CardPillProps): JSX.Element | null {
  if (!cardSet) return null

  return <span className={cx('card-pill')}>{cardSet}</span>
}

export default CardPill

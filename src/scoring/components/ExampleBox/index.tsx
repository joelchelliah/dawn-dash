import { ReactNode } from 'react'

import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ExampleBoxProps {
  title?: string
  emoji?: string
  children: ReactNode
}

function ExampleBox({ title, emoji, children }: ExampleBoxProps): JSX.Element {
  return (
    <div className={cx('example-box')}>
      {emoji && (
        <div className={cx('emoji-badge')}>
          <span className={cx('emoji')}>{emoji}</span>
        </div>
      )}
      <div className={cx('content')}>
        {title && <p className={cx('title')}>{title}</p>}
        {children}
      </div>
    </div>
  )
}

export default ExampleBox

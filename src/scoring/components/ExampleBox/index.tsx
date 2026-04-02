import { ReactNode } from 'react'

import { createCx } from '@/shared/utils/classnames'

import { GameMode } from '@/scoring/types'

import styles from './index.module.scss'

const cx = createCx(styles)

interface ExampleBoxProps {
  emoji: string
  mode: GameMode
  children: ReactNode
}

function ExampleBox({ emoji, mode, children }: ExampleBoxProps): JSX.Element {
  return (
    <div className={cx('example-box', `example-box--${mode}`)}>
      {emoji && (
        <div className={cx('emoji-badge', `emoji-badge--${mode}`)}>
          <span className={cx('emoji')}>{emoji}</span>
        </div>
      )}
      <div className={cx('content')}>{children}</div>
    </div>
  )
}

export default ExampleBox

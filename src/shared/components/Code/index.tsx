import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface CodeProps {
  children: React.ReactNode
  className?: string
  wrap?: false | 'mobile' | 'always'
}

function Code({ children, className, wrap = false }: CodeProps): JSX.Element {
  return (
    <code
      className={cx(
        'code',
        wrap === 'always' && 'wrapAlways',
        wrap === 'mobile' && 'wrapMobile',
        className
      )}
    >
      {children}
    </code>
  )
}

export default Code

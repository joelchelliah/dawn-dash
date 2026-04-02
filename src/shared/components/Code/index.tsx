import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface CodeProps {
  children: React.ReactNode
  className?: string
}

function Code({ children, className }: CodeProps): JSX.Element {
  return <code className={cx('code', className)}>{children}</code>
}

export default Code

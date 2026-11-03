import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface IconFilterLabelProps {
  icon: string
  alt: string
  // Class icons have more margin in their artwork, so they're drawn a little larger
  isClass?: boolean
  children: React.ReactNode
}

function IconFilterLabel({ icon, alt, isClass = false, children }: IconFilterLabelProps) {
  return (
    <span className={cx('filter-label')}>
      <Image
        src={icon}
        alt={alt}
        width={24}
        height={24}
        className={cx('filter-icon', { 'filter-icon--class': isClass })}
      />
      {children}
    </span>
  )
}

export default IconFilterLabel

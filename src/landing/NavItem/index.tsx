import Link from 'next/link'

import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

interface NavItemProps {
  url: string
  imageSrc: string
  alt: string
  mobileDescription: string
  onMouseEnter: () => void
  onMouseLeave: () => void
}

export default function NavItem({
  url,
  imageSrc,
  alt,
  mobileDescription,
  onMouseEnter,
  onMouseLeave,
}: NavItemProps) {
  return (
    <Link
      href={url}
      className={cx('nav-item')}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={cx('nav-item__image-wrapper')}>
        <Image src={imageSrc} alt={alt} fill className={cx('nav-item__image')} optimized />
      </div>
      <p className={cx('nav-item__description')}>{mobileDescription}</p>
    </Link>
  )
}

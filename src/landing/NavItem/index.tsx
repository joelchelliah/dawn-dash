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
  priority?: boolean
}

export default function NavItem({
  url,
  imageSrc,
  alt,
  mobileDescription,
  onMouseEnter,
  onMouseLeave,
  priority,
}: NavItemProps) {
  // Tells the browser what size the image will be rendered at different viewport widths.
  // This helps Next.js choose the appropriate image source from the srcset for optimal performance.
  // All values include ~30% slack to account for high-DPI displays and ensure images aren't too small.
  // Mobile (≤768px): 550px (actual max ~420px)
  // Tablet (≤1024px): 65vw (actual ~50vw for 2-column grid)
  // Desktop: 350px (actual ~270px for 4-column grid)
  const sizes = '(max-width: 768px) 550px, (max-width: 1024px) 65vw, 350px'

  return (
    <Link
      href={url}
      className={cx('nav-item')}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={cx('nav-item__image-wrapper')}>
        <Image
          src={imageSrc}
          alt={alt}
          fill
          sizes={sizes}
          className={cx('nav-item__image')}
          priority={priority}
          optimized
        />
      </div>
      <p className={cx('nav-item__description')}>{mobileDescription}</p>
    </Link>
  )
}

import Link from 'next/link'

import { createCx } from '@/shared/utils/classnames'
import Image from '@/shared/components/Image'

import styles from './index.module.scss'

const cx = createCx(styles)

interface CenteredImageProps {
  src: string
  alt: string
  width: number
  height: number
  renderedWidth?: number
  href?: string
}

function CenteredImage({
  src,
  alt,
  width,
  height,
  renderedWidth,
  href,
}: CenteredImageProps): JSX.Element {
  const imageElement = (
    <Image src={src} alt={alt} width={width} height={height} className={cx('centered-image')} />
  )

  if (href) {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cx('image-link')}
        style={{ maxWidth: renderedWidth }}
      >
        {imageElement}
      </Link>
    )
  }

  return (
    <div className={cx('image-wrapper')} style={{ maxWidth: renderedWidth }}>
      {imageElement}
    </div>
  )
}

export default CenteredImage

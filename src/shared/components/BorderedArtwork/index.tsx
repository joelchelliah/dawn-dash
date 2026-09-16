import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

// Full-strength border, i.e. the border color as-is.
const DEFAULT_BORDER_OPACITY = 100

export interface BorderedArtworkProps {
  src: string | null
  alt: string
  size: number
  sizeMobile?: number
  width?: number
  widthMobile?: number
  borderOpacity?: number
  onImageSrcError?: () => void
  className?: string
}

const BorderedArtwork = ({
  src,
  alt,
  size,
  sizeMobile,
  width,
  widthMobile,
  borderOpacity = DEFAULT_BORDER_OPACITY,
  onImageSrcError,
  className,
}: BorderedArtworkProps) => {
  const artworkClassName = `${cx('bordered-artwork')}${className ? ` ${className}` : ''}`
  const artworkWidth = width ?? size
  const artworkWidthMobile = widthMobile ?? (width === undefined ? (sizeMobile ?? size) : width)

  const artworkStyle = {
    '--artwork-size': `${size}px`,
    '--artwork-size-mobile': `${sizeMobile ?? size}px`,
    '--artwork-width': `${artworkWidth}px`,
    '--artwork-width-mobile': `${artworkWidthMobile}px`,
    '--border-opacity': `${borderOpacity}%`,
  } as React.CSSProperties

  if (!src) return <div className={artworkClassName} style={artworkStyle} />

  return (
    <Image
      className={artworkClassName}
      style={artworkStyle}
      src={src}
      alt={alt}
      width={artworkWidth}
      height={size}
      onError={onImageSrcError}
    />
  )
}

export default BorderedArtwork

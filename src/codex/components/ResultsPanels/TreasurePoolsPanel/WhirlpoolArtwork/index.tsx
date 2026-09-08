import Image from '@/shared/components/Image'
import { createCx } from '@/shared/utils/classnames'

import styles from './index.module.scss'

const cx = createCx(styles)

// Put this on whichever ancestor owns the hover
export const WHIRLPOOL_HOVER_TRIGGER = 'whirlpool-hoverable'

interface WhirlpoolArtworkProps {
  src: string
  alt: string
  size: number
  sizeMobile?: number
  color: string
  colorAccent: string
}

const WhirlpoolArtwork = ({
  src,
  alt,
  size,
  sizeMobile,
  color,
  colorAccent,
}: WhirlpoolArtworkProps) => {
  const style = {
    '--whirlpool-size': `${size}px`,
    '--whirlpool-size-mobile': `${sizeMobile ?? size}px`,
    '--whirlpool-color': color,
    '--whirlpool-color-accent': colorAccent,
  } as React.CSSProperties

  return (
    <div className={cx('whirlpool')} style={style}>
      <div className={cx('whirlpool__swirl-scaler', 'whirlpool__swirl-scaler--outer')}>
        <div className={cx('whirlpool__swirl', 'whirlpool__swirl--outer')} />
      </div>
      <div className={cx('whirlpool__swirl-scaler', 'whirlpool__swirl-scaler--inner')}>
        <div className={cx('whirlpool__swirl', 'whirlpool__swirl--inner')} />
      </div>
      <Image className={cx('whirlpool__artwork')} src={src} alt={alt} width={size} height={size} />
    </div>
  )
}

export default WhirlpoolArtwork

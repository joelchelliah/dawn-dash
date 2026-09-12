import Link from 'next/link'

import BorderedArtwork from '@/shared/components/BorderedArtwork'
import { createCx } from '@/shared/utils/classnames'
import { HOVER_TRIGGER } from '@/shared/utils/hoverTrigger'

import styles from './ArtworkLinkList.module.scss'

const cx = createCx(styles)

const ARTWORK_SIZE = 40
const ARTWORK_SIZE_MOBILE = 24
const ARTWORK_BORDER_OPACITY = 75

interface ArtworkLinkListProps {
  children: React.ReactNode
}

/*
 * Takes the rows as children rather than a data prop, because each list resolves its artwork
 * through a different hook — cards and talents via `useCardImageSrc`, events via
 * `useEventImageSrc` — and a hook can only run inside the item component itself.
 */
export function ArtworkLinkList({ children }: ArtworkLinkListProps): JSX.Element {
  return <div className={cx('artwork-link-list')}>{children}</div>
}

interface ArtworkLinkItemProps {
  name: string
  href: string
  isExternal: boolean
  src: string | null
  onImageSrcError?: () => void
}

export function ArtworkLinkItem({
  name,
  href,
  isExternal,
  src,
  onImageSrcError,
}: ArtworkLinkItemProps): JSX.Element {
  const itemClassName = cx('artwork-link-item', HOVER_TRIGGER)
  const LinkComponent = isExternal ? 'a' : Link

  return (
    <LinkComponent
      href={href}
      className={itemClassName}
      title={name}
      target="_blank"
      rel="noopener noreferrer"
    >
      <BorderedArtwork
        src={src}
        alt={name}
        size={ARTWORK_SIZE}
        sizeMobile={ARTWORK_SIZE_MOBILE}
        borderOpacity={ARTWORK_BORDER_OPACITY}
        onImageSrcError={onImageSrcError}
        className={cx('artwork-link-item__artwork')}
      />
      <div className={cx('artwork-link-item__text')}>
        <span className={cx('artwork-link-item__name')}>{name}</span>
      </div>
    </LinkComponent>
  )
}

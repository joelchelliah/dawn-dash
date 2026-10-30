import Link from 'next/link'

import BorderedArtwork from '@/shared/components/BorderedArtwork'
import { createCx } from '@/shared/utils/classnames'
import { HOVER_TRIGGER } from '@/shared/utils/hoverTrigger'

import styles from './index.module.scss'

const cx = createCx(styles)

const ARTWORK_SIZE = 40
const ARTWORK_SIZE_MOBILE = 32
const ARTWORK_BORDER_OPACITY = 75

const DEFAULT_LAYOUT = 'modal'

export type ArtworkLinkLayout =
  // 3 → 2 columns, the card modal's related-card and related-event lists
  | 'modal'
  // 5 → 4 → 3 → 2 columns, the full-width pool rows: treasure pools and the other-pools table
  | 'pool-table'
  // A single stacked column, for the weapons' special-condition cards sitting beside their description
  | 'stacked'

interface ArtworkLinkListProps {
  layout?: ArtworkLinkLayout
  // Drops the alternating row shading, for a list sitting inside a container that stripes its own rows.
  unshaded?: boolean
  children: React.ReactNode
}

/*
 * Takes the rows as children rather than a data prop, because each list resolves its artwork
 * through a different hook — cards and talents via `useCardImageSrc`, events via
 * `useEventImageSrc` — and a hook can only run inside the item component itself.
 */
export function ArtworkLinkList({
  layout = DEFAULT_LAYOUT,
  unshaded,
  children,
}: ArtworkLinkListProps): JSX.Element {
  const listClassName = cx('artwork-link-list', `artwork-link-list--${layout}`, {
    'artwork-link-list--unshaded': unshaded,
  })

  return <div className={listClassName}>{children}</div>
}

interface ArtworkLinkItemProps {
  name: string
  href: string
  isExternal: boolean
  src: string | null
  onImageSrcError?: () => void
  subtitles?: string[]
  onNavigate?: () => void
  // Square artwork edge in px; defaults to the `modal` layout's size.
  artworkSize?: number
  artworkSizeMobile?: number
}

export function ArtworkLinkItem({
  name,
  href,
  isExternal,
  src,
  onImageSrcError,
  subtitles = [],
  onNavigate,
  artworkSize = ARTWORK_SIZE,
  artworkSizeMobile = ARTWORK_SIZE_MOBILE,
}: ArtworkLinkItemProps): JSX.Element {
  const itemClassName = cx('artwork-link-item', HOVER_TRIGGER)
  const LinkComponent = isExternal ? 'a' : Link
  const title = subtitles.length > 0 ? `${name} (${subtitles.join(', ')})` : name

  // Left-click with no modifier only — anything else is the reader deliberately asking for a tab.
  const handleClick = onNavigate
    ? (event: React.MouseEvent) => {
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return
        }
        event.preventDefault()
        onNavigate()
      }
    : undefined

  return (
    <LinkComponent
      href={href}
      className={itemClassName}
      title={title}
      target={onNavigate ? undefined : '_blank'}
      rel="noopener noreferrer"
      onClick={handleClick}
    >
      <BorderedArtwork
        src={src}
        alt={name}
        size={artworkSize}
        sizeMobile={artworkSizeMobile}
        borderOpacity={ARTWORK_BORDER_OPACITY}
        onImageSrcError={onImageSrcError}
        className={cx('artwork-link-item__artwork')}
      />
      <div className={cx('artwork-link-item__text')}>
        <span className={cx('artwork-link-item__name')}>{name}</span>
        {subtitles.map((subtitle, index) => (
          <span key={`${subtitle}-${index}`} className={cx('artwork-link-item__subtitle')}>
            {subtitle}
          </span>
        ))}
      </div>
    </LinkComponent>
  )
}

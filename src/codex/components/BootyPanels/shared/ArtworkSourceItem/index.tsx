import { TALENT_ARTWORK_CATEGORY, useCardImageSrc } from '@/shared/hooks/useCardImageSrc'
import { BlightbaneCardUrl, BlightbaneTalentUrl } from '@/shared/utils/imageUrls'

import { useEventImageSrc } from '@/codex/hooks/useEventImageSrc'
import { normalizeEventNameForUrl } from '@/codex/hooks/useEventUrlParam'
import { getEventArtwork } from '@/codex/utils/treasureHelper'

import { ArtworkLinkItem } from '../ArtworkLinkList'

interface ArtworkSourceItemProps {
  name: string
  subtitles?: string[]
  artworkSize?: number
  artworkSizeMobile?: number
}

export function EventSourceItem({
  name,
  subtitles = ['Event'],
  artworkSize,
  artworkSizeMobile,
}: ArtworkSourceItemProps): JSX.Element {
  const { eventImageSrc, onImageSrcError } = useEventImageSrc(getEventArtwork(name))

  return (
    <ArtworkLinkItem
      name={name}
      href={`/eventmaps/${normalizeEventNameForUrl(name)}`}
      isExternal={false}
      src={eventImageSrc}
      onImageSrcError={onImageSrcError}
      subtitles={subtitles}
      artworkSize={artworkSize}
      artworkSizeMobile={artworkSizeMobile}
    />
  )
}

interface CardSourceItemProps extends ArtworkSourceItemProps {
  isTalent?: boolean
  category?: number
}

export function CardSourceItem({
  name,
  isTalent,
  category,
  subtitles,
  artworkSize,
  artworkSizeMobile,
}: CardSourceItemProps): JSX.Element {
  const { cardImageSrc, onImageSrcError } = useCardImageSrc(
    name,
    null,
    isTalent ? TALENT_ARTWORK_CATEGORY : category
  )

  return (
    <ArtworkLinkItem
      name={name}
      href={isTalent ? BlightbaneTalentUrl(name) : BlightbaneCardUrl(name)}
      isExternal
      src={cardImageSrc}
      onImageSrcError={onImageSrcError}
      subtitles={subtitles ?? [isTalent ? 'Talent' : 'Card']}
      artworkSize={artworkSize}
      artworkSizeMobile={artworkSizeMobile}
    />
  )
}

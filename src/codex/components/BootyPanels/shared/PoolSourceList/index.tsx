import { TALENT_ARTWORK_CATEGORY, useCardImageSrc } from '@/shared/hooks/useCardImageSrc'
import { capitalize } from '@/shared/utils/textHelper'

import { useEventImageSrc } from '@/codex/hooks/useEventImageSrc'
import { normalizeEventNameForUrl } from '@/codex/hooks/useEventUrlParam'
import { PoolReachedBy, TreasureSourceType } from '@/codex/types/treasures'
import { Event } from '@/codex/types/events'
import eventTrees from '@/codex/data/event-trees.json'

import { ArtworkLinkItem, ArtworkLinkLayout, ArtworkLinkList } from '../ArtworkLinkList'

const ARTWORK_SIZE = 40
const ARTWORK_SIZE_MOBILE = 32

const EVENT_ARTWORK_BY_NAME = new Map(
  (eventTrees as Event[]).map(({ name, artwork }) => [name, artwork])
)

const getBlightbaneUrl = (name: string, sourceType: TreasureSourceType) =>
  `https://www.blightbane.io/${sourceType === 'talent' ? 'talent' : 'card'}/${name.replaceAll(' ', '_')}`

interface PoolSourceListProps {
  sources: PoolReachedBy[]
  layout: ArtworkLinkLayout
  unshaded?: boolean
}

function PoolSourceList({ sources, layout, unshaded }: PoolSourceListProps): JSX.Element | null {
  if (sources.length === 0) return null

  return (
    <ArtworkLinkList layout={layout} unshaded={unshaded}>
      {sources.map((source) => (
        <PoolSourceItem key={`${source.name}-${source.sourceType}`} source={source} />
      ))}
    </ArtworkLinkList>
  )
}

function PoolSourceItem({ source }: { source: PoolReachedBy }): JSX.Element {
  const { name, sourceType } = source

  return sourceType === 'event' ? (
    <PoolEventItem name={name} />
  ) : (
    <PoolCardItem name={name} sourceType={sourceType} />
  )
}

function PoolEventItem({ name }: { name: string }): JSX.Element {
  const { eventImageSrc, onImageSrcError } = useEventImageSrc(EVENT_ARTWORK_BY_NAME.get(name) ?? '')

  return (
    <ArtworkLinkItem
      name={name}
      href={`/eventmaps/${normalizeEventNameForUrl(name)}`}
      isExternal={false}
      src={eventImageSrc}
      onImageSrcError={onImageSrcError}
      subtitles={['Event']}
      artworkSize={ARTWORK_SIZE}
      artworkSizeMobile={ARTWORK_SIZE_MOBILE}
    />
  )
}

function PoolCardItem({
  name,
  sourceType,
}: {
  name: string
  sourceType: TreasureSourceType
}): JSX.Element {
  const { cardImageSrc, onImageSrcError } = useCardImageSrc(
    name,
    null,
    sourceType === 'talent' ? TALENT_ARTWORK_CATEGORY : undefined
  )

  return (
    <ArtworkLinkItem
      name={name}
      href={getBlightbaneUrl(name, sourceType)}
      isExternal
      src={cardImageSrc}
      onImageSrcError={onImageSrcError}
      subtitles={[capitalize(sourceType)]}
      artworkSize={ARTWORK_SIZE}
      artworkSizeMobile={ARTWORK_SIZE_MOBILE}
    />
  )
}

export default PoolSourceList

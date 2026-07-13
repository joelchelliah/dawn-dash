import Head from 'next/head'

import { getTool } from '@/shared/config/toolRegistry'

import { ChoiceNode, DialogueNode, Event } from '@/codex/types/events'
import { useEventImageSrc } from '@/codex/hooks/useEventImageSrc'

const BASE_URL = 'https://www.dawn-dash.com'

interface EventmapHeadProps {
  event?: Event | null
  eventUrlParam?: string
}

export function EventmapHead({ event, eventUrlParam }: EventmapHeadProps = {}) {
  const isEventPage = !!event
  const eventName = event?.name || eventUrlParam?.replaceAll('_', ' ') || ''
  const eventDisplayText = getEventDisplayText(event, eventName)
  const { eventImageSrc } = useEventImageSrc(event?.artwork || '')
  const hasEventArtwork = !!event?.artwork && event.artwork.trim().length > 0

  const tool = getTool('eventmaps')
  if (!tool) return null

  const toolUrl = `${BASE_URL}${tool.path}`

  const ogTitle = isEventPage ? `🗺 Eventmap - ${eventName}` : tool.ogTitle
  const tabTitle = isEventPage ? `${eventName} | Eventmap | Dawn-Dash` : `${tool.title} | Dawn-Dash`
  const title = `Dawn-Dash: ${ogTitle}`

  const description = isEventPage
    ? `View the complete event tree for «${eventName}», with all branching paths.`
    : tool.metaDescription
  const ogDescription = isEventPage ? `${eventDisplayText}` : tool.ogDescription

  const image = hasEventArtwork ? eventImageSrc : tool.ogImage
  const url = isEventPage && eventUrlParam ? `${toolUrl}/${eventUrlParam}` : toolUrl
  const squareLogo = tool.logoImage

  return (
    <Head>
      <title>{tabTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content={hasEventArtwork ? '60' : '2400'} />
      <meta property="og:image:height" content={hasEventArtwork ? '60' : '1260'} />
      <meta property="og:image:alt" content={title} />
      <meta property="og:url" content={url} />

      {/* The url shown in Discord */}
      <meta property="og:site_name" content={`dawn-dash.com${tool.path}`} />

      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />

      {!hasEventArtwork && <meta name="twitter:card" content="summary_large_image" />}
      <meta property="twitter:image" content={image} />

      {/* Page-Specific Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: title,
            description,
            url,
            image: squareLogo,
          }),
        }}
      />

      {/* Breadcrumb Structured Data */}
      {isEventPage && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Dawn-Dash',
                  item: BASE_URL,
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: tool.title,
                  item: toolUrl,
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: eventName,
                  item: url,
                },
              ],
            }),
          }}
        />
      )}
    </Head>
  )
}

function getEventDisplayText(event: Event | null | undefined, eventName: string): string {
  const fallbackText = `Explore the complete event tree for «${eventName}»!`
  const maxLength = 120

  if (!event) return fallbackText

  let eventText = ''

  if ('text' in event.rootNode) {
    eventText = (event.rootNode as DialogueNode).text || ''
  } else if ('choiceLabel' in event.rootNode) {
    eventText = (event.rootNode as ChoiceNode).choiceLabel || ''
  }

  if (eventText.length === 0) return fallbackText

  return eventText.length > maxLength ? eventText.substring(0, maxLength - 4) + '...' : eventText
}

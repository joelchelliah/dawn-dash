import Head from 'next/head'

import { ChoiceNode, DialogueNode, Event } from '@/codex/types/events'
import { useEventImageSrc } from '@/codex/hooks/useEventImageSrc'

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

  const ogTitle = isEventPage ? `🗺 Eventmap - ${eventName}` : '🗺 Eventmaps'
  const title = `Dawn-Dash: ${ogTitle}`

  const description = isEventPage
    ? `View the complete event tree for «${eventName}», with all branching paths.`
    : 'Interactive Dawncaster events codex, with fully mapped out branches and options, to help you get the best outcome from each event!'
  const ogDescription = isEventPage
    ? `${eventDisplayText}`
    : 'Explore all Dawncaster events, as fully mapped out event trees, including all dialogue options, requirements and rewards!'

  const image = hasEventArtwork ? eventImageSrc : 'https://www.dawn-dash.com/og-image-eventmaps.png'
  const url =
    isEventPage && eventUrlParam
      ? `https://www.dawn-dash.com/eventmaps/${eventUrlParam}`
      : 'https://www.dawn-dash.com/eventmaps'
  const squareLogo = 'https://www.dawn-dash.com/logo-eventmaps.png'

  return (
    <Head>
      <title>{title}</title>
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
      <meta property="og:site_name" content="dawn-dash.com/eventmaps" />

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
                  item: 'https://www.dawn-dash.com',
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Eventmaps',
                  item: 'https://www.dawn-dash.com/eventmaps',
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

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

  const title = isEventPage ? `Dawn-Dash : Eventmap of «${eventName}»` : 'Dawn-Dash : Eventmaps'

  const description = isEventPage
    ? `View the complete event tree for «${eventName}», with all branching paths.`
    : 'Interactive Dawncaster events codex, with fully mapped out branches and options, to help you get the best outcome from each event!'

  const ogDescription = isEventPage
    ? `${eventDisplayText}`
    : 'Explore all Dawncaster events, as fully mapped out event trees, including all dialogue options, requirements and rewards!'

  // TODO: Update this once the Eventmaps is ready
  const ogImageWide = 'https://www.dawn-dash.com/og-image-eventmaps.png'
  const url =
    isEventPage && eventUrlParam
      ? `https://www.dawn-dash.com/eventmaps/${eventUrlParam}`
      : 'https://www.dawn-dash.com/eventmaps'
  const squareLogo = 'https://www.dawn-dash.com/logo-eventmaps.png'

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      {/* TODO: Remove this once the Eventmaps is ready */}
      <meta name="robots" content="noindex, nofollow" />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={ogDescription} />
      {/* If event artwork exists: use small event image for og:image (Discord shows small preview) */}
      {/* If no event artwork: use wide OG logo here and also for twitter:image (Discord shows wide format) */}
      <meta property="og:image" content={hasEventArtwork ? eventImageSrc : ogImageWide} />
      <meta property="og:url" content={url} />

      {/* The url shown in Discord */}
      <meta property="og:site_name" content="dawn-dash.com/eventmaps" />

      {/* Only set when no event artwork to show the wide OG logo */}
      {!hasEventArtwork && <meta property="twitter:image" content={ogImageWide} />}

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
    </Head>
  )
}

function getEventDisplayText(event: Event | null | undefined, eventName: string): string {
  const fallbackText = `Explore the complete event tree for «${eventName}»!`

  if (!event) return fallbackText

  let eventText = ''

  if ('text' in event.rootNode) {
    eventText = (event.rootNode as DialogueNode).text || ''
  } else if ('choiceLabel' in event.rootNode) {
    eventText = (event.rootNode as ChoiceNode).choiceLabel || ''
  }

  if (eventText.length === 0) return fallbackText

  return eventText.length > 75 ? eventText.substring(0, 72) + '...' : eventText
}

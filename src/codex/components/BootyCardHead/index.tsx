import Head from 'next/head'

import { getCardImageSrc } from '@/shared/hooks/useCardImageSrc'
import { getTool } from '@/shared/config/toolRegistry'

import { BootyCard } from '@/codex/utils/bootyCardUrl'
import { getCardSubtitle } from '@/codex/components/BootyPanels/shared/CardModal'

const BASE_URL = 'https://www.dawn-dash.com'
interface BootyCardHeadProps {
  card: BootyCard | null
  cardUrlParam: string
}

export function BootyCardHead({ card, cardUrlParam }: BootyCardHeadProps): JSX.Element | null {
  const isCardPage = !!card
  const cardName = card?.name || cardUrlParam.replaceAll('_', ' ')

  const cardArtwork = card ? getCardImageSrc(card.name, null) : null
  const hasCardArtwork = !!cardArtwork

  const tool = getTool('booty')
  if (!tool) return null

  const toolUrl = `${BASE_URL}${tool.path}`

  const ogTitle = isCardPage ? `🪎 Booty - ${cardName}` : tool.ogTitle
  const tabTitle = isCardPage ? `${cardName} | Booty | Dawn-Dash` : `${tool.title} | Dawn-Dash`
  const title = `Dawn-Dash: ${ogTitle}`

  const description = isCardPage
    ? `See every way of acquiring «${cardName}» in Dawncaster, through cards, talents and events.`
    : tool.description
  const ogDescription = isCardPage ? getCardDisplayText(card) : tool.ogDescription

  const image = hasCardArtwork ? cardArtwork : tool.ogImage
  const url = isCardPage && cardUrlParam ? `${toolUrl}/${cardUrlParam}` : toolUrl

  return (
    <Head>
      <title>{tabTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content={hasCardArtwork ? '60' : '2400'} />
      <meta property="og:image:height" content={hasCardArtwork ? '60' : '1260'} />
      <meta property="og:image:alt" content={title} />
      <meta property="og:url" content={url} />

      {/* The url shown in Discord */}
      <meta property="og:site_name" content={`dawn-dash.com${tool.path}`} />

      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />

      {!hasCardArtwork && <meta name="twitter:card" content="summary_large_image" />}
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
            image: tool.logoImage,
          }),
        }}
      />

      {/* Breadcrumb Structured Data */}
      {isCardPage && (
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
                  name: cardName,
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

function getCardDisplayText(card: BootyCard): string {
  const kind = card.kind === 'treasure' ? '«Treasure»' : '«Special Weapon»'

  return `${kind} - Every way of acquiring this ${getCardSubtitle(card, card.rarity)}`
}

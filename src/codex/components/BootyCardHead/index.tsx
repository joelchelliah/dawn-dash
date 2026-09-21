import Head from 'next/head'

import { getCardImageSrc } from '@/shared/hooks/useCardImageSrc'
import { joinWithAnd } from '@/shared/utils/lists'
import { getTool } from '@/shared/config/toolRegistry'

import { BootyCard } from '@/codex/utils/bootyCardUrl'
import { getCardSubtitle } from '@/codex/components/BootyPanels/shared/CardModal'
import { TreasureCard } from '@/codex/types/treasures'
import { SpecialWeapon } from '@/codex/types/weapons'
import treasureCardsData from '@/codex/data/treasure-cards.json'
import specialWeaponsData from '@/codex/data/special-weapons.json'
import { hasSpecialCondition } from '@/codex/utils/weaponHelper'

const BASE_URL = 'https://www.dawn-dash.com'
interface BootyCardHeadProps {
  card: BootyCard | null
  cardUrlParam: string
}

const treasures = treasureCardsData as TreasureCard[]
const weapons = specialWeaponsData as SpecialWeapon[]

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

const FALLBACK_SUBTITLE = 'Mysteriously Unknown Artifact'

function getCardDisplayText(card: BootyCard): string {
  const isTreasure = card.kind === 'treasure'
  const kind = isTreasure ? 'Treasure' : 'Special Weapon'

  const acquisitionMethods = isTreasure
    ? getTreasureAcquisitionMethods(treasures.find(({ name }) => name === card.name))
    : getSpecialWeaponAcquisitionMethods(weapons.find(({ name }) => name === card.name))
  const acquisitionString = acquisitionMethods
    ? `Can be acquired through ${acquisitionMethods}`
    : ''

  const subtitle = getCardSubtitle(card, card.rarity) || FALLBACK_SUBTITLE

  return `[${kind}] : ${subtitle}! ${acquisitionString}`.trim()
}

function getTreasureAcquisitionMethods(card?: TreasureCard): string | undefined {
  if (!card) return undefined

  const methods = [
    card.inCardRewards && 'combat rewards',
    card.inMerchant && 'merchant',
    card.inAlchemist && 'alchemist',
    (card.fromTrade || card.fromTranspose) && 'transmutes',
    card.fromCards.length > 0 && 'cards',
    card.fromTalents.length > 0 && 'talents',
    card.fromEvents.length > 0 && 'events',
  ].filter((method): method is string => Boolean(method))

  return joinWithAnd(methods)
}

function getSpecialWeaponAcquisitionMethods(card?: SpecialWeapon): string | undefined {
  if (!card) return undefined

  const methods = [
    card.fromCards.length > 0 && 'cards',
    card.fromTalents.length > 0 && 'talents',
    card.fromEvents.length > 0 && 'events',
    hasSpecialCondition(card.name) && 'fulfilling a special condition',
  ].filter((method): method is string => Boolean(method))

  return joinWithAnd(methods)
}

import { useState, useEffect } from 'react'

import { CardArtworkImageUrl, PestilenceDecreeUrl } from '@/shared/utils/imageUrls'
import cardArtworkData from '@/shared/data/card-artwork.json'

interface ArtworkEntry {
  name: string
  artwork: string | null
  category: number | null
}

export const TALENT_ARTWORK_CATEGORY = 10

/*
 * Two lookups over the same data, both built once at import:
 *
 * - `artworkByNameAndCategory` disambiguates names that mean different things to each tool.
 *
 * Keys must match the JSON verbatim — artwork names carry curly apostrophes and typos
 * (e.g. "Thyphon’s cunning_eclypse-miniset"), so never normalize either side of the lookup.
 *
 * Null artworks are filtered out before either map is built, so they can never shadow a
 * populated sibling.
 */
const artworkByNameAndCategory = new Map<string, string>()
const artworkByName = new Map<string, string>()

for (const entry of cardArtworkData as ArtworkEntry[]) {
  if (!entry.artwork) continue

  const categoryKey = `${entry.name}|${entry.category}`
  if (!artworkByNameAndCategory.has(categoryKey)) {
    artworkByNameAndCategory.set(categoryKey, entry.artwork)
  }
  if (!artworkByName.has(entry.name)) artworkByName.set(entry.name, entry.artwork)
}

/**
 * Resolves a card or talent name to its Blightbane artwork URL via `card-artwork.json`.
 *
 * Pass the item's `category` to disambiguate names that carry different artwork per category.
 * Falls back to a name-only lookup when the name has no entry in that category, then to `fallbackImageSrc`.
 */
export function getCardImageSrc(
  cardName: string,
  fallbackImageSrc: string | null = PestilenceDecreeUrl,
  category?: number
): string | null {
  const artwork =
    (category === undefined
      ? undefined
      : artworkByNameAndCategory.get(`${cardName}|${category}`)) ?? artworkByName.get(cardName)

  return artwork ? CardArtworkImageUrl(artwork) : fallbackImageSrc
}

/**
 * Resolves a card name to its Blightbane artwork URL via `card-artwork.json`.
 *
 * `fallbackImageSrc` is used when the name doesn't resolve, and on a failed request. Pass the
 * card's `category` to disambiguate names whose artwork differs per category.
 *
 * Misses can only be detected at the mapping level: blightbane.io serves a valid placeholder webp
 * (HTTP 200) for non-existent icons, so `onImageSrcError` never fires for a wrong artwork value.
 */
export function useCardImageSrc(
  cardName: string,
  fallbackImageSrc: string | null = PestilenceDecreeUrl,
  category?: number
): {
  cardImageSrc: string | null
  onImageSrcError: () => void
} {
  const [cardImageSrc, setCardImageSrc] = useState<string | null>(() =>
    getCardImageSrc(cardName, fallbackImageSrc, category)
  )

  const onImageSrcError = () => {
    setCardImageSrc(fallbackImageSrc)
  }

  useEffect(() => {
    setCardImageSrc(getCardImageSrc(cardName, fallbackImageSrc, category))
  }, [cardName, fallbackImageSrc, category])

  return { cardImageSrc, onImageSrcError }
}

import { useState, useEffect } from 'react'

import { CardArtworkImageUrl, PestilenceDecreeUrl } from '@/shared/utils/imageUrls'
import cardArtworkData from '@/shared/data/card-artwork.json'

// Keys must match the JSON verbatim — artwork names carry curly apostrophes and typos
// (e.g. "Thyphon’s cunning_eclypse-miniset"), so never normalize either side of the lookup.
//
// First entry wins: 26 names appear twice with different artwork, so a plain `new Map(entries)`
// would keep the last and silently swap those cards' art.
const artworkByCardName = (cardArtworkData as Array<{ name: string; artwork: string | null }>)
  .filter((entry): entry is { name: string; artwork: string } => Boolean(entry.artwork))
  .reduce((map, entry) => {
    if (!map.has(entry.name)) map.set(entry.name, entry.artwork)
    return map
  }, new Map<string, string>())

/**
 * Resolves a card name to its Blightbane artwork URL via `card-artwork.json`.
 *
 * `fallbackImageSrc` is used when the name doesn't resolve, and on a failed request.
 *
 * Misses can only be detected at the mapping level: blightbane.io serves a valid placeholder webp
 * (HTTP 200) for non-existent icons, so `onImageSrcError` never fires for a wrong artwork value.
 */
export function useCardImageSrc(
  cardName: string,
  fallbackImageSrc: string | null = PestilenceDecreeUrl
): {
  cardImageSrc: string | null
  onImageSrcError: () => void
} {
  const [cardImageSrc, setCardImageSrc] = useState<string | null>(() => {
    const artwork = artworkByCardName.get(cardName)

    return artwork ? CardArtworkImageUrl(artwork) : fallbackImageSrc
  })

  const onImageSrcError = () => {
    setCardImageSrc(fallbackImageSrc)
  }

  useEffect(() => {
    const artwork = artworkByCardName.get(cardName)
    setCardImageSrc(artwork ? CardArtworkImageUrl(artwork) : fallbackImageSrc)
  }, [cardName, fallbackImageSrc])

  return { cardImageSrc, onImageSrcError }
}

import { useState, useEffect } from 'react'

import { CardArtworkImageUrl, PestilenceDecreeUrl } from '@/shared/utils/imageUrls'
import cardArtworkData from '@/shared/data/card-artwork.json'

// Keys must match the JSON verbatim — some artwork names carry curly apostrophes and typos
// (e.g. "Thyphon’s cunning_eclypse-miniset"), so never normalize either side of the lookup.
//
// **First entry wins.** 26 card names appear twice in the JSON with *different* artwork (e.g.
// "Bulwark" → `abilityart_1_59` and `cardart_5_23`), so insertion order is load-bearing: a plain
// `new Map(entries)` would keep the *last* and silently swap those cards' art. This preserves the
// behaviour of the linear `.find` this replaced.
const artworkByCardName = (cardArtworkData as Array<{ name: string; artwork: string | null }>)
  .filter((entry): entry is { name: string; artwork: string } => Boolean(entry.artwork))
  .reduce((map, entry) => {
    if (!map.has(entry.name)) map.set(entry.name, entry.artwork)
    return map
  }, new Map<string, string>())

/**
 * Resolves a card name to its Blightbane artwork URL via `card-artwork.json`.
 *
 * `fallbackImageSrc` is what the hook returns when the name doesn't resolve (absent from the
 * mapping, or mapped to `artwork: null`), and what `onImageSrcError` swaps to on a failed request.

 * Note: blightbane.io serves a valid placeholder webp (HTTP 200) for non-existent icons, so a
 * wrong artwork value can never surface through `onImageSrcError`. All miss detection happens at
 * the mapping level above.
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

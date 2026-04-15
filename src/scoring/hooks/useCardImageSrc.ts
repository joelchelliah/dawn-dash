import { useState, useEffect } from 'react'

import { CardArtworkImageUrl, PestilenceDecreeUrl } from '@/shared/utils/imageUrls'
import cardArtworkData from '@/shared/data/card-artwork.json'

export function useCardImageSrc(cardName: string): {
  cardImageSrc: string | null
  onImageSrcError: () => void
} {
  const defaultImageSrc = PestilenceDecreeUrl
  const [cardImageSrc, setCardImageSrc] = useState<string | null>(() => {
    const artwork = getArtworkForCard(cardName)

    return artwork ? CardArtworkImageUrl(artwork) : defaultImageSrc
  })

  const onImageSrcError = () => {
    setCardImageSrc(defaultImageSrc)
  }

  useEffect(() => {
    const artwork = getArtworkForCard(cardName)
    setCardImageSrc(artwork ? CardArtworkImageUrl(artwork) : defaultImageSrc)
  }, [cardName])

  return { cardImageSrc, onImageSrcError }
}

const getArtworkForCard = (name: string): string | null => {
  const artworkEntry = (cardArtworkData as Array<{ name: string; artwork: string | null }>).find(
    (entry) => entry.name === name
  )
  return artworkEntry?.artwork || null
}

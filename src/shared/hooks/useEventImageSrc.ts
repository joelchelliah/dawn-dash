import { useState, useEffect } from 'react'

import { ChestImageUrl, EventArtworkImageUrl } from '@/shared/utils/imageUrls'

// Fetches the event image src and provides a fallback if the image fails to load
export function useEventImageSrc(artwork: string): {
  eventImageSrc: string
  onImageSrcError: () => void
} {
  const [eventImageSrc, setEventImageSrc] = useState(
    artwork && artwork.trim() ? EventArtworkImageUrl(artwork) : ChestImageUrl
  )

  const onImageSrcError = () => {
    setEventImageSrc(ChestImageUrl)
  }

  useEffect(() => {
    setEventImageSrc(artwork && artwork.trim() ? EventArtworkImageUrl(artwork) : ChestImageUrl)
  }, [artwork])

  return { eventImageSrc, onImageSrcError }
}

import { BlightbaneCardByIdUrl, BlightbaneCardUrl } from '@/shared/utils/imageUrls'
import { CardData } from '@/shared/types/cards'

export const getBlightbaneCardUrl = (card: CardData) =>
  card.hasDuplicateName ? BlightbaneCardByIdUrl(card.blightbane_id) : BlightbaneCardUrl(card.name)

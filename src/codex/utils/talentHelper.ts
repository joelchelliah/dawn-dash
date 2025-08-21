import {
  DexImageUrl,
  HealthImageUrl,
  HolyImageUrl,
  IntImageUrl,
  StrImageUrl,
} from '@/shared/utils/imageUrls'

import { TalentTreeTalentNode } from '../types/talents'

export const parseTalentDescriptionLine = (line: string) => {
  const parsedDescription = line
    .replace(/<br\s*\/?>/g, '<br />') // Normalize <br> tags
    .replace(/\[\[/g, '[') // Replace [[ with [
    .replace(/\]\]/g, ']') // Replace ]] with ]
    .replace(/\(\[/g, '(') // Replace ([ with (
    .replace(/\(\{/g, '(') // Replace ({ with (
    .replace(/\]\)/g, ')') // Replace ]) with )
    .replace(/\}\)/g, ')') // Replace }) with )
    .trim()

  const segments: Array<{ type: 'text' | 'image'; content: string; icon?: string }> = []
  const keywords = [
    { keyword: 'HEALTH', icon: HealthImageUrl },
    { keyword: 'HOLY', icon: HolyImageUrl },
    { keyword: 'STR', icon: StrImageUrl },
    { keyword: 'INT', icon: IntImageUrl },
    { keyword: 'DEX', icon: DexImageUrl },
  ]

  let remainingText = parsedDescription

  keywords.forEach(({ keyword, icon }) => {
    const parts = remainingText.split(keyword)
    if (parts.length > 1) {
      const newSegments: typeof segments = []

      parts.forEach((part, index) => {
        if (part) {
          newSegments.push({ type: 'text', content: part })
        }
        if (index < parts.length - 1) {
          newSegments.push({ type: 'image', content: keyword, icon })
        }
      })

      remainingText = newSegments.map((s) => s.content).join('')
      segments.push(...newSegments)
    }
  })

  if (segments.length === 0) {
    return [{ type: 'text', content: parsedDescription }]
  }

  return segments
}

export const isOffer = (talent: TalentTreeTalentNode) =>
  hasMonsterExpansion(talent) && hasOfferPrefix(talent)

export const isEventBasedTalent = (talent: TalentTreeTalentNode) =>
  hasMonsterExpansion(talent) && !hasOfferPrefix(talent)

const hasMonsterExpansion = (talent: TalentTreeTalentNode) => talent.expansion === 0

const hasOfferPrefix = (talent: TalentTreeTalentNode) => talent.name.startsWith('Offer of')

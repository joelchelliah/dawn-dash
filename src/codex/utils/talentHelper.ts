import {
  ArcanistImageUrl,
  CoinsOfPassingImageUrl,
  DexImageUrl,
  ChestImageUrl,
  HealthImageUrl,
  HolyImageUrl,
  HunterImageUrl,
  InfernalContractUrl,
  IntImageUrl,
  KnightImageUrl,
  NeutralImageUrl,
  RogueImageUrl,
  SeekerImageUrl,
  StrImageUrl,
  SunforgeImageUrl,
  WarriorImageUrl,
  DarkRevenanceImageUrl,
  TaurusRageImageUrl,
  SacredTomeImageUrl,
  RuneOfPersistenceImageUrl,
} from '@/shared/utils/imageUrls'
import { CharacterClass } from '@/shared/types/characterClass'
import { ClassColorVariant, darken, getClassColor } from '@/shared/utils/classColors'

import {
  HierarchicalTalentTreeNode,
  TalentTreeNodeType,
  TalentTreeTalentNode,
} from '../types/talents'
import { TALENTS_OBTAINED_FROM_CARDS } from '../constants/talentsMappingValues'

const ICON_KEYWORDS_TO_URL = [
  { keyword: 'HEALTH', icon: HealthImageUrl },
  { keyword: 'HOLY', icon: HolyImageUrl },
  { keyword: 'STR', icon: StrImageUrl },
  { keyword: 'INT', icon: IntImageUrl },
  { keyword: 'DEX', icon: DexImageUrl },
  { keyword: 'NEUTRAL', icon: NeutralImageUrl },
]

const KEYWORD_TO_EMOJI_MAP: Record<string, string> = {
  HEALTH: ' ❤️',
  HOLY: ' 🟡',
  STR: ' 🔴',
  INT: ' 🔵',
  DEX: ' 🟢',
  NEUTRAL: ' ⚪',
  '\\(BLOOD\\)': '',
}

const colorGrey = getClassColor(CharacterClass.Neutral, ClassColorVariant.Default)
const colorRed = getClassColor(CharacterClass.Warrior, ClassColorVariant.Default)
const colorGreen = getClassColor(CharacterClass.Rogue, ClassColorVariant.Default)
const colorBlue = getClassColor(CharacterClass.Arcanist, ClassColorVariant.Default)
const colorHoly = getClassColor(CharacterClass.Sunforge, ClassColorVariant.Default)
const colorOffers = darken(getClassColor(CharacterClass.Warrior, ClassColorVariant.Default), 10)
const colorEvents = darken(getClassColor(CharacterClass.Seeker, ClassColorVariant.Default), 10)
const colorCards = darken(getClassColor(CharacterClass.Sunforge, ClassColorVariant.Light), 10)

export const getTalentRequirementIconProps = (
  type: TalentTreeNodeType,
  label: string
): { count: number; url: string; url2?: string; url3?: string; color: string; label: string } => {
  if (type === TalentTreeNodeType.CLASS_REQUIREMENT) {
    const color = getClassColor(label as CharacterClass, ClassColorVariant.Dark)

    switch (label) {
      case CharacterClass.Arcanist:
        return { count: 1, url: ArcanistImageUrl, color, label }
      case CharacterClass.Hunter:
        return { count: 1, url: HunterImageUrl, color, label }
      case CharacterClass.Knight:
        return { count: 1, url: KnightImageUrl, color, label }
      case CharacterClass.Rogue:
        return { count: 1, url: RogueImageUrl, color, label }
      case CharacterClass.Seeker:
        return { count: 1, url: SeekerImageUrl, color, label }
      case CharacterClass.Warrior:
        return { count: 1, url: WarriorImageUrl, color, label }
      default:
        return { count: 1, url: SunforgeImageUrl, color, label }
    }
  }

  switch (label) {
    case 'DEX':
      return { count: 1, url: DexImageUrl, color: colorGreen, label: 'DEX' }
    case 'DEX2':
      return { count: 2, url: DexImageUrl, color: colorGreen, label: '2 DEX' }
    case 'DEX3':
      return { count: 3, url: DexImageUrl, color: colorGreen, label: '3 DEX' }
    case 'INT':
      return { count: 1, url: IntImageUrl, color: colorBlue, label: 'INT' }
    case 'INT2':
      return { count: 2, url: IntImageUrl, color: colorBlue, label: '2 INT' }
    case 'INT3':
      return { count: 3, url: IntImageUrl, color: colorBlue, label: '3 INT' }
    case 'STR':
      return { count: 1, url: StrImageUrl, color: colorRed, label: 'STR' }
    case 'STR2':
      return { count: 2, url: StrImageUrl, color: colorRed, label: '2 STR' }
    case 'STR3':
      return { count: 3, url: StrImageUrl, color: colorRed, label: '3 STR' }
    case 'HOLY':
      return { count: 1, url: HolyImageUrl, color: colorHoly, label: 'HOLY' }
    case 'Offers':
      return { count: 1, url: InfernalContractUrl, color: colorOffers, label: 'Offers' }
    case 'Events':
    case 'Obtained from events':
      return {
        count: 1,
        url: CoinsOfPassingImageUrl,
        color: colorEvents,
        label: 'Obtained from events',
      }
    case 'Cards':
    case 'Obtained from cards':
      return {
        count: 1,
        url: RuneOfPersistenceImageUrl,
        color: colorCards,
        label: 'Obtained from cards',
      }
    case 'No Requirements':
      return { count: 1, url: NeutralImageUrl, color: colorGrey, label: 'No requirements' }
    case 'Sacred Tome':
      return { count: 1, url: SacredTomeImageUrl, color: colorCards, label }
    case 'Taurus Rage':
      return { count: 1, url: TaurusRageImageUrl, color: colorCards, label }
    case 'Dark Revenance':
      return { count: 1, url: DarkRevenanceImageUrl, color: colorCards, label }
    default:
      return { count: 1, url: ChestImageUrl, color: colorEvents, label }
  }
}

export const getLinkColor = (
  link: d3.HierarchyPointLink<HierarchicalTalentTreeNode>,
  name: string,
  type: TalentTreeNodeType | undefined
): string => {
  const colorGrey = darken(getClassColor(CharacterClass.Neutral, ClassColorVariant.Darkest), 15)

  if (type === TalentTreeNodeType.CLASS_REQUIREMENT) {
    return getClassColor(name as CharacterClass, ClassColorVariant.Dark)
  } else if (type === TalentTreeNodeType.TALENT) {
    let currentNode = link.source
    while (currentNode.parent && currentNode.data.type === TalentTreeNodeType.TALENT) {
      currentNode = currentNode.parent
    }
    return getLinkColor(link, currentNode.data.name, currentNode.data.type)
  } else if (type === TalentTreeNodeType.EVENT_REQUIREMENT) {
    return colorEvents
  } else if (type === TalentTreeNodeType.CARD_REQUIREMENT) {
    return colorCards
  } else {
    const tinyDarken = (color: string) => darken(color, 10)
    switch (name) {
      case 'DEX':
      case 'DEX2':
        return tinyDarken(colorGreen)
      case 'INT':
      case 'INT2':
        return tinyDarken(colorBlue)
      case 'STR':
      case 'STR2':
      case 'STR3':
        return tinyDarken(colorRed)
      case 'Offers':
        return tinyDarken(colorOffers)
      case 'Events':
        return tinyDarken(colorEvents)
      default:
        return colorGrey
    }
  }
}

export const parseTalentDescriptionLineForDesktopRendering = (line: string) => {
  const parsedDescription = line
    .replace(/<br\s*\/?>/g, '<br />') // Normalize <br> tags
    .replace(/\[\[/g, '[') // Replace [[ with [
    .replace(/\]\]/g, ']') // Replace ]] with ]
    .replace(/\(\[/g, '(') // Replace ([ with (
    .replace(/\(\{/g, '(') // Replace ({ with (
    .replace(/\]\)/g, ')') // Replace ]) with )
    .replace(/\}\)/g, ')') // Replace }) with )
    .trim()

  const keywordPattern = new RegExp(
    `(${ICON_KEYWORDS_TO_URL.map((k) => k.keyword).join('|')})`,
    'g'
  )
  const segments: Array<{ type: 'text' | 'image'; content: string; icon?: string }> = []

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = keywordPattern.exec(parsedDescription)) !== null) {
    // 1. Add text before the keyword if any
    if (match.index > lastIndex) {
      const textContent = parsedDescription.slice(lastIndex, match.index)
      if (textContent) {
        segments.push({ type: 'text', content: textContent })
      }
    }

    // 2. Add the keyword as an image segment
    const keyword = match[1]
    const keywordData = ICON_KEYWORDS_TO_URL.find((k) => k.keyword === keyword)
    if (keywordData) {
      segments.push({ type: 'image', content: keyword, icon: keywordData.icon })
    }

    lastIndex = keywordPattern.lastIndex
  }

  // 3. Add remaining text after the last keyword
  if (lastIndex < parsedDescription.length) {
    const remainingContent = parsedDescription.slice(lastIndex)
    if (remainingContent) {
      segments.push({ type: 'text', content: remainingContent })
    }
  }

  // Return at least one text segment if no keywords were found
  return segments.length > 0 ? segments : [{ type: 'text', content: parsedDescription }]
}

export const parseTalentDescriptionLineForMobileRendering = (line: string): string => {
  let result = line
    .replace(/<br\s*\/?>/g, '') // Remove <br> tags
    .replace(/<\/?[bB]>/g, '') // Remove <b> tags
    .replace(/<\/?nobr>/g, '') // Remove <nobr> tags
    .replace(/\[\[/g, '[') // Replace [[ with [
    .replace(/\]\]/g, ']') // Replace ]] with ]
    .replace(/\(\[/g, '(') // Replace ([ with (
    .replace(/\(\{/g, '(') // Replace ({ with (
    .replace(/\]\)/g, ')') // Replace ]) with )
    .replace(/\}\)/g, ')') // Replace }) with )
    .trim()

  Object.entries(KEYWORD_TO_EMOJI_MAP).forEach(([keyword, emoji]) => {
    result = result.replace(new RegExp(keyword, 'g'), emoji)
  })
  return result
}

export const wrapText = (text: string, width: number, fontSize: number) => {
  const approxCharacterWidth = fontSize * 0.61
  const words = text.split(' ')
  const lines: string[] = [''] // Start with an empty line for slight padding
  let currentLine = words[0]

  for (let i = 1; i < words.length; i++) {
    const word = words[i]
    const testLine = currentLine + ' ' + word
    const testWidth = countRelevantCharactersForLineWidth(testLine) * approxCharacterWidth

    if (testWidth > width) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  lines.push(currentLine)
  return lines
}

export const getMatchingKeywordsText = (
  talent: HierarchicalTalentTreeNode,
  parsedKeywords: string[]
) => {
  const matches = parsedKeywords.filter(
    (keyword) =>
      talent.name.toLowerCase().includes(keyword.toLowerCase()) ||
      talent.description.toLowerCase().includes(keyword.toLowerCase())
  )
  return matches.length > 0 ? `{ ${matches.join(', ')} }` : ''
}

const countRelevantCharactersForLineWidth = (str: string) => {
  // Strip Html tags
  let effectiveStr = str.replace(/<\/?(?:b|nobr)>/gi, '')
  // Replace each icon keyword with '##' for width calculation
  ICON_KEYWORDS_TO_URL.forEach(({ keyword }) => {
    effectiveStr = effectiveStr.replace(new RegExp(keyword, 'g'), '##')
  })
  return effectiveStr.length
}

export const isTalentOffer = (talent: TalentTreeTalentNode) =>
  hasTalentMonsterExpansion(talent) && hasTalentOfferPrefix(talent)

export const isTalentInAnyEvents = (talent: TalentTreeTalentNode) => talent.events.length > 0

export const isTalentInAnyCards = (talent: TalentTreeTalentNode) =>
  TALENTS_OBTAINED_FROM_CARDS.ONLY.includes(talent.name) ||
  TALENTS_OBTAINED_FROM_CARDS.ALSO.includes(talent.name)

const hasTalentMonsterExpansion = (talent: TalentTreeTalentNode) => talent.expansion === 0

const hasTalentOfferPrefix = (talent: TalentTreeTalentNode) => talent.name.startsWith('Offer of')

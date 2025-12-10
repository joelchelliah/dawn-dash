import {
  ArcanistImageUrl,
  CoinsOfPassingImageUrl,
  DexImageUrl,
  EventImageUrl,
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
} from '@/shared/utils/imageUrls'
import { CharacterClass } from '@/shared/types/characterClass'
import { ClassColorVariant, darken, getClassColor } from '@/shared/utils/classColors'

import {
  HierarchicalTalentTreeNode,
  TalentTreeNodeType,
  TalentTreeTalentNode,
} from '../types/talents'

const ICON_KEYWORDS_TO_URL = [
  { keyword: 'HEALTH', icon: HealthImageUrl },
  { keyword: 'HOLY', icon: HolyImageUrl },
  { keyword: 'STR', icon: StrImageUrl },
  { keyword: 'INT', icon: IntImageUrl },
  { keyword: 'DEX', icon: DexImageUrl },
]

const colorGrey = getClassColor(CharacterClass.Neutral, ClassColorVariant.Default)
const colorRed = getClassColor(CharacterClass.Warrior, ClassColorVariant.Default)
const colorGreen = getClassColor(CharacterClass.Rogue, ClassColorVariant.Default)
const colorBlue = getClassColor(CharacterClass.Arcanist, ClassColorVariant.Default)
const colorOffers = darken(getClassColor(CharacterClass.Warrior, ClassColorVariant.Default), 10)
const colorEvents = darken(getClassColor(CharacterClass.Seeker, ClassColorVariant.Default), 10)

export const getTalentRequirementIconProps = (
  type: TalentTreeNodeType,
  label: string
): { count: number; url: string; color: string; label: string } => {
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
  } else if (type === TalentTreeNodeType.CLASS_AND_ENERGY_REQUIREMENT) {
    const [className, energy] = label.split('_')
    if (!className || !energy) {
      throw new Error(`Invalid class and energy requirement label: ${label}`)
    }

    return getTalentRequirementIconProps(TalentTreeNodeType.CLASS_REQUIREMENT, className)
  }

  switch (label) {
    case 'DEX':
      return { count: 1, url: DexImageUrl, color: colorGreen, label: 'DEX' }
    case 'DEX2':
      return { count: 2, url: DexImageUrl, color: colorGreen, label: '2 DEX' }
    case 'INT':
      return { count: 1, url: IntImageUrl, color: colorBlue, label: 'INT' }
    case 'INT2':
      return { count: 2, url: IntImageUrl, color: colorBlue, label: '2 INT' }
    case 'STR':
      return { count: 1, url: StrImageUrl, color: colorRed, label: 'STR' }
    case 'STR2':
      return { count: 2, url: StrImageUrl, color: colorRed, label: '2 STR' }
    case 'STR3':
      return { count: 3, url: StrImageUrl, color: colorRed, label: '3 STR' }
    case 'Offers':
      return { count: 1, url: InfernalContractUrl, color: colorOffers, label: 'Offers' }
    case 'Events':
      return { count: 1, url: CoinsOfPassingImageUrl, color: colorEvents, label: 'Events' }
    case 'No Requirements':
      return { count: 1, url: NeutralImageUrl, color: colorGrey, label: 'No requirements' }
    default:
      return { count: 1, url: EventImageUrl, color: colorEvents, label }
  }
}

export const getSecondaryTalentRequirementIconProps = (
  type: TalentTreeNodeType,
  requirementLabel: string
): { count: number; url: string; color: string; label: string } | undefined => {
  if (type !== TalentTreeNodeType.CLASS_AND_ENERGY_REQUIREMENT) return undefined
  const [, energy] = requirementLabel.split('_')
  const { count, url, color, label } = getTalentRequirementIconProps(
    TalentTreeNodeType.ENERGY_REQUIREMENT,
    energy
  )
  return { count, url, color, label }
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

const hasTalentMonsterExpansion = (talent: TalentTreeTalentNode) => talent.expansion === 0

const hasTalentOfferPrefix = (talent: TalentTreeTalentNode) => talent.name.startsWith('Offer of')

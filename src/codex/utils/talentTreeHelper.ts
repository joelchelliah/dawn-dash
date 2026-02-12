import { HierarchyPointNode } from 'd3-hierarchy'

import {
  ArcanistImageUrl,
  CoinsOfPassingImageUrl,
  DexImageUrl,
  ChestImageUrl,
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
  HealingPotionImageUrl,
  WatchedImageUrl,
  CollectorImageUrl,
  ForgeryImageUrl,
  SurgeOfDexterityImageUrl,
  DiamondMindImageUrl,
  NoSoupImageUrl,
} from '@/shared/utils/imageUrls'
import { CharacterClass } from '@/shared/types/characterClass'
import { ClassColorVariant, darken, getClassColor } from '@/shared/utils/classColors'

import {
  HierarchicalTalentTreeNode,
  TalentTreeNodeType,
  TalentTreeTalentNode,
} from '../types/talents'
import { NODE, REQUIREMENT_NODE } from '../constants/talentTreeValues'

import { getNodeHeight } from './talentNodeDimensions'
import { TalentRenderingContext } from './talentNodeDimensionCache'

const colorGrey = getClassColor(CharacterClass.Neutral, ClassColorVariant.Default)
const colorRed = getClassColor(CharacterClass.Warrior, ClassColorVariant.Default)
const colorGreen = getClassColor(CharacterClass.Rogue, ClassColorVariant.Default)
const colorBlue = getClassColor(CharacterClass.Arcanist, ClassColorVariant.Default)
const colorHoly = getClassColor(CharacterClass.Sunforge, ClassColorVariant.Default)
const colorOffers = darken(getClassColor(CharacterClass.Warrior, ClassColorVariant.Default), 10)
const colorEvents = darken(getClassColor(CharacterClass.Seeker, ClassColorVariant.Default), 10)
const colorCards = darken(getClassColor(CharacterClass.Sunforge, ClassColorVariant.Light), 10)
const colorUnavailable = darken(getClassColor(CharacterClass.Hunter, ClassColorVariant.Default), 5)

// Returns useful props for rendering a talent requirement node
export const getTalentRequirementIconProps = (
  isClassRequirement: boolean,
  label: string
): { count: number; url: string; url2?: string; url3?: string; color: string; label: string } => {
  if (isClassRequirement) {
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
    case 'Unavailable talents':
      return { count: 1, url: NoSoupImageUrl, color: colorUnavailable, label: 'Unavailable' }
    case 'No Requirements':
      return { count: 1, url: NeutralImageUrl, color: colorGrey, label: 'No requirements' }
    case 'Sacred Tome':
      return { count: 1, url: SacredTomeImageUrl, color: colorCards, label }
    case 'Taurus Rage':
      return { count: 1, url: TaurusRageImageUrl, color: colorCards, label }
    case 'Dark Revenance':
      return { count: 1, url: DarkRevenanceImageUrl, color: colorCards, label }
    case 'Healing potion':
      return { count: 1, url: HealingPotionImageUrl, color: colorCards, label }
    case 'Surge of Dexterity':
      return { count: 1, url: SurgeOfDexterityImageUrl, color: colorCards, label }
    case 'Watched':
      return { count: 1, url: WatchedImageUrl, color: colorCards, label }
    case 'Diamond Mind':
      return { count: 1, url: DiamondMindImageUrl, color: colorCards, label }
    case 'Collector':
      return { count: 1, url: CollectorImageUrl, color: colorCards, label }
    case 'Forgery':
      return { count: 1, url: ForgeryImageUrl, color: colorCards, label }
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
      case 'Unavailable':
      case 'Unavailable talents':
        return tinyDarken(colorUnavailable)
      default:
        return colorGrey
    }
  }
}

// Returns a formatted string of keywords that match the talent's name or description
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

/**
 * Recursively checks if a node or any of its descendants match keywords
 */
export const matchesKeywordOrHasMatchingDescendant = (
  node: HierarchicalTalentTreeNode,
  parsedKeywords: string[]
): boolean => {
  if (doesNodeMatchKeywords(node, parsedKeywords)) return true
  if (!node.children || node.children.length === 0) return false
  return node.children.some((child) => matchesKeywordOrHasMatchingDescendant(child, parsedKeywords))
}

/**
 * Finds a node by name and type in the talent tree
 */
export const getNodeInTree = (
  name: string,
  type: TalentTreeNodeType,
  node: HierarchicalTalentTreeNode
): HierarchicalTalentTreeNode | null => {
  if (node.name === name && node.type === type) return node
  if (!node.children) return null
  for (const child of node.children) {
    const found = getNodeInTree(name, type, child)
    if (found) return found
  }
  return null
}

export const isTalentOffer = (talent: TalentTreeTalentNode) =>
  hasTalentMonsterExpansion(talent) && hasTalentOfferPrefix(talent)

export const isTalentInAnyEvents = (talent: TalentTreeTalentNode) => talent.events.length > 0

const hasTalentMonsterExpansion = (talent: TalentTreeTalentNode) => talent.expansion === 0

const hasTalentOfferPrefix = (talent: TalentTreeTalentNode) => talent.name.startsWith('Offer of')

const doesNodeMatchKeywords = (
  node: HierarchicalTalentTreeNode,
  parsedKeywords: string[]
): boolean => {
  if (parsedKeywords.length === 0) return false
  return parsedKeywords.some(
    (keyword) =>
      node.name.toLowerCase().includes(keyword.toLowerCase()) ||
      node.description.toLowerCase().includes(keyword.toLowerCase())
  )
}

/**
 * Tree bounds information for sizing and positioning the SVG
 */
export interface TalentTreeBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
}

/**
 * Calculate bounding box for the entire tree based on positioned nodes.
 * Uses actual node dimensions for accurate bounds calculation.
 * Skips the virtual root node (depth 0) since it's not rendered.
 */
export const calculateTalentTreeBounds = (
  root: HierarchyPointNode<HierarchicalTalentTreeNode>,
  renderingContext: TalentRenderingContext
): TalentTreeBounds => {
  let minX = Infinity // Top edge (vertical layout rotated)
  let maxX = -Infinity // Bottom edge (vertical layout rotated)
  let minY = Infinity // Left edge
  let maxY = -Infinity // Right edge

  // Only consider visible nodes (depth > 0), skip virtual root
  root.descendants().forEach((node) => {
    if (node.depth === 0) return // Skip virtual root node

    const x = node.x ?? 0
    const y = node.y ?? 0

    // Get node dimensions based on type
    let width: number
    let height: number

    if (node.data.type === TalentTreeNodeType.TALENT) {
      // Talent nodes have static width and dynamic height
      width = NODE.WIDTH
      height = getNodeHeight(node.data, renderingContext).height
    } else {
      // Requirement nodes are circular with fixed dimensions
      const radius = REQUIREMENT_NODE.RADIUS_DEFAULT
      width = radius * 2
      height = radius * 2
    }

    // Track edges for both X and Y
    // In the talent tree, x represents vertical position, y represents horizontal position
    if (x - height / 2 < minX) minX = x - height / 2
    if (x + height / 2 > maxX) maxX = x + height / 2
    if (y - width / 2 < minY) minY = y - width / 2
    if (y + width / 2 > maxY) maxY = y + width / 2
  })

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxY - minY,
    height: maxX - minX,
  }
}

/**
 * Utilities for finding optimal card combinations for Weekly Challenge scoring
 */

export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Legendary'

export interface VersatilityRank {
  rank: string
  threshold: number
  points: number
}

// Versatility ranks based on number of distinct cards in deck
// Data from ParameterRankTable component
export const VERSATILITY_RANKS: VersatilityRank[] = [
  { rank: 'IX', threshold: 101, points: 2000 },
  { rank: 'VIII', threshold: 71, points: 1750 },
  { rank: 'VII', threshold: 59, points: 1500 },
  { rank: 'VI', threshold: 42, points: 1000 },
  { rank: 'V', threshold: 31, points: 750 },
  { rank: 'IV', threshold: 20, points: 500 },
  { rank: 'III', threshold: 10, points: 250 },
  { rank: 'II', threshold: 6, points: 50 },
  { rank: 'I', threshold: 0, points: 0 }, // Fallback rank
]

export interface CardCombination {
  rarity: Rarity
  distinctCards: number
  duplicates: number
  baseScore: number
  totalScore: number
  description: string
  calculation: string
}

export interface CombinationResult {
  combination: CardCombination
  totalScore: number
  isAbove: boolean
  distance: number
}

export const getCardScoreScaledByRarity = (rarity: Rarity, cardBaseValue: number): number =>
  Math.ceil(cardBaseValue * getCardRarityMultiplier(rarity))

const getCardRarityMultiplier = (rarity: Rarity): number => {
  switch (rarity) {
    case 'Common':
      return 1
    case 'Uncommon':
      return 1.5
    case 'Rare':
      return 1.5 * 1.5
    case 'Legendary':
      return 1.5 * 1.5 * 1.5
  }
}

/**
 * Find the best card combination that is just above the target
 * Considers both distinct cards and duplicates with diminishing returns
 */
export const findCombinationJustAbove = (
  target: number,
  cardBaseValue: number,
  maxCards = 20,
  diminishingReturnsLimit = 5
): CombinationResult | null => {
  const rarities: Rarity[] = ['Common', 'Uncommon', 'Rare', 'Legendary']
  let bestResult: CombinationResult | null = null

  for (const rarity of rarities) {
    const baseScore = Math.ceil(cardBaseValue * getCardRarityMultiplier(rarity))

    // Try all combinations of distinct cards + duplicates up to maxCards total
    for (let distinctCards = 0; distinctCards <= maxCards; distinctCards++) {
      for (let duplicates = 0; duplicates <= maxCards - distinctCards; duplicates++) {
        const totalCards = distinctCards + duplicates
        if (totalCards === 0 || totalCards > maxCards) continue

        const totalScore = calculateCombinationScore(
          rarity,
          distinctCards,
          duplicates,
          cardBaseValue,
          diminishingReturnsLimit
        )

        if (totalScore > target) {
          const distance = totalScore - target

          // Update if: closer to target, OR same distance but more distinct cards (tiebreaker)
          const shouldUpdate =
            !bestResult ||
            distance < bestResult.distance ||
            (distance === bestResult.distance &&
              distinctCards > bestResult.combination.distinctCards)

          if (shouldUpdate) {
            bestResult = {
              combination: {
                rarity,
                distinctCards,
                duplicates,
                baseScore: Math.ceil(baseScore),
                totalScore,
                description: generateDescription(rarity, distinctCards, duplicates),
                calculation: generateCalculation(distinctCards, duplicates, baseScore),
              },
              totalScore,
              isAbove: true,
              distance,
            }
          }
        }
      }
    }
  }

  return bestResult
}

/**
 * Calculate the score for a single card with diminishing returns
 */
const getCardCopyScore = (baseScore: number, copyNumber: number): number => {
  if (copyNumber === 1) return baseScore

  return baseScore * Math.pow(0.5, copyNumber - 1)
}

/**
 * Calculate total score for a combination of distinct and duplicate cards
 */
const calculateCombinationScore = (
  rarity: Rarity,
  distinctCards: number,
  duplicates: number,
  cardBaseValue: number,
  diminishingReturnsLimit: number
): number => {
  const baseScore = Math.ceil(cardBaseValue * getCardRarityMultiplier(rarity))
  let totalScore = 0

  // Add score for distinct cards (all get full base score)
  totalScore += distinctCards * baseScore

  // Add score for duplicates with diminishing returns
  for (let i = 0; i < duplicates; i++) {
    const copyNumber = 2 // We're only considering 2nd copies for now. For more copies the score is too low to be relevant.
    if (copyNumber <= diminishingReturnsLimit) {
      totalScore += getCardCopyScore(baseScore, copyNumber)
    }
  }

  return Math.ceil(totalScore)
}

/**
 * Generate a human-readable description of the card combination
 */
const generateDescription = (rarity: Rarity, distinctCards: number, duplicates: number): string => {
  if (duplicates === 0) {
    return `${distinctCards} distinct ${rarity}`
  }
  if (distinctCards === 0) {
    return `${duplicates} duplicate ${rarity}`
  }
  return `${distinctCards} distinct + ${duplicates} duplicate ${rarity}`
}

/**
 * Generate the calculation string showing how the score is computed
 * Format: "3 × 68 + 3 × 34" for 3 distinct at 68 each + 3 duplicates at 34 each
 */
const generateCalculation = (
  distinctCards: number,
  duplicates: number,
  baseScore: number
): string => {
  const parts: string[] = []

  if (distinctCards > 0) {
    parts.push(`${distinctCards} × ${Math.ceil(baseScore)}`)
  }

  if (duplicates > 0) {
    const duplicateScore = Math.ceil(baseScore * 0.5)
    parts.push(`${duplicates} × ${duplicateScore}`)
  }

  return parts.join(' + ')
}

export const calculateCardEquivalentToGivenPoints = (
  points: number,
  cardBaseValue: number,
  isFixedScore: boolean
): string => {
  const rarities: Rarity[] = ['Legendary', 'Rare', 'Uncommon', 'Common']

  for (const rarity of rarities) {
    const baseScore = getCardScoreScaledByRarity(rarity, cardBaseValue)
    const scoreAtMaxMalignancy = Math.ceil(baseScore * (1 + 220 / 100))
    const equivalent = points / (isFixedScore ? scoreAtMaxMalignancy : baseScore)

    if (equivalent >= 1 || rarity === 'Common') {
      // Remove .0 suffix from whole numbers
      const formatted = equivalent.toFixed(1).replace('.0', '')
      return `${formatted} ${rarity}`
    }
  }

  return '0 Common'
}

export interface FixedVsKeywordsComparison {
  fixedPoints: number
  cardName: string
  outscaledAt: number | null // Malignancy percentage (0-220) where keywords outscale, or null if never
  outscalingRarity: Rarity | null
  baseKeywordScore: number // The base keyword score at 0% malignancy
}

/**
 * Compare fixed score bonus (from PointsPerCard or DeckContainsCard) against keyword bonus
 * scaled by malignancy from 0% to 220%.
 *
 * Returns the malignancy percentage at which a keyword card first outscales the fixed bonus,
 * starting with Common rarity and progressing to higher rarities if needed.
 */
export const compareFixedVsKeywordsBonus = (
  fixedPoints: number,
  cardName: string,
  cardBaseValue: number
): FixedVsKeywordsComparison => {
  const rarities: Rarity[] = ['Common', 'Uncommon', 'Rare', 'Legendary']
  const maxMalignancy = 220 // 220% is the maximum malignancy
  const minMalignancy = 0 // 0% is the minimum malignancy

  for (const rarity of rarities) {
    const baseScore = getCardScoreScaledByRarity(rarity, cardBaseValue)

    // Check each malignancy percentage from 0 to 220
    for (let malignancy = minMalignancy; malignancy <= maxMalignancy; malignancy++) {
      // Malignancy formula: baseScore * (1 + malignancy/100)
      const scaledScore = Math.ceil(baseScore * (1 + malignancy / 100))

      if (scaledScore > fixedPoints) {
        return {
          fixedPoints,
          cardName,
          outscaledAt: malignancy,
          outscalingRarity: rarity,
          baseKeywordScore: baseScore,
        }
      }
    }
  }

  // If we get here, even Legendary at 220% malignancy doesn't outscale the fixed bonus
  return {
    fixedPoints,
    cardName,
    outscaledAt: null,
    outscalingRarity: null,
    baseKeywordScore: getCardScoreScaledByRarity('Common', cardBaseValue),
  }
}

/**
 * Calculate the accuracy window range based on target and buffer values.
 * Returns a string representation like "17 - 23"
 */
export const getAccuracyWindowRange = (target: number, buffer: number): string => {
  const start = target - buffer + 1
  const end = target + buffer - 1
  return `${start} - ${end}`
}

export interface VersatilityRankResult {
  rank: string
  rankBelow: string | undefined
  threshold: number
  additionalPoints: number
  maxCardsInWindow: number
}

/**
 * Find the highest versatility rank achievable while staying within the accuracy window.
 * The accuracy window is [target - buffer + 1, target + buffer - 1].
 */
export const findHighestVersatilityRankInRange = (
  target: number,
  buffer: number
): VersatilityRankResult | undefined => {
  const maxCardsInWindow = target + buffer - 1

  for (let i = 0; i < VERSATILITY_RANKS.length; i++) {
    const rank = VERSATILITY_RANKS[i]
    const hasRankBelow = i < VERSATILITY_RANKS.length - 1
    const additionalPoints = hasRankBelow
      ? rank.points - VERSATILITY_RANKS[i + 1].points
      : rank.points

    if (maxCardsInWindow >= rank.threshold) {
      return {
        rank: rank.rank,
        rankBelow: hasRankBelow ? VERSATILITY_RANKS[i + 1].rank : undefined,
        threshold: rank.threshold,
        additionalPoints,
        maxCardsInWindow,
      }
    }
  }

  return undefined
}

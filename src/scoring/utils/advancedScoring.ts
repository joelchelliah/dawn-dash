/**
 * Utilities for finding optimal card combinations for Weekly Challenge scoring
 */

export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Legendary'

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

          if (!bestResult || distance < bestResult.distance) {
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
    const copyNumber = 2 // We're only considering 2nd copies for now
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

/**
 * Game constants for Dawncaster scoring, shared across the scoring utils and panels.
 */

// The highest malignancy level (%) currently attainable in-game
export const MAX_MALIGNANCY_PERCENT = 220

// Each rarity level above Common is worth 50% more than the one below it
export const RARITY_SCORE_MULTIPLIER = 1.5

// Each additional copy of a keyword-matching card scores half as much as the previous copy
export const DUPLICATE_SCORE_MULTIPLIER = 0.5

// Fraction of the accuracy base score lost each time the deck size passes the buffer
export const ACCURACY_PENALTY_RATE = 0.1

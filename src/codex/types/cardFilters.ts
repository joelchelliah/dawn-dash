import { CardSet, SharedFilterOption } from './filters'

// -------------------- Rarity --------------------

export enum RarityFilterOption {
  Legendary = 'Legendary',
  Rare = 'Rare',
  Uncommon = 'Uncommon',
  Common = 'Common',
  // Monster rarity is deliberately absent
  // Monster cards are governed by the "Include Monster cards" checkbox
}

export type Rarity = RarityFilterOption | SharedFilterOption

export const Rarity = {
  ...RarityFilterOption,
  ...SharedFilterOption,
  getAll: (): Rarity[] => [
    ...Object.values(RarityFilterOption),
    ...Object.values(SharedFilterOption),
  ],
}

// -------------------- Card Type --------------------

export enum CardTypeFilterOption {
  Melee = 'Melee',
  Magic = 'Magic',
  Ranged = 'Ranged',
  Utility = 'Utility',
  Divine = 'Divine',
  // Move type is deliberately absent — never used in the game
  Corruption = 'Corruption',
  // Monster type is deliberately absent
  // Monster cards are governed by the "Include Monster cards" checkbox
}

export type CardType = CardTypeFilterOption | SharedFilterOption

export const CardType = {
  ...CardTypeFilterOption,
  ...SharedFilterOption,
  getAll: (): CardType[] => [
    ...Object.values(CardTypeFilterOption),
    ...Object.values(SharedFilterOption),
  ],
}

// -------------------- Banner --------------------

export enum BannerFilterOption {
  Green = 'Green',
  Blue = 'Blue',
  Red = 'Red',
  Purple = 'Purple',
  Brown = 'Brown',
  Aqua = 'Aqua',
  Gold = 'Gold',
  Black = 'Black',
  Orange = 'Orange',
  // Monster banner is deliberately absent
  // Monster cards are governed by the "Include Monster cards" checkbox
}

export type Banner = BannerFilterOption | SharedFilterOption

export const Banner = {
  ...BannerFilterOption,
  ...SharedFilterOption,
  getAll: (): Banner[] => [
    ...Object.values(BannerFilterOption),
    ...Object.values(SharedFilterOption),
  ],
}

// -------------------- Extra Card --------------------

export enum ExtraCardFilterOption {
  IncludeMonsterCards = 'IncludeMonsterCards',
  IncludeAnimalCompanionCards = 'IncludeAnimalCompanionCards',
  IncludeNonCollectibleCards = 'IncludeNonCollectibleCards',
}

export type ExtraCard = ExtraCardFilterOption

export const ExtraCard = {
  ...ExtraCardFilterOption,
  getAll: (): ExtraCard[] => [...Object.values(ExtraCardFilterOption)],
}

// -------------------- Formatting Card --------------------

export enum FormattingCardFilterOption {
  ShowCardArt = 'ShowCardArt',
  ShowDescription = 'ShowDescription',
  ShowKeywords = 'ShowKeywords',
  ShowCardSet = 'ShowCardSet',
  ShowCardType = 'ShowCardType',
  ShowBlightbaneLink = 'ShowBlightbaneLink',
  HideTrackedCards = 'HideTrackedCards',
}

export type FormattingCard = FormattingCardFilterOption

export const FormattingCard = {
  ...FormattingCardFilterOption,
  getAll: (): FormattingCard[] => [...Object.values(FormattingCardFilterOption)],
}

// -------------------- Cache --------------------

export interface CardCodexSearchFilterCache {
  keywords: string
  cardSets: Record<string, boolean>
  rarities: Record<string, boolean>
  banners: Record<string, boolean>
  cardTypes: Record<string, boolean>
  extras: Record<string, boolean>
  formatting: Record<string, boolean>
  struckCards: string[]
  lastUpdated: number
}

// ------------ Weekly Challenge ------------

export type WeeklyChallengeFilterData = {
  id: number
  name: string
  keywords: Set<string>
  specialKeywords: Set<string>
  hadNegativeKeywords: boolean
  cardSets: Set<CardSet>
  banners: Set<Banner>
}

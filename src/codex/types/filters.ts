export type FilterType = 'card-set' | 'rarity' | 'banner' | 'extra' | 'formatting'

export enum SharedFilterOption {
  All = 'All',
  None = 'None',
}

// -------------------- Card Set --------------------

export enum CardSetFilterOption {
  Core = 'Core',
  Metaprogress = 'Metaprogress',
  Metamorphosis = 'Metamorphosis',
  Infinitum = 'Infinitum',
  Catalyst = 'Catalyst',
  Eclypse = 'Eclypse',
}

export type CardSet = CardSetFilterOption | SharedFilterOption

export const CardSet = {
  ...CardSetFilterOption,
  ...SharedFilterOption,
  getAll: (): CardSet[] => [
    ...Object.values(CardSetFilterOption),
    ...Object.values(SharedFilterOption),
  ],
}

// -------------------- Rarity --------------------

export enum RarityFilterOption {
  Legendary = 'Legendary',
  Rare = 'Rare',
  Uncommon = 'Uncommon',
  Common = 'Common',
}

export type Rarity = RarityFilterOption

export const Rarity = {
  ...RarityFilterOption,
  getAll: (): Rarity[] => [...Object.values(RarityFilterOption)],
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

// -------------------- Extra --------------------

export enum ExtraFilterOption {
  IncludeMonsterCards = 'IncludeMonsterCards',
  IncludeNonCollectibleCards = 'IncludeNonCollectibleCards',
}

export type Extra = ExtraFilterOption

export const Extra = {
  ...ExtraFilterOption,
  getAll: (): Extra[] => [...Object.values(ExtraFilterOption)],
}

// -------------------- Formatting --------------------

export enum FormattingFilterOption {
  ShowRarity = 'ShowRarity',
  ShowDescription = 'ShowDescription',
  ShowKeywords = 'ShowKeywords',
  ShowCardSet = 'ShowCardSet',
}

export type Formatting = FormattingFilterOption

export const Formatting = {
  ...FormattingFilterOption,
  getAll: (): Formatting[] => [...Object.values(FormattingFilterOption)],
}

// -------------------- Cache --------------------

export interface CardCodexSearchFilterCache {
  keywords: string
  cardSets: Record<string, boolean>
  rarities: Record<string, boolean>
  banners: Record<string, boolean>
  extras: Record<string, boolean>
  formatting: Record<string, boolean>
  struckCards: string[]
  lastUpdated: number
}

// ------------ Weekly Challenge ------------

export type WeeklyChallengeFilterData = {
  name: string
  keywords: Set<string>
  specialKeywords: Set<string>
  cardSets: Set<CardSet>
  banners: Set<Banner>
  isBoundless: boolean
}

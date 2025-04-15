export type FilterType = 'card-set' | 'rarity' | 'banner' | 'formatting'

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

// -------------------- Formatting --------------------

export enum FormattingFilterOption {
  ShowRarity = 'ShowRarity',
  ShowDescription = 'ShowDescription',
  ShowKeywords = 'ShowKeywords',
  ShowCardSet = 'ShowCardSet',
  ShowNonCollectibles = 'ShowNonCollectibles',
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
  formatting: Record<string, boolean>
  struckCards: string[]
  lastUpdated: number
}

export type FilterType = 'card-set' | 'rarity' | 'tier' | 'banner' | 'extra' | 'formatting'

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

// -------------------- Tier --------------------

export enum TierFilterOption {
  Tier0 = 'Tier 0',
  Tier1 = 'Tier 1',
  Tier2 = 'Tier 2',
  Tier3 = 'Tier 3',
  Tier4 = 'Tier 4',
  Tier5 = 'Tier 5',
  Tier6 = 'Tier 6',
}

export type Tier = TierFilterOption | SharedFilterOption

export const Tier = {
  ...TierFilterOption,
  ...SharedFilterOption,
  getAll: (): Tier[] => [...Object.values(TierFilterOption), ...Object.values(SharedFilterOption)],
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

// -------------------- Card Extra --------------------

export enum ExtraCardFilterOption {
  IncludeMonsterCards = 'IncludeMonsterCards',
  IncludeNonCollectibleCards = 'IncludeNonCollectibleCards',
}

export type ExtraCard = ExtraCardFilterOption

export const ExtraCard = {
  ...ExtraCardFilterOption,
  getAll: (): ExtraCard[] => [...Object.values(ExtraCardFilterOption)],
}

// -------------------- Talent Extra --------------------

export enum ExtraTalentFilterOption {
  IncludeOffers = 'IncludeOffers',
  IncludeEventBasedTalents = 'IncludeEventBasedTalents',
}

export type ExtraTalent = ExtraTalentFilterOption

export const ExtraTalent = {
  ...ExtraTalentFilterOption,
  getAll: (): ExtraTalent[] => [...Object.values(ExtraTalentFilterOption)],
}

// -------------------- Formatting --------------------

export enum FormattingFilterOption {
  ShowRarity = 'ShowRarity',
  ShowDescription = 'ShowDescription',
  ShowKeywords = 'ShowKeywords',
  ShowCardSet = 'ShowCardSet',
  ShowBlightbaneLink = 'ShowBlightbaneLink',
  HideTrackedCards = 'HideTrackedCards',
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

export interface TalentCodexSearchFilterCache {
  keywords: string
  cardSets: Record<string, boolean>
  tiers: Record<string, boolean>
  extras: Record<string, boolean>
  lastUpdated: number
}

// ------------ Weekly Challenge ------------

export type WeeklyChallengeFilterData = {
  id: number
  name: string
  keywords: Set<string>
  specialKeywords: Set<string>
  cardSets: Set<CardSet>
  banners: Set<Banner>
}

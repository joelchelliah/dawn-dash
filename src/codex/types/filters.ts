export type FilterTypeCard = 'card-set' | 'rarity' | 'banner' | 'extra' | 'formatting-card'

export type FilterTypeTalent = 'card-set' | 'requirement' | 'tier' | 'extra' | 'formatting-talent'

export enum SharedFilterOption {
  All = 'Select all',
  None = 'Select none',
}

// -------------------- Card Set --------------------

export enum CardSetFilterOption {
  Core = 'Core',
  Metaprogress = 'Metaprogress',
  Metamorphosis = 'Metamorphosis',
  Infinitum = 'Infinitum',
  Catalyst = 'Catalyst',
  Eclypse = 'Eclypse',
  Synthesis = 'Synthesis',
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

// ------------------ Requirements ------------------

export enum RequirementFilterOption {
  NoRequirements = 'NoRequirements',
  Dexterity = 'Dexterity',
  Intelligence = 'Intelligence',
  Strength = 'Strength',
  Arcanist = 'Arcanist',
  Hunter = 'Hunter',
  Knight = 'Knight',
  Rogue = 'Rogue',
  Seeker = 'Seeker',
  Warrior = 'Warrior',
  Sunforge = 'Sunforge',
  Offer = 'Offer',
  ObtainedFromEvents = 'ObtainedFromEvents',
  ObtainedFromCards = 'ObtainedFromCards',
}

export type Requirement = RequirementFilterOption | SharedFilterOption

export const Requirement = {
  ...RequirementFilterOption,
  ...SharedFilterOption,
  getAll: (): Requirement[] => [
    ...Object.values(RequirementFilterOption),
    ...Object.values(SharedFilterOption),
  ],
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

// -------------------- Extra Card --------------------

export enum ExtraCardFilterOption {
  IncludeMonsterCards = 'IncludeMonsterCards',
  IncludeNonCollectibleCards = 'IncludeNonCollectibleCards',
}

export type ExtraCard = ExtraCardFilterOption

export const ExtraCard = {
  ...ExtraCardFilterOption,
  getAll: (): ExtraCard[] => [...Object.values(ExtraCardFilterOption)],
}

// -------------------- Extra Talent --------------------

export enum ExtraTalentFilterOption {
  IncludeOffers = 'IncludeOffers',
  IncludeEvents = 'IncludeEvents',
}

export type ExtraTalent = ExtraTalentFilterOption

export const ExtraTalent = {
  ...ExtraTalentFilterOption,
  getAll: (): ExtraTalent[] => [...Object.values(ExtraTalentFilterOption)],
}

// -------------------- Formatting Card --------------------

export enum FormattingCardFilterOption {
  ShowRarity = 'ShowRarity',
  ShowDescription = 'ShowDescription',
  ShowKeywords = 'ShowKeywords',
  ShowCardSet = 'ShowCardSet',
  ShowBlightbaneLink = 'ShowBlightbaneLink',
  HideTrackedCards = 'HideTrackedCards',
}

export type FormattingCard = FormattingCardFilterOption

export const FormattingCard = {
  ...FormattingCardFilterOption,
  getAll: (): FormattingCard[] => [...Object.values(FormattingCardFilterOption)],
}

// -------------------- Formatting Talent --------------------

export enum FormattingTalentFilterOption {
  MobileFriendlyRendering = 'MobileFriendlyRendering',
  ShowDescriptionByDefault = 'ShowDescriptionByDefault',
  ShowKeywords = 'ShowKeywords',
  ShowBlightbaneLink = 'ShowBlightbaneLink',
  ExpandNodesByDefault = 'ExpandNodesByDefault',
}

export type FormattingTalent = FormattingTalentFilterOption

export const FormattingTalent = {
  ...FormattingTalentFilterOption,
  getAll: (): FormattingTalent[] => [...Object.values(FormattingTalentFilterOption)],
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
  requirements: Record<string, boolean>
  tiers: Record<string, boolean>
  formatting: Record<string, boolean>
  lastUpdated: number
}

export interface EventCodexSearchFilterCache {
  showAdvancedOptions: boolean
  loopingPathMode: string
  navigationMode: string
  levelOfDetail: string
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

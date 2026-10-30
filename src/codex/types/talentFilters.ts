import { SharedFilterOption } from './filters'

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
  Unavailable = 'Unavailable',
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

// -------------------- Formatting Talent --------------------

export enum FormattingTalentFilterOption {
  ShowTalentArt = 'ShowTalentArt',
  ShowDescription = 'ShowDescriptions',
  ShowCardSet = 'ShowCardSet',
  ShowKeywords = 'ShowKeywords',
  ShowBlightbaneLink = 'ShowBlightbaneLink',
  ExpandAllNodes = 'ExpandNodesByDefault',
}

export type FormattingTalent = FormattingTalentFilterOption

export const FormattingTalent = {
  ...FormattingTalentFilterOption,
  getAll: (): FormattingTalent[] => [...Object.values(FormattingTalentFilterOption)],
}

// -------------------- Cache --------------------

export interface TalentCodexSearchFilterCache {
  keywords: string
  cardSets: Record<string, boolean>
  requirements: Record<string, boolean>
  tiers: Record<string, boolean>
  formatting: Record<string, boolean>
  lastUpdated: number
}

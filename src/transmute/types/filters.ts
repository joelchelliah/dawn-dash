import { SharedFilterOption } from '@/shared/types/filters'

import { TransmuteMode } from './rules'

// ------------------ Direction & mode ------------------

// _From_: what the selected card turns into. _To_: what turns into the selected card.
export type TransmuteDirection = 'from' | 'to'

export const DEFAULT_DIRECTION: TransmuteDirection = 'from'
export const DEFAULT_MODE: TransmuteMode = 'transmute'

export const ALL_DIRECTIONS: TransmuteDirection[] = ['from', 'to']
// Always in this order, whatever control renders them
export const ALL_MODES: TransmuteMode[] = ['transmute', 'sidemute', 'tradepost']

// -------------------- Energy attribute --------------------

export enum EnergyAttributeFilterOption {
  Dexterity = 'Dexterity',
  Intelligence = 'Intelligence',
  Strength = 'Strength',
  Holy = 'Holy',
}

export type EnergyAttribute = EnergyAttributeFilterOption | SharedFilterOption

export const EnergyAttribute = {
  ...EnergyAttributeFilterOption,
  ...SharedFilterOption,
  getAll: (): EnergyAttribute[] => [
    ...Object.values(EnergyAttributeFilterOption),
    ...Object.values(SharedFilterOption),
  ],
}

// -------------------- Formatting --------------------

export enum FormattingTransmuteFilterOption {
  ShowCardArt = 'ShowCardArt',
  ShowBlightbaneLink = 'ShowBlightbaneLink',
}

export type FormattingTransmute = FormattingTransmuteFilterOption

export const FormattingTransmute = {
  ...FormattingTransmuteFilterOption,
  getAll: (): FormattingTransmute[] => [...Object.values(FormattingTransmuteFilterOption)],
}

// -------------------- Cache --------------------

export interface TransmuteSearchFilterCache {
  direction: TransmuteDirection
  mode: TransmuteMode
  cardSets: Record<string, boolean>
  energyAttributes: Record<string, boolean>
  formatting: Record<string, boolean>
  lastUpdated: number
}

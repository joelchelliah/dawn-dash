export type FilterTypeCard =
  'card-set' | 'rarity' | 'banner' | 'card-type' | 'extra' | 'formatting-card'

export type FilterTypeTalent = 'card-set' | 'requirement' | 'tier' | 'formatting-talent'

export type FilterTypeEvent = 'formatting-event'

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

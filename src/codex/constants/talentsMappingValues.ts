import { RequirementFilterOption } from '../types/filters'

export const REQUIREMENT_CLASS_TO_FILTER_OPTIONS_MAP: Record<string, RequirementFilterOption[]> = {
  Arcanist: [RequirementFilterOption.Arcanist],
  Hunter: [RequirementFilterOption.Hunter],
  Knight: [RequirementFilterOption.Knight],
  Rogue: [RequirementFilterOption.Rogue],
  Seeker: [RequirementFilterOption.Seeker],
  Warrior: [RequirementFilterOption.Warrior],
  Sunforge: [RequirementFilterOption.Sunforge],
}

export const REQUIREMENT_ENERGY_TO_FILTER_OPTIONS_MAP: Record<string, RequirementFilterOption[]> = {
  DEX: [RequirementFilterOption.Dexterity],
  DEX2: [RequirementFilterOption.Dexterity],
  DEX3: [RequirementFilterOption.Dexterity],
  INT: [RequirementFilterOption.Intelligence],
  INT2: [RequirementFilterOption.Intelligence],
  INT3: [RequirementFilterOption.Intelligence],
  STR: [RequirementFilterOption.Strength],
  STR2: [RequirementFilterOption.Strength],
  STR3: [RequirementFilterOption.Strength],
  HOLY: [], // Does not need to be mapped, but the key is used for checking requirement type
}

// These are actually talents you ONLY get from events
// TODO: Is it better to have this in the database instead?
export const ACTUALLY_EVENT_ONLY_TALENTS = [
  'Blessing of Serem-Pek', // The Godscar Wastes Finish
  'Brush With Death', // The Chasm
  'Compassionate', // Wounded Animal
  'Frozen Heart', // Frozen Heart
  'Peace of Mind', // Mystical Glade
  'Pragmatism', // Heated Debate
  'Sacred Zest', // Heated Debate
  'Skylars Kiss', // Shrine of Binding
  'Stormscarred', // Windy Hillock
  'Taste of Chaos', // Mystical Glade
  'Watched', // Shrine of Misery
]

// export const TALENTS_OBTAINED_FROM_CARDS = {
//   ONLY: [
//     'Mark of Taurus', // Taurus Rage
//     'Undead', // Dark Revenance
//   ],
//   ALSO: [
//     'Devotion', // Sacred Tome
//   ],
// }

export const REMOVED_TALENTS = ['Prodigy', 'Lucky', "Alcars' Rage", 'Sworn to Vengeance']

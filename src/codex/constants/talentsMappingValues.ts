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

// Based on currently existing requirement combos. Add more as needed.
export const REQUIREMENT_CLASS_AND_ENERGY_TO_FILTER_OPTIONS_MAP: Record<
  string,
  RequirementFilterOption[]
> = {
  Hunter_STR: [RequirementFilterOption.Hunter, RequirementFilterOption.Strength], // Butcher, Haemorrager
  Warrior_STR: [RequirementFilterOption.Warrior, RequirementFilterOption.Strength], // Demolisher, Haemorrager
  Seeker_INT2: [RequirementFilterOption.Seeker, RequirementFilterOption.Intelligence], // Oracle,
}

export const REQUIREMENT_ENERGY_TO_FILTER_OPTIONS_MAP: Record<string, RequirementFilterOption[]> = {
  DEX: [RequirementFilterOption.Dexterity],
  DEX2: [RequirementFilterOption.Dexterity],
  INT: [RequirementFilterOption.Intelligence],
  INT2: [RequirementFilterOption.Intelligence],
  STR: [RequirementFilterOption.Strength],
  STR2: [RequirementFilterOption.Strength],
  STR3: [RequirementFilterOption.Strength],
  INTSTR: [RequirementFilterOption.Intelligence, RequirementFilterOption.Strength],
  DEXSTR: [RequirementFilterOption.Dexterity, RequirementFilterOption.Strength],
  DEXINT: [RequirementFilterOption.Dexterity, RequirementFilterOption.Intelligence],
}

// These are not events that give you a talent.
// The talents listed on them are just requirements for special dialogue options.
// So we need to filter them out of our requirements.
export const EVENTS_BLACKLIST = [
  'Alchemist 1', // Stormscarred
  'ArmsDealer', // Devotion
  'Campfire', // Emporium Discount
  'GoldenIdol', // Mobility
  'Shrine of Trickery', // Faerytales
  // 'The Deep Finish', // Watched
  'The Godscar Wastes Start', // Watched
  'The Voice Below', // Watched
  'WallOfFire', // Fire Immunity

  // Manually merging these into Priest
  'Prayer',
  'Priest 1',

  // Manually merging these into The Deep Finish
  'The Godscar Wastes Finish',
]

// These are actually talents you ONLY get from events
export const ACTUALLY_EVENT_ONLY_TALENTS = [
  'Blessing of Serem-Pek', // The Godscar Wastes Finish
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

// These are not actually talents that can be obtained from Windy Hillock.
const NOT_REALLY_WINDY_HILLOCK_TALENTS = [
  'Devotion',
  'Grounding Weapon',
  'Stormbringer',
  'Thundering Weapon',
]

// These are not actually talents that can be obtained from The Deep Finish.
const NOT_REALLY_DEEP_FINISH_TALENTS = ['Watched']

// These are not actually talents that can be obtained from Entrancing Song.
const NOT_REALLY_ENTRANCING_SONG_TALENTS = ['Diamond Mind']

// These are not actually talents that can be obtained from Lost Soul.
const NOT_REALLY_LOST_SOUL_TALENTS = ['Devotion']

export const EVENT_TALENTS_MAP_BLACKLIST: Record<string, string[]> = {
  WindyHillock: NOT_REALLY_WINDY_HILLOCK_TALENTS,
  'The Deep Finish': NOT_REALLY_DEEP_FINISH_TALENTS,
  EntrancingSong: NOT_REALLY_ENTRANCING_SONG_TALENTS,
  LostSoul: NOT_REALLY_LOST_SOUL_TALENTS,
}

// TODO: How to include this separation?!
export const TALENTS_FROM_CARD_ACTIONS = [
  'Mark of Taurus', // Taurus Rage
  'Undead', // Dark Revenance
]

// TODO: How to include this separation?!
export const REMOVED_TALENTS = ['Prodigy', 'Lucky']

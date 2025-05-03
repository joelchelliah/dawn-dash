import { isNotNullOrUndefined } from '../../shared/utils/object'
import { ParsedTalentData, TalentData } from '../types/talents'

export const mapAndSortTalentsData = (unparsedTalents: TalentData[]): ParsedTalentData[] => {
  const sortedTalents = sortAndRemoveDuplicates(unparsedTalents)
  const blightbaneIdToTalent = new Map<number, ParsedTalentData>()

  const parsedTalents = sortedTalents.map((talent) => {
    const parsed: ParsedTalentData = {
      id: talent.id,
      name: talent.name,
      description: talent.description,
      flavourText: talent.flavour_text,
      tier: talent.tier,
      expansion: talent.expansion,
      events: talent.events,
      requiresClasses: talent.requires_classes,
      requiresEnergy: talent.requires_energy,
      // To be filled in the next step
      requiresTalents: [],
      requiredForTalents: [],
    }
    blightbaneIdToTalent.set(talent.blightbane_id, parsed)

    return parsed
  })

  // Second pass to fill in `requiresTalents` and `requiredForTalents`
  return parsedTalents.map((talent, idx) => {
    const unparsedTalent = sortedTalents[idx]
    return {
      ...talent,
      requiresTalents: (unparsedTalent.requires_talents || [])
        .map((id) => blightbaneIdToTalent.get(id))
        .filter(isNotNullOrUndefined),
      requiredForTalents: (unparsedTalent.required_for_talents || [])
        .map((id) => blightbaneIdToTalent.get(id))
        .filter(isNotNullOrUndefined),
    }
  })
}

const sortAndRemoveDuplicates = (talents: TalentData[]) =>
  talents
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier

      return a.name.localeCompare(b.name)
    })
    .filter((talent, index, self) => index === self.findIndex(({ name }) => name === talent.name))

import {
  TalentCodexSearchFilterCache,
  FormattingTalent,
  FormattingTalentFilterOption,
} from '@/codex/types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultFilters = {
  [FormattingTalentFilterOption.MobileFriendlyRendering]: true,
  [FormattingTalentFilterOption.ShowDescriptionByDefault]: true,
  [FormattingTalentFilterOption.ShowBlightbaneLink]: false,
}

const valueToStringMap = {
  [FormattingTalentFilterOption.MobileFriendlyRendering]: 'Use mobile-friendly rendering',
  [FormattingTalent.ShowDescriptionByDefault]: 'Show descriptions by default',
  [FormattingTalent.ShowBlightbaneLink]: 'Show Blightbane link',
}

export const allFormattingTalentFilters = FormattingTalent.getAll()

const useBaseFilters = createFilterHook({
  defaultFilters,
  allValues: allFormattingTalentFilters,
  valueToStringMap,
})

export const useFormattingTalentFilters = (
  cachedFilters?: TalentCodexSearchFilterCache['formatting']
) => {
  const { filters, handleFilterToggle, getValueToString, resetFilters } =
    useBaseFilters(cachedFilters)
  const shouldShowDescription = filters[FormattingTalent.ShowDescriptionByDefault]
  const shouldShowBlightbaneLink = filters[FormattingTalent.ShowBlightbaneLink]
  const shouldUseMobileFriendlyRendering = filters[FormattingTalent.MobileFriendlyRendering]

  return {
    formattingFilters: filters,
    handleFormattingFilterToggle: handleFilterToggle,
    getFormattingFilterName: getValueToString,
    resetFormattingFilters: resetFilters,
    shouldShowDescription,
    shouldShowBlightbaneLink,
    shouldUseMobileFriendlyRendering,
  }
}

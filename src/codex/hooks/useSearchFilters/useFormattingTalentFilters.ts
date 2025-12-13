import {
  TalentCodexSearchFilterCache,
  FormattingTalent,
  FormattingTalentFilterOption,
} from '@/codex/types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultFilters = {
  [FormattingTalentFilterOption.MobileFriendlyRendering]: true,
  [FormattingTalentFilterOption.ShowDescriptionByDefault]: true,
  [FormattingTalentFilterOption.ShowKeywords]: false,
  [FormattingTalentFilterOption.ShowBlightbaneLink]: false,
}

const valueToStringMap = {
  [FormattingTalentFilterOption.MobileFriendlyRendering]: 'Use mobile-friendly rendering',
  [FormattingTalent.ShowDescriptionByDefault]: 'Show descriptions by default',
  [FormattingTalent.ShowKeywords]: 'Show matching keywords',
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
  const shouldUseMobileFriendlyRendering = filters[FormattingTalent.MobileFriendlyRendering]
  const shouldShowDescription = filters[FormattingTalent.ShowDescriptionByDefault]
  const shouldShowKeywords = filters[FormattingTalent.ShowKeywords]
  const shouldShowBlightbaneLink = filters[FormattingTalent.ShowBlightbaneLink]

  return {
    formattingFilters: filters,
    handleFormattingFilterToggle: handleFilterToggle,
    getFormattingFilterName: getValueToString,
    resetFormattingFilters: resetFilters,
    shouldUseMobileFriendlyRendering,
    shouldShowDescription,
    shouldShowKeywords,
    shouldShowBlightbaneLink,
  }
}

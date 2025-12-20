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
  [FormattingTalentFilterOption.ExpandNodesByDefault]: true,
}

const valueToStringMap = {
  [FormattingTalentFilterOption.MobileFriendlyRendering]: 'Use mobile-friendly rendering',
  [FormattingTalent.ShowDescriptionByDefault]: 'Show all descriptions by default',
  [FormattingTalent.ShowKeywords]: 'Show matching keywords',
  [FormattingTalent.ShowBlightbaneLink]: 'Show Blightbane link',
  [FormattingTalent.ExpandNodesByDefault]: 'Expand all nodes by default',
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
  const shouldExpandNodes = filters[FormattingTalent.ExpandNodesByDefault]

  return {
    formattingFilters: filters,
    handleFormattingFilterToggle: handleFilterToggle,
    getFormattingFilterName: getValueToString,
    resetFormattingFilters: resetFilters,
    shouldUseMobileFriendlyRendering,
    shouldShowDescription,
    shouldShowKeywords,
    shouldShowBlightbaneLink,
    shouldExpandNodes,
  }
}

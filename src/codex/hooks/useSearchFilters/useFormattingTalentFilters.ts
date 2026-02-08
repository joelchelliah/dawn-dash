import {
  TalentCodexSearchFilterCache,
  FormattingTalent,
  FormattingTalentFilterOption,
} from '@/codex/types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultFilters = {
  [FormattingTalentFilterOption.ShowDescription]: true,
  [FormattingTalentFilterOption.ShowCardSet]: false,
  [FormattingTalentFilterOption.ShowKeywords]: false,
  [FormattingTalentFilterOption.ShowBlightbaneLink]: false,
  [FormattingTalentFilterOption.ExpandAllNodes]: true,
}

const valueToStringMap = {
  [FormattingTalentFilterOption.ShowDescription]: 'Show talent description',
  [FormattingTalentFilterOption.ShowCardSet]: 'Show card set',
  [FormattingTalentFilterOption.ShowKeywords]: 'Show matching keywords',
  [FormattingTalentFilterOption.ShowBlightbaneLink]: 'Show Blightbane link',
  [FormattingTalentFilterOption.ExpandAllNodes]: 'Expand all nodes',
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
  const shouldShowDescription = filters[FormattingTalent.ShowDescription]
  const shouldShowCardSet = filters[FormattingTalent.ShowCardSet]
  const shouldShowKeywords = filters[FormattingTalent.ShowKeywords]
  const shouldShowBlightbaneLink = filters[FormattingTalent.ShowBlightbaneLink]
  const shouldExpandNodes = filters[FormattingTalent.ExpandAllNodes]

  return {
    formattingFilters: filters,
    handleFormattingFilterToggle: handleFilterToggle,
    getFormattingFilterName: getValueToString,
    resetFormattingFilters: resetFilters,
    shouldShowDescription,
    shouldShowCardSet,
    shouldShowKeywords,
    shouldShowBlightbaneLink,
    shouldExpandNodes,
  }
}

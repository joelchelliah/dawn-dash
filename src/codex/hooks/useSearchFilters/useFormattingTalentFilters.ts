import {
  TalentCodexSearchFilterCache,
  FormattingTalent,
  FormattingTalentFilterOption,
} from '@/codex/types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultFilters = {
  [FormattingTalentFilterOption.ShowDescriptionByDefault]: true,
}

const valueToStringMap = {
  [FormattingTalent.ShowDescriptionByDefault]: 'Show all descriptions by default',
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

  return {
    formattingFilters: filters,
    handleFormattingFilterToggle: handleFilterToggle,
    getFormattingFilterName: getValueToString,
    resetFormattingFilters: resetFilters,
    shouldShowDescription,
  }
}

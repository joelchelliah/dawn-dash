import { createFilterHook } from '@/shared/hooks/useSearchFilters/useFilterFactory'

import {
  FormattingTransmute,
  FormattingTransmuteFilterOption,
  TransmuteSearchFilterCache,
} from '@/transmute/types/filters'

const defaultFilters = {
  [FormattingTransmuteFilterOption.ShowCardArt]: true,
  [FormattingTransmuteFilterOption.ShowBlightbaneLink]: false,
}

const valueToStringMap = {
  [FormattingTransmute.ShowCardArt]: 'Show card art',
  [FormattingTransmute.ShowBlightbaneLink]: 'Show Blightbane link',
}

export const allFormattingTransmuteFilters = FormattingTransmute.getAll()

const useBaseFilters = createFilterHook({
  defaultFilters,
  allValues: allFormattingTransmuteFilters,
  valueToStringMap,
})

export const useFormattingTransmuteFilters = (
  cachedFilters?: TransmuteSearchFilterCache['formatting']
) => {
  const { filters, handleFilterToggle, getValueToString, resetFilters } =
    useBaseFilters(cachedFilters)
  const shouldShowCardArt = filters[FormattingTransmute.ShowCardArt]
  const shouldShowBlightbaneLink = filters[FormattingTransmute.ShowBlightbaneLink]

  return {
    formattingFilters: filters,
    handleFormattingFilterToggle: handleFilterToggle,
    getFormattingFilterName: getValueToString,
    resetFormattingFilters: resetFilters,
    shouldShowCardArt,
    shouldShowBlightbaneLink,
  }
}

import { Formatting, FormattingFilterOption } from '../types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultFormattingFilters = {
  [FormattingFilterOption.ShowRarity]: true,
  [FormattingFilterOption.ShowDescription]: false,
  [FormattingFilterOption.ShowKeywords]: true,
  [FormattingFilterOption.ShowCardSet]: true,
}

const formattingToStringMap = {
  [Formatting.ShowRarity]: 'Show card rarity',
  [Formatting.ShowDescription]: 'Show card description',
  [Formatting.ShowKeywords]: 'Show matching keywords',
  [Formatting.ShowCardSet]: 'Show card set',
}

export const allFormattingFilters = Formatting.getAll()

const useBaseFormattingFilters = createFilterHook({
  defaultFilters: defaultFormattingFilters,
  allValues: allFormattingFilters,
  valueToStringMap: formattingToStringMap,
})

export const useFormattingFilters = () => {
  const { filters, handleFilterToggle, getValueToString, resetFilters } = useBaseFormattingFilters()
  const shouldShowRarity = filters[Formatting.ShowRarity]
  const shouldShowDescription = filters[Formatting.ShowDescription]
  const shouldShowKeywords = filters[Formatting.ShowKeywords]
  const shouldShowCardSet = filters[Formatting.ShowCardSet]

  return {
    formattingFilters: filters,
    handleFormattingFilterToggle: handleFilterToggle,
    getFormattingFilterName: getValueToString,
    resetFormattingFilters: resetFilters,
    shouldShowRarity,
    shouldShowDescription,
    shouldShowKeywords,
    shouldShowCardSet,
  }
}

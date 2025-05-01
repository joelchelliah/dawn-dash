import { CardCodexSearchFilterCache, Formatting, FormattingFilterOption } from '../../types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultFormattingFilters = {
  [FormattingFilterOption.ShowRarity]: true,
  [FormattingFilterOption.ShowDescription]: false,
  [FormattingFilterOption.ShowKeywords]: true,
  [FormattingFilterOption.ShowCardSet]: true,
  [FormattingFilterOption.ShowBlightbaneLink]: false,
}

const formattingToStringMap = {
  [Formatting.ShowRarity]: 'Show card rarity',
  [Formatting.ShowDescription]: 'Show card description',
  [Formatting.ShowKeywords]: 'Show matching keywords',
  [Formatting.ShowCardSet]: 'Show card set',
  [Formatting.ShowBlightbaneLink]: 'Show Blightbane link',
}

export const allFormattingFilters = Formatting.getAll()

const useBaseFormattingFilters = createFilterHook({
  defaultFilters: defaultFormattingFilters,
  allValues: allFormattingFilters,
  valueToStringMap: formattingToStringMap,
})

export const useFormattingFilters = (cachedFilters?: CardCodexSearchFilterCache['formatting']) => {
  const { filters, handleFilterToggle, getValueToString, resetFilters } =
    useBaseFormattingFilters(cachedFilters)
  const shouldShowRarity = filters[Formatting.ShowRarity]
  const shouldShowDescription = filters[Formatting.ShowDescription]
  const shouldShowKeywords = filters[Formatting.ShowKeywords]
  const shouldShowCardSet = filters[Formatting.ShowCardSet]
  const shouldShowBlightbaneLink = filters[Formatting.ShowBlightbaneLink]

  return {
    formattingFilters: filters,
    handleFormattingFilterToggle: handleFilterToggle,
    getFormattingFilterName: getValueToString,
    resetFormattingFilters: resetFilters,
    shouldShowRarity,
    shouldShowDescription,
    shouldShowKeywords,
    shouldShowCardSet,
    shouldShowBlightbaneLink,
  }
}

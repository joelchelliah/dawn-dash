import {
  CardCodexSearchFilterCache,
  FormattingCard,
  FormattingCardFilterOption,
} from '@/codex/types/filters'

import { createFilterHook } from './useFilterFactory'

const defaultFilters = {
  [FormattingCardFilterOption.ShowRarity]: true,
  [FormattingCardFilterOption.ShowDescription]: false,
  [FormattingCardFilterOption.ShowKeywords]: true,
  [FormattingCardFilterOption.ShowCardSet]: true,
  [FormattingCardFilterOption.ShowBlightbaneLink]: false,
  [FormattingCardFilterOption.HideTrackedCards]: false,
}

const valueToStringMap = {
  [FormattingCard.ShowRarity]: 'Show card rarity',
  [FormattingCard.ShowDescription]: 'Show card description',
  [FormattingCard.ShowKeywords]: 'Show matching keywords',
  [FormattingCard.ShowCardSet]: 'Show card set',
  [FormattingCard.ShowBlightbaneLink]: 'Show Blightbane link',
  [FormattingCard.HideTrackedCards]: 'Hide tracked cards',
}

export const allFormattingCardFilters = FormattingCard.getAll()

const useBaseFilters = createFilterHook({
  defaultFilters,
  allValues: allFormattingCardFilters,
  valueToStringMap,
})

export const useFormattingCardFilters = (
  cachedFilters?: CardCodexSearchFilterCache['formatting']
) => {
  const { filters, handleFilterToggle, getValueToString, resetFilters } =
    useBaseFilters(cachedFilters)
  const shouldShowRarity = filters[FormattingCard.ShowRarity]
  const shouldShowDescription = filters[FormattingCard.ShowDescription]
  const shouldShowKeywords = filters[FormattingCard.ShowKeywords]
  const shouldShowCardSet = filters[FormattingCard.ShowCardSet]
  const shouldShowBlightbaneLink = filters[FormattingCard.ShowBlightbaneLink]
  const shouldHideTrackedCards = filters[FormattingCard.HideTrackedCards]

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
    shouldHideTrackedCards,
  }
}

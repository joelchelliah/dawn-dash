import { useState } from 'react'

enum Formatting {
  ShowRarity = 'ShowRarity',
  ShowDescription = 'ShowDescription',
  ShowKeywords = 'ShowKeywords',
  ShowCardSet = 'ShowCardSet',
}

const defaultFormattingFilters = {
  [Formatting.ShowRarity]: true,
  [Formatting.ShowDescription]: false,
  [Formatting.ShowKeywords]: true,
  [Formatting.ShowCardSet]: true,
}

const formattingToStringMap = {
  [Formatting.ShowRarity]: 'Show card rarity',
  [Formatting.ShowDescription]: 'Show card description',
  [Formatting.ShowKeywords]: 'Show matching keywords',
  [Formatting.ShowCardSet]: 'Show card set',
}

export const allFormattingFilters = Object.values(Formatting)
export const useFormattingFilters = () => {
  const [formattingFilters, setFormattingFilters] =
    useState<Record<string, boolean>>(defaultFormattingFilters)

  const handleFormattingFilterToggle = (filter: string) => {
    setFormattingFilters((prevFilters) => ({
      ...prevFilters,
      [filter]: !prevFilters[filter],
    }))
  }

  const getFormattingFilterName = (filter: string) => {
    return formattingToStringMap[filter as keyof typeof formattingToStringMap]
  }

  const resetFormattingFilters = () => {
    setFormattingFilters(defaultFormattingFilters)
  }

  const shouldShowRarity = formattingFilters[Formatting.ShowRarity]
  const shouldShowDescription = formattingFilters[Formatting.ShowDescription]
  const shouldShowKeywords = formattingFilters[Formatting.ShowKeywords]
  const shouldShowCardSet = formattingFilters[Formatting.ShowCardSet]

  return {
    formattingFilters,
    handleFormattingFilterToggle,
    getFormattingFilterName,
    resetFormattingFilters,
    shouldShowRarity,
    shouldShowDescription,
    shouldShowKeywords,
    shouldShowCardSet,
  }
}

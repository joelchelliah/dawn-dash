import useSWR from 'swr'

import { ChallengeData } from '../types/challenges'
import { fetchLatestChallengeData } from '../services/challengesApiBlightbane'
import { Banner, CardSet, WeeklyChallengeFilterData } from '../types/filters'
import { isNotNullOrUndefined } from '../../shared/utils/object'

export function useWeeklyChallengeFilterData() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<ChallengeData | null>(
    'weekly-challenge-filter-data',
    fetchLatestChallengeData
  )

  const filterData: WeeklyChallengeFilterData | null = data
    ? {
        name: data.name,
        keywords: data.keywords,
        specialKeywords: data.specialKeywords,
        cardSets: getCardSetsForExpansions(data.expansions),
        banners: getBannersForClasses(data.classes),
        isBoundless: data.isBoundless,
      }
    : null

  return {
    filterData,
    isFilterDataError: error,
    isFilterDataValidating: isValidating,
    isFilterDataLoading: isLoading,
    refreshFilterData: () => mutate(),
  }
}

const getCardSetsForExpansions = (expansions: Set<string>) => {
  const cardSets: CardSet[] = Array.from(expansions)
    .map((expansion) => {
      switch (expansion.toLowerCase()) {
        case 'core':
          return CardSet.Core
        case 'progression':
          return CardSet.Metaprogress
        case 'metamorphosis':
          return CardSet.Metamorphosis
        case 'core extended':
          return CardSet.Core
        case 'infinitum':
          return CardSet.Infinitum
        case 'catalyst':
          return CardSet.Catalyst
        case 'eclypse':
          return CardSet.Eclypse
        default:
          return null
      }
    })
    .filter(isNotNullOrUndefined)

  return new Set(cardSets)
}

const getBannersForClasses = (classes: Set<string>) => {
  const banners: Banner[] = Array.from(classes).flatMap((className) => {
    switch (className.toLowerCase()) {
      case 'rogue':
        return [Banner.Green]
      case 'arcanist':
        return [Banner.Blue]
      case 'warrior':
        return [Banner.Red]
      case 'knight':
        return [Banner.Purple, Banner.Blue, Banner.Red]
      case 'seeker':
        return [Banner.Aqua, Banner.Blue, Banner.Green]
      case 'hunter':
        return [Banner.Orange, Banner.Red, Banner.Green]
      default:
        return []
    }
  })

  return new Set([...banners, Banner.Brown, Banner.Black])
}

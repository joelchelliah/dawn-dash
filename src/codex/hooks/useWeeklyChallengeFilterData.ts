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
        cardSets: getCardSets(data.expansions, data.isBoundless),
        banners: getBanners(
          data.classes,
          data.hasAccessToAllColors || data.isBoundless,
          data.hasAccessToHoly
        ),
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

const getCardSets = (expansions: Set<string>, isBoundless: boolean) => {
  if (isBoundless) return new Set([CardSet.All])

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

const getBanners = (
  classes: Set<string>,
  hasAccessToAllColors: boolean,
  hasAccessToHoly: boolean
) => {
  if (hasAccessToAllColors) return new Set([Banner.All])

  const bannersFromClasses: Banner[] = Array.from(classes).flatMap((className) => {
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

  return new Set([
    ...bannersFromClasses,
    Banner.Brown,
    Banner.Black,
    ...(hasAccessToHoly ? [Banner.Gold] : []),
  ])
}

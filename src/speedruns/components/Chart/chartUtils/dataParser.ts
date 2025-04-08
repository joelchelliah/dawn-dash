import { DataPoint, ParsedPlayerData, SubmissionWindow, ViewMode } from '../../../types/chart'
import { SpeedRunData, SpeedRunSubclass } from '../../../types/speedRun'
import {
  isGameVersionRange,
  isLastXDays,
  isVersionEqualOrAfter,
  isVersionEqualOrBefore,
  parseVersion,
} from '../../../utils/gameVersion'
import { getPlayerName, isAnonymousPlayer, removeAnonymousPlayers } from '../../../utils/players'
import { getDurationInMinutes, isWithinLastXDays } from '../../../utils/time'

/**
 * Process raw speedrun data into chart-ready format
 *
 * @param speedruns - Data from the API
 * @param playerLimit - The maximum number of players
 * @param maxDuration - Max duration in minutes
 * @param viewMode - Display mode ('records', 'improvements')
 * @param minVersion - Minimum game version
 * @param subclass - Sunforge subclass
 */
export function parseSpeedrunData(
  speedruns: SpeedRunData[],
  playerLimit: number,
  maxDuration: number,
  viewMode: ViewMode,
  submissionWindow: SubmissionWindow,
  subclass: SpeedRunSubclass | null
): ParsedPlayerData {
  const playerHistory = new Map<string, DataPoint[]>()

  speedruns
    // Reverse because the data has the newest runs first
    .reverse()
    .filter((run) => {
      if (!subclass || subclass === SpeedRunSubclass.All) return true
      return run.subclass === subclass
    })
    .forEach((run) => {
      const player = getPlayerName(run)
      const duration = getDurationInMinutes(run)
      const version = run.version

      const [minVersion, maxVersion] = isGameVersionRange(submissionWindow)
        ? [parseVersion(submissionWindow.min), parseVersion(submissionWindow.max)]
        : [undefined, undefined]
      const daysSinceSubmission = isLastXDays(submissionWindow) ? submissionWindow : undefined

      const isValidDuration = duration && duration <= maxDuration
      const isValidVersion =
        !minVersion || !maxVersion
          ? true
          : version &&
            isVersionEqualOrAfter(version, minVersion) &&
            isVersionEqualOrBefore(version, maxVersion)
      const isValidDate = !daysSinceSubmission || isWithinLastXDays(run.uid, daysSinceSubmission)

      if (isValidDuration && isValidVersion && isValidDate) {
        if (!playerHistory.has(player)) {
          playerHistory.set(player, [])
        }

        const timestamp = run.uid
        if (!isNaN(timestamp)) {
          playerHistory.get(player)?.push({
            x: timestamp,
            y: duration,
          })
        }
      }
    })

  let parsedData: ParsedPlayerData

  switch (viewMode) {
    case ViewMode.Records:
      parsedData = processRecordBreakingView(playerHistory)
      break
    case ViewMode.Improvements:
      parsedData = processSelfImprovingRunsView(playerHistory)
      break
    case ViewMode.All:
      parsedData = processAllRunsView(playerHistory)
      break
    default:
      throw new Error(`Invalid view mode: ${viewMode}`)
  }

  const { playerHistory: processedPlayerHistory, allRecordPoints } = parsedData

  return {
    playerHistory: filterPlayerHistoryByPlayerLimit(processedPlayerHistory, playerLimit),
    allRecordPoints,
  }
}

/**
 * Process player history for the record-breaking runs view
 *
 * @param playerHistory - Map of player names to run data
 */
function processRecordBreakingView(allPlayerHistory: Map<string, DataPoint[]>): ParsedPlayerData {
  let globalBestTime = Infinity
  const allRecordPoints: Array<{ player: string; run: DataPoint }> = []

  // Sort and find record-breaking runs across all players (including anonymous runs)
  const allRuns = Array.from(allPlayerHistory.entries())
    .flatMap(([player, runs]) => runs.map((run) => ({ player, run })))
    .sort((a, b) => a.run.x - b.run.x)

  allRuns.forEach(({ player, run }) => {
    if (run.y < globalBestTime) {
      globalBestTime = run.y
      allRecordPoints.push({ player, run })
    }
  })
  const filteredRuns = filterOutAllAnonymousRunsExceptTheBestOne(allRecordPoints)

  // Rewrite player history to include extra lines between record points
  const newPlayerHistory = new Map<string, DataPoint[]>()

  for (let i = 0; i < filteredRuns.length; i++) {
    const current = filteredRuns[i]
    const next = filteredRuns[i + 1]

    if (!newPlayerHistory.has(current.player)) {
      newPlayerHistory.set(current.player, [])
    }

    // Add current record point
    newPlayerHistory.get(current.player)?.push(current.run)

    if (next) {
      // Add horizontal line
      newPlayerHistory.get(current.player)?.push({ x: next.run.x, y: current.run.y })

      // Add vertical line to next player's segment
      if (!newPlayerHistory.has(next.player)) {
        newPlayerHistory.set(next.player, [])
      }
      newPlayerHistory.get(next.player)?.push({ x: next.run.x, y: current.run.y })
    }
  }

  return { playerHistory: newPlayerHistory, allRecordPoints }
}

/**
 * Process player history for the `Self-improving runs` view
 *
 * @param playerHistory - Map of player names to run data
 */
function processSelfImprovingRunsView(
  allPlayerHistory: Map<string, DataPoint[]>
): ParsedPlayerData {
  const playerHistory = sortRuns(removeAnonymousPlayers(allPlayerHistory), true)

  // Filter out players with fewer than 2 runs
  for (const [player, runs] of Array.from(playerHistory.entries())) {
    if (runs.length <= 1) {
      playerHistory.delete(player)
    }
  }

  // Calculate record points
  // TODO: This part is currently not used for anything.
  //       Find a way to display this as well in the `Self-improving runs` view?
  let globalBestTime = Infinity
  const allRecordPoints: Array<{ player: string; run: DataPoint }> = []

  const allRuns = Array.from(playerHistory.entries())
    .flatMap(([player, runs]) => runs.map((run) => ({ player, run })))
    .sort((a, b) => a.run.x - b.run.x)

  allRuns.forEach(({ player, run }) => {
    if (run.y < globalBestTime) {
      globalBestTime = run.y
      allRecordPoints.push({ player, run })
    }
  })

  return { playerHistory, allRecordPoints }
}

/**
 * Process player history for the `All runs` view
 *
 * @param playerHistory - Map of player names to run data
 */
function processAllRunsView(allPlayerHistory: Map<string, DataPoint[]>): ParsedPlayerData {
  const playerHistory = sortRuns(allPlayerHistory, false)

  return { playerHistory, allRecordPoints: [] }
}

function filterPlayerHistoryByPlayerLimit(
  playerHistory: Map<string, DataPoint[]>,
  playerLimit: number
) {
  const playerToBestTimeMap = Array.from(playerHistory.entries()).reduce<Record<string, number>>(
    (acc, [player, runs]) => {
      acc[player] = Math.min(...runs.map((run) => run.y))
      return acc
    },
    {}
  )

  const topPlayers = Object.entries(playerToBestTimeMap)
    .sort(([, aTime], [, bTime]) => aTime - bTime)
    .slice(0, playerLimit)
    .map(([player]) => player)

  return new Map(
    Array.from(playerHistory.entries()).filter(([player]) => topPlayers.includes(player))
  )
}

function sortRuns(
  allPlayerHistory: Map<string, DataPoint[]>,
  onlyKeepImprovingRuns: boolean
): Map<string, DataPoint[]> {
  const playerHistory = new Map(allPlayerHistory)

  for (const [player, runs] of Array.from(playerHistory.entries())) {
    runs.sort((a: DataPoint, b: DataPoint) => a.x - b.x)

    if (onlyKeepImprovingRuns) {
      let bestTime = Infinity
      const improvedRuns = runs.filter((run: DataPoint) => {
        if (run.y >= bestTime) return false
        bestTime = run.y
        return true
      })

      playerHistory.set(player, improvedRuns)
    } else {
      playerHistory.set(player, runs)
    }
  }

  return playerHistory
}

function filterOutAllAnonymousRunsExceptTheBestOne(
  allRecordPoints: Array<{ player: string; run: DataPoint }>
) {
  const bestAnonymousRun = allRecordPoints
    .filter(({ player }) => isAnonymousPlayer(player))
    .reduce((best, current) => (best.run.y > current.run.y ? current : best), {
      player: '',
      run: { x: 0, y: Infinity },
    })

  return allRecordPoints.filter(
    ({ player, run }) =>
      !isAnonymousPlayer(player) ||
      (run.x === bestAnonymousRun.run.x && run.y === bestAnonymousRun.run.y)
  )
}

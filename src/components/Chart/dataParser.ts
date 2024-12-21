import { DataPoint, ParsedPlayerData, ViewMode } from '../../types/chart'
import { GameVersion, SpeedRunData } from '../../types/speedRun'
import { getPlayerName, removeAnonymousPlayers } from '../../utils/players'
import { getDurationInMinutes } from '../../utils/time'
import { isVersionAfter } from '../../utils/version'

/**
 * Process raw speedrun data into chart-ready format
 *
 * @param speedruns - Data from the API
 * @param playerLimit - The maximum number of players
 * @param maxDuration - Max duration in minutes
 * @param viewMode - Display mode ('records', 'improvements')
 * @param minVersion - Minimum game version
 */
export function parseSpeedrunData(
  speedruns: SpeedRunData[],
  playerLimit: number,
  maxDuration: number,
  viewMode: ViewMode,
  minVersion: GameVersion
): ParsedPlayerData {
  const playerHistory = new Map<string, DataPoint[]>()

  // Reverse because the data has the newest runs first
  speedruns.reverse().forEach((run) => {
    const player = getPlayerName(run)
    const duration = getDurationInMinutes(run)
    const version = run.version

    const isValidDuration = duration && duration <= maxDuration
    const isValidVersion = version && isVersionAfter(version, minVersion)

    if (isValidDuration && isValidVersion) {
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

  const playerHistory = removeAnonymousPlayers(allPlayerHistory)
  const allRecordPoints: Array<{ player: string; run: DataPoint }> = []

  // Sort and find record-breaking runs across all players
  const allRuns = Array.from(playerHistory.entries())
    .flatMap(([player, runs]) => runs.map((run) => ({ player, run })))
    .sort((a, b) => a.run.x - b.run.x)

  allRuns.forEach(({ player, run }) => {
    if (run.y < globalBestTime) {
      globalBestTime = run.y
      allRecordPoints.push({ player, run })
    }
  })

  // Rewrite player history to include extra lines between record points
  const newPlayerHistory = new Map<string, DataPoint[]>()

  for (let i = 0; i < allRecordPoints.length; i++) {
    const current = allRecordPoints[i]
    const next = allRecordPoints[i + 1]

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

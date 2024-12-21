import { DataPoint } from '../types/chart'
import { SpeedRunData } from '../types/speedRun'

// To mark runs that are not associated with discord users
const ANONYMOUS_PLAYER = '__ANONYMOUS_PLAYER__'

export function getPlayerName(run: SpeedRunData) {
  return run.discorduser ?? ANONYMOUS_PLAYER
}

export function removeAnonymousPlayers(playerHistory: Map<string, DataPoint[]>) {
  const filteredMap = new Map(playerHistory)

  filteredMap.delete(ANONYMOUS_PLAYER)

  return filteredMap
}

export function isAnonymousPlayer(player: string) {
  return player === ANONYMOUS_PLAYER
}

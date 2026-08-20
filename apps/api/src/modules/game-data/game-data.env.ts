// Absent config means the Game Data Platform simply has nothing to call --
// GameDataClient degrades to UNKNOWN, never a crash, never fake data. Real
// values (GAME_DATA_WORKER_URL, GAME_DATA_API_READ_SECRET) come from the
// platform's own env-var mechanism, matching how every other secret in this
// repo is handled -- never committed, never asked for in chat.
export type GameDataConfig = {
  workerBaseUrl: string
  readSecret: string
}

export function isGameDataPlatformConfigured(): boolean {
  return Boolean(process.env.GAME_DATA_WORKER_URL && process.env.GAME_DATA_API_READ_SECRET)
}

export function gameDataConfig(): GameDataConfig {
  return {
    workerBaseUrl: (process.env.GAME_DATA_WORKER_URL || '').replace(/\/$/, ''),
    readSecret: process.env.GAME_DATA_API_READ_SECRET || ''
  }
}

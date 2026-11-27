export interface LeaderboardEntry {
  id: string
  tag: string
  title: string
  score: number
  maxCombo: number
  bossCleared: boolean
  date: string
}

const STORAGE_KEY = 'ipcs.leaderboard'

const todayKey = (): string => new Date().toISOString().slice(0, 10)

const defaultEntries = (date: string): LeaderboardEntry[] => [
  {
    id: 'seed-1',
    tag: 'QUIET-PRO',
    title: 'Midnight Deadline Runner',
    score: 880,
    maxCombo: 6,
    bossCleared: true,
    date,
  },
  {
    id: 'seed-2',
    tag: 'FRAME-ACE',
    title: 'Smooth Frame Tactician',
    score: 760,
    maxCombo: 4,
    bossCleared: true,
    date,
  },
  {
    id: 'seed-3',
    tag: 'ZERO-LEAK',
    title: 'Zero-Leak Strategist',
    score: 640,
    maxCombo: 3,
    bossCleared: false,
    date,
  },
]

const getStorage = (): Storage | null =>
  typeof window === 'undefined' ? null : window.localStorage

export const listDailyLeaderboard = (storeId: string): LeaderboardEntry[] => {
  const date = todayKey()
  const key = `${STORAGE_KEY}.${storeId}`
  const storage = getStorage()
  if (!storage) {
    return defaultEntries(date)
  }
  const raw = storage.getItem(key)
  if (!raw) {
    const seeded = defaultEntries(date)
    storage.setItem(key, JSON.stringify(seeded))
    return seeded
  }
  try {
    const parsed = JSON.parse(raw) as LeaderboardEntry[]
    const todays = Array.isArray(parsed)
      ? parsed.filter((entry) => entry && entry.date === date)
      : []
    if (todays.length === 0) {
      const seeded = defaultEntries(date)
      storage.setItem(key, JSON.stringify(seeded))
      return seeded
    }
    return todays.sort((a, b) => b.score - a.score).slice(0, 8)
  } catch {
    return defaultEntries(date)
  }
}

export const recordLeaderboardScore = (
  storeId: string,
  entry: Omit<LeaderboardEntry, 'id' | 'date'>,
): LeaderboardEntry[] => {
  const date = todayKey()
  const existing = listDailyLeaderboard(storeId)
  const created: LeaderboardEntry = {
    ...entry,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    date,
  }
  const next = [...existing, created]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
  getStorage()?.setItem(`${STORAGE_KEY}.${storeId}`, JSON.stringify(next))
  return next
}


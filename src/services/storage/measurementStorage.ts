export interface DailyTotals {
  date: string
  starts: number
  completions: number
  actions: number
  gatePass: number
  gateFail: number
}

interface SessionActions {
  createdAt: number
  actions: string[]
}

const STORAGE_KEY = 'ipcs.daily-totals'
const SESSION_ACTIONS_KEY = 'ipcs.session-actions'
const DAY_MS = 86_400_000

const getStorage = (): Storage | null =>
  typeof window === 'undefined' ? null : window.localStorage

const today = (now: Date): string => now.toISOString().slice(0, 10)

const emptyTotals = (date: string): DailyTotals => ({
  date,
  starts: 0,
  completions: 0,
  actions: 0,
  gatePass: 0,
  gateFail: 0,
})

export const readDailyTotals = (now: Date = new Date()): DailyTotals => {
  const date = today(now)
  const storage = getStorage()
  if (!storage) {
    return emptyTotals(date)
  }
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null')
    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed as DailyTotals).date === date
    ) {
      const totals = parsed as Partial<DailyTotals>
      return {
        date,
        starts: totals.starts ?? 0,
        completions: totals.completions ?? 0,
        actions: totals.actions ?? 0,
        gatePass: totals.gatePass ?? 0,
        gateFail: totals.gateFail ?? 0,
      }
    }
  } catch {
    return emptyTotals(date)
  }
  return emptyTotals(date)
}

const record = (
  field: 'starts' | 'completions' | 'gatePass' | 'gateFail',
  now: Date = new Date(),
): void => {
  const totals = readDailyTotals(now)
  totals[field] += 1
  getStorage()?.setItem(STORAGE_KEY, JSON.stringify(totals))
}

const readSessionActions = (now: number = Date.now()): Record<string, SessionActions> => {
  const storage = getStorage()
  if (!storage) {
    return {}
  }
  try {
    const parsed: unknown = JSON.parse(storage.getItem(SESSION_ACTIONS_KEY) ?? '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    const entries = Object.entries(parsed as Record<string, SessionActions>).filter(
      ([, value]) => value && typeof value.createdAt === 'number' && Array.isArray(value.actions),
    )
    const active = entries.filter(([, value]) => now - value.createdAt < DAY_MS)
    storage.setItem(SESSION_ACTIONS_KEY, JSON.stringify(Object.fromEntries(active)))
    return Object.fromEntries(active)
  } catch {
    return {}
  }
}

export const recordSessionStart = (now?: Date): void => record('starts', now)
export const recordSessionComplete = (now?: Date): void => record('completions', now)
export const recordGateResult = (ready: boolean, now?: Date): void =>
  record(ready ? 'gatePass' : 'gateFail', now)

export const recordEndingAction = (sessionId: string, action: 'specialist' | 'save'): void => {
  if (!sessionId) {
    return
  }
  const all = readSessionActions()
  const current = all[sessionId] ?? { createdAt: Date.now(), actions: [] }
  if (current.actions.includes(action)) {
    return
  }
  current.actions.push(action)
  all[sessionId] = current
  getStorage()?.setItem(SESSION_ACTIONS_KEY, JSON.stringify(all))

  const totals = readDailyTotals()
  totals.actions += 1
  getStorage()?.setItem(STORAGE_KEY, JSON.stringify(totals))
}

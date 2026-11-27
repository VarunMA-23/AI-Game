import type { HandoffRecord } from '../../types/product'

const STORAGE_KEY = 'ipcs.handoffs'
const DAY_MS = 86_400_000

const getStorage = (): Storage | null =>
  typeof window === 'undefined' ? null : window.localStorage

const readRecords = (): HandoffRecord[] => {
  const storage = getStorage()
  if (!storage) {
    return []
  }
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(
      (record): record is HandoffRecord => {
        if (typeof record !== 'object' || record === null) {
          return false
        }
        const candidate = record as Partial<HandoffRecord>
        return (
          typeof candidate.storeId === 'string' &&
          typeof candidate.persona === 'string' &&
          (candidate.modelCode === null || typeof candidate.modelCode === 'string') &&
          typeof candidate.createdAt === 'number'
        )
      },
    )
  } catch {
    return []
  }
}

const writeRecords = (records: HandoffRecord[]): void => {
  getStorage()?.setItem(STORAGE_KEY, JSON.stringify(records))
}

export const listHandoffs = (now: number = Date.now()): HandoffRecord[] => {
  const active = readRecords().filter(
    (record) => now - record.createdAt < DAY_MS,
  )
  writeRecords(active)
  return active
}

export const addHandoff = (record: Omit<HandoffRecord, 'createdAt'>): HandoffRecord => {
  const created: HandoffRecord = { ...record, createdAt: Date.now() }
  writeRecords([...listHandoffs(), created])
  return created
}

export const confirmHandoff = (createdAt: number): void => {
  writeRecords(listHandoffs().filter((record) => record.createdAt !== createdAt))
}

export const clearHandoffs = (): void => {
  writeRecords([])
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  readDailyTotals,
  recordEndingAction,
  recordGateResult,
} from '../src/services/storage/measurementStorage'
import { useGameStore } from '../src/store/gameStore'

const store = new Map<string, string>()

const fakeLocalStorage = {
  get length() {
    return store.size
  },
  clear: () => store.clear(),
  getItem: (key: string) => store.get(key) ?? null,
  key: (index: number) => [...store.keys()][index] ?? null,
  removeItem: (key: string) => {
    store.delete(key)
  },
  setItem: (key: string, value: string) => {
    store.set(key, value)
  },
}

beforeEach(() => {
  store.clear()
  vi.stubGlobal('window', { localStorage: fakeLocalStorage })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('anonymous measurement storage', () => {
  it('counts one completion when a session finish is repeated', () => {
    useGameStore.getState().resetSession()
    useGameStore.getState().startSession()
    useGameStore.getState().finalizeSession()
    useGameStore.getState().finishSession()
    useGameStore.getState().finishSession()
    expect(readDailyTotals().completions).toBe(1)
    useGameStore.getState().resetSession()
  })

  it('counts each ending action once per session', () => {
    recordEndingAction('session-1', 'specialist')
    recordEndingAction('session-1', 'specialist')
    recordEndingAction('session-1', 'save')
    recordEndingAction('session-2', 'save')
    expect(readDailyTotals().actions).toBe(3)
  })

  it('tracks gate uptime without personal data', () => {
    recordGateResult(true)
    recordGateResult(false)
    const totals = readDailyTotals()
    expect(totals.gatePass).toBe(1)
    expect(totals.gateFail).toBe(1)
    expect(JSON.stringify(store)).not.toContain('persona')
  })
})

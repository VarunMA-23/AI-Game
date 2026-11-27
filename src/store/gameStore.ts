import { create } from 'zustand'
import kioskConfig from '../data/kiosk.config.json'
import { allPackets, gameConfig } from '../game/config/loadConfig'
import { clamp, computeRaceProgress, leftLaneEngine } from '../game/race/routing'
import { calculatePersona } from '../features/recommendations/personaEngine'
import { rankModels } from '../features/recommendations/modelRanking'
import { checkStoreReadiness } from '../features/store-readiness/gate'
import { loadInventory } from '../services/inventory/loadInventory'
import {
  recordGateResult,
  recordSessionComplete,
} from '../services/storage/measurementStorage'
import type {
  ChallengeCompletePayload,
  ChallengeId,
  ChallengeStatus,
  Engine,
  GameState,
  Mode,
  Phase,
  RaceProgress,
} from '../types/game'

const challengeIds: ChallengeId[] = gameConfig.challenges.map((item) => item.id)

const mode: Mode = kioskConfig.mode === 'LIVE' ? 'LIVE' : 'DEMO'

const createSessionId = (): string => {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

const createInitialState = (): GameState => ({
  sessionId: '',
  storeId: kioskConfig.storeId,
  mode,
  phase: 'landing',
  currentChallenge: 0,
  startedAt: null,
  completedAt: null,
  challengeScores: Object.fromEntries(
    challengeIds.map((id) => [id, 0]),
  ) as Record<ChallengeId, number>,
  challengeStatus: Object.fromEntries(
    challengeIds.map((id) => [id, 'pending']),
  ) as Record<ChallengeId, ChallengeStatus>,
  challengeSubscores: {},
  packetRoutes: {},
  race: { leftProgress: 0, rightProgress: 0 },
  remainingMs: 0,
  caption: '',
  persona: null,
  recommendedModelCodes: [],
  storeReady: false,
  handoffPending: false,
  selectedBundle: null,
  maxBudget: 150000,
  combo: 0,
  maxCombo: 0,
  bossCleared: false,
  lastEngineMood: { CPU: 'idle', GPU: 'idle', NPU: 'idle' },
})

const skippedSet = (statuses: Record<ChallengeId, ChallengeStatus>): Set<ChallengeId> =>
  new Set(
    challengeIds.filter((id) => statuses[id] === 'skipped'),
  )

const raceFrom = (
  routes: GameState['packetRoutes'],
  statuses: Record<ChallengeId, ChallengeStatus>,
): RaceProgress =>
  computeRaceProgress(allPackets, routes, gameConfig.race, skippedSet(statuses))

interface GameActions {
  startSession: () => void
  resetSession: () => void
  setPhase: (phase: Phase, challengeIndex: number) => void
  finishSession: () => void
  finalizeSession: () => void
  setHandoffPending: (pending: boolean) => void
  setShopperPreferences: (prefs: { selectedBundle?: string | null; maxBudget?: number }) => void
  recordCombo: (isGood: boolean, engine: Engine) => number
  setBossCleared: (cleared: boolean) => void
  resetChallengeRoutes: (challengeId: ChallengeId) => void
  routePacket: (
    challengeId: ChallengeId,
    packetId: string,
    routedTo: Engine,
    fellBack: boolean,
  ) => void
  skipChallenge: (challengeId: ChallengeId) => void
  recordFallback: (packetId: string) => void
  updateRace: (progress: RaceProgress) => void
  setRemainingMs: (ms: number) => void
  setCaption: (text: string) => void
  setChallengeProgress: (challengeId: ChallengeId, score: number) => void
  completeChallenge: (payload: ChallengeCompletePayload) => void
}

export const useGameStore = create<GameState & GameActions>((set) => ({
  ...createInitialState(),
  startSession: () =>
    set({
      ...createInitialState(),
      sessionId: createSessionId(),
      startedAt: Date.now(),
      phase: 'setup',
    }),
  resetSession: () => set(createInitialState()),
  setPhase: (phase, challengeIndex) =>
    set((state) => ({
      phase,
      currentChallenge: challengeIndex,
      caption: phase === 'setup' ? gameConfig.race.disclosure : state.caption,
    })),
  finishSession: () =>
    set((state) => {
      if (state.phase !== 'next-step') {
        recordSessionComplete()
      }
      return {
        completedAt: state.completedAt ?? Date.now(),
        phase: 'next-step',
      }
    }),
  finalizeSession: () => {
    set((state) => {
      const personaResult = calculatePersona({
        challengeScores: { ...state.challengeScores },
        challengeSubscores: { ...state.challengeSubscores },
        challengeStatus: { ...state.challengeStatus },
      })
      const inventory = loadInventory(state.storeId)
      const readiness = checkStoreReadiness(inventory)
      recordGateResult(readiness.ready)
      const picks = rankModels(inventory.models, personaResult)
      const recommendedModelCodes = readiness.ready
        ? [picks.top?.code, picks.value?.code, picks.alternative?.code].filter(
            (code): code is string => Boolean(code),
          )
        : []

      return {
        completedAt: state.completedAt ?? Date.now(),
        phase: 'store',
        persona: personaResult.persona,
        recommendedModelCodes,
        storeReady: readiness.ready,
      }
    })
  },
  setHandoffPending: (pending) => set({ handoffPending: pending }),
  setShopperPreferences: (prefs) =>
    set((state) => ({
      selectedBundle:
        prefs.selectedBundle !== undefined ? prefs.selectedBundle : state.selectedBundle,
      maxBudget: prefs.maxBudget !== undefined ? prefs.maxBudget : state.maxBudget,
    })),
  recordCombo: (isGood, engine) => {
    let nextCombo = 0
    set((state) => {
      nextCombo = isGood ? (state.combo ?? 0) + 1 : 0
      const maxCombo = Math.max(state.maxCombo ?? 0, nextCombo)
      return {
        combo: nextCombo,
        maxCombo,
        lastEngineMood: {
          CPU: 'idle',
          GPU: 'idle',
          NPU: 'idle',
          [engine]: isGood ? 'happy' : 'strained',
        },
      }
    })
    return nextCombo
  },
  setBossCleared: (cleared) => set({ bossCleared: cleared }),
  resetChallengeRoutes: (challengeId) =>
    set((state) => {
      const challenge = gameConfig.challenges.find((item) => item.id === challengeId)
      if (!challenge || state.challengeStatus[challengeId] !== 'pending') {
        return state
      }
      const packetRoutes = { ...state.packetRoutes }
      for (const packet of challenge.packets) {
        delete packetRoutes[packet.id]
      }
      const challengeSubscores = { ...state.challengeSubscores }
      delete challengeSubscores[challengeId]
      return {
        packetRoutes,
        challengeScores: { ...state.challengeScores, [challengeId]: 0 },
        challengeSubscores,
        race: raceFrom(packetRoutes, state.challengeStatus),
      }
    }),
  routePacket: (challengeId, packetId, routedTo, fellBack) =>
    set((state) => {
      const known = allPackets.some(
        (packet) => packet.id === packetId && packet.challengeId === challengeId,
      )
      if (!known) {
        return state
      }
      const packetRoutes = {
        ...state.packetRoutes,
        [packetId]: { routedTo, fellBack },
      }
      return {
        packetRoutes,
        race: raceFrom(packetRoutes, state.challengeStatus),
      }
    }),
  skipChallenge: (challengeId) =>
    set((state) => {
      const challenge = gameConfig.challenges.find((item) => item.id === challengeId)
      if (!challenge || state.challengeStatus[challengeId] !== 'pending') {
        return state
      }
      const packetRoutes = { ...state.packetRoutes }
      for (const packet of challenge.packets) {
        packetRoutes[packet.id] = {
          routedTo: leftLaneEngine(packet),
          fellBack: false,
        }
      }
      const challengeStatus = {
        ...state.challengeStatus,
        [challengeId]: 'skipped' as ChallengeStatus,
      }
      return {
        packetRoutes,
        challengeStatus,
        challengeScores: { ...state.challengeScores, [challengeId]: 0 },
        race: raceFrom(packetRoutes, challengeStatus),
      }
    }),
  recordFallback: (packetId) =>
    set((state) => {
      const route = state.packetRoutes[packetId]
      if (!route || route.fellBack) {
        return state
      }
      const packetRoutes = {
        ...state.packetRoutes,
        [packetId]: { ...route, fellBack: true },
      }
      return {
        packetRoutes,
        race: raceFrom(packetRoutes, state.challengeStatus),
      }
    }),
  updateRace: (progress) =>
    set({
      race: {
        leftProgress: clamp(progress.leftProgress, 0, 1),
        rightProgress: clamp(progress.rightProgress, 0, 1),
      },
    }),
  setRemainingMs: (ms) => set({ remainingMs: Math.max(0, ms) }),
  setCaption: (text) => set({ caption: text }),
  setChallengeProgress: (challengeId, score) =>
    set((state) => {
      if (state.challengeStatus[challengeId] !== 'pending') {
        return state
      }
      return {
        challengeScores: {
          ...state.challengeScores,
          [challengeId]: Math.max(
            state.challengeScores[challengeId],
            clamp(score, 0, gameConfig.scoring.maxScore),
          ),
        },
      }
    }),
  completeChallenge: (payload) =>
    set((state) => {
      if (state.challengeStatus[payload.challengeId] !== 'pending') {
        return state
      }
      return {
        challengeStatus: {
          ...state.challengeStatus,
          [payload.challengeId]: payload.status,
        },
        challengeScores: {
          ...state.challengeScores,
          [payload.challengeId]: clamp(
            payload.score,
            0,
            gameConfig.scoring.maxScore,
          ),
        },
        challengeSubscores: payload.subscores
          ? {
              ...state.challengeSubscores,
              [payload.challengeId]: payload.subscores,
            }
          : state.challengeSubscores,
      }
    }),
}))

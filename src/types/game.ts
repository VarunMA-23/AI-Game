export type Phase =
  | 'landing'
  | 'setup'
  | 'challenges'
  | 'race-finish'
  | 'persona'
  | 'store'
  | 'value'
  | 'next-step'
  | 'staff'

export type Mode = 'DEMO' | 'LIVE'

export type Engine = 'CPU' | 'GPU' | 'NPU'

export type FallbackEngine = 'CPU' | 'GPU'

export type NpuBenefit = 'none' | 'low' | 'high'

export type ChallengeId =
  | 'study-sprint'
  | 'creator-mode'
  | 'privacy-shield'
  | 'stream-night'
  | 'battery-escape'

export type PacketId = string

export type PersonaId = 'THE_LEARNER' | 'THE_CREATOR' | 'THE_POWER_USER' | 'THE_GAMER'

export type ChallengeStatus = 'pending' | 'completed' | 'skipped' | 'timed-out'

export interface PacketRoute {
  routedTo: Engine
  fellBack: boolean
}

export interface RaceProgress {
  leftProgress: number
  rightProgress: number
}

export interface ConceptOption {
  id: string
  label: string
  correct: boolean
}

export interface ToolOption {
  id: string
  label: string
  order: number
}

export interface FollowUpOption {
  id: string
  label: string
}

export interface PacketDefinition {
  id: PacketId
  label: string
  npuCompatible: boolean
  gpuSuitable: boolean
  npuBenefit: NpuBenefit
  fallbackEngine: FallbackEngine
  defaultEngine: Engine
  caption: string
}

export interface EffectivePacket extends PacketDefinition {
  challengeId: ChallengeId
  illustrativeRoutingWeight: number
  fallbackDelayMs: number
}

export interface ChallengeDefinition {
  id: ChallengeId
  index: number
  title: string
  category: string
  scenario: string
  objective: string
  educationalMessage: string
  timeLimitMs: number
  demoLabel?: string
  resultLine?: string
  concepts?: ConceptOption[]
  tools?: ToolOption[]
  followUp?: {
    prompt: string
    correctId: string
    options: FollowUpOption[]
  }
  packets: EffectivePacket[]
}

export interface TimelineSegment {
  startMs: number
  endMs: number
  phase: Phase
  challengeIndex: number
}

export interface RaceConfig {
  disclosure: string
  fallbackCaptionTemplate: string
  noChangeCaption: string
  skipCaption: string
  defaultFallbackDelayMs: number
  maxParticles: number
  progress: {
    leftLaneFactor: number
    npuRouteFactor: number
    suitableRouteFactor: number
    wrongRouteFactor: number
    fallbackFactor: number
  }
  segments: TimelineSegment[]
}

export interface ScoringConfig {
  maxScore: number
  studySprint: {
    pointsPerCorrect: number
    penaltyPerIncorrect: number
    completionBonus: number
    timeBonus: number
    timeThresholdMs: number
  }
  creatorMode: {
    pointsPerStep: number
    pointsPerRoute: number
    completionBonus: number
    timeBonus: number
    timeThresholdMs: number
  }
  privacyShield: {
    localPoints: number
    leakBonus: number
    completionBonus: number
    timeBonus: number
    timeThresholdMs: number
  }
  streamNight: {
    pointsPerCorrectRoute: number
    stabilityWeight: number
    stabilityPenaltyPerWrongRoute: number
    timeBonus: number
    timeThresholdMs: number
  }
  batteryEscape: {
    pointsPerCorrectRoute: number
    batteryWeight: number
    timeBonus: number
    timeThresholdMs: number
    startingBattery: number
    baseDrain: number
    gpuSuitableDrain: number
    lowNpuDrain: number
    highNpuDrain: number
  }
}

export interface GameConfig {
  challenges: ChallengeDefinition[]
  race: RaceConfig
  scoring: ScoringConfig
}

export interface PacketRoutedPayload {
  challengeId: ChallengeId
  packetId: PacketId
  routedTo: Engine
  fellBack: boolean
}

export interface PacketFallbackPayload {
  challengeId: ChallengeId
  packetId: PacketId
  from: 'NPU'
  to: FallbackEngine
  captionKey: string
}

export interface RaceUpdatePayload {
  leftProgress: number
  rightProgress: number
  segmentId: string
}

export interface TimerTickPayload {
  challengeId: ChallengeId
  remainingMs: number
}

export interface ChallengeCompletePayload {
  challengeId: ChallengeId
  status: ChallengeStatus
  score: number
  durationMs: number
  subscores?: Record<string, number>
}

export interface ShowSegmentPayload {
  phase: Phase
  challengeIndex: number
}

export interface SkipChallengePayload {
  challengeId: ChallengeId
}

export interface GameEventMap {
  'packet:routed': PacketRoutedPayload
  'packet:fallback': PacketFallbackPayload
  'race:update': RaceUpdatePayload
  'timer:tick': TimerTickPayload
  'challenge:complete': ChallengeCompletePayload
  'challenge:progress': Pick<ChallengeCompletePayload, 'challengeId' | 'score'>
  'challenge:skip': SkipChallengePayload
  'game:show': ShowSegmentPayload
  'game:caption': { text: string; durationMs: number }
}

export interface GameState {
  sessionId: string
  storeId: string
  mode: Mode
  phase: Phase
  currentChallenge: number
  startedAt: number | null
  completedAt: number | null
  challengeScores: Record<ChallengeId, number>
  challengeStatus: Record<ChallengeId, ChallengeStatus>
  challengeSubscores: Partial<Record<ChallengeId, Record<string, number>>>
  packetRoutes: Record<PacketId, PacketRoute>
  race: RaceProgress
  remainingMs: number
  caption: string
  persona: PersonaId | null
  recommendedModelCodes: string[]
  storeReady: boolean
  handoffPending: boolean
  selectedBundle?: string | null
  maxBudget?: number
}

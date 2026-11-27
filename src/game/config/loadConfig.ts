import challengeData from '../../data/challenges.json'
import raceData from '../../data/race.json'
import scoringData from '../../data/scoring.json'
import type {
  ChallengeDefinition,
  ChallengeId,
  ConceptOption,
  EffectivePacket,
  Engine,
  FallbackEngine,
  FollowUpOption,
  GameConfig,
  NpuBenefit,
  Phase,
  RaceConfig,
  ScoringConfig,
  TimelineSegment,
  ToolOption,
} from '../../types/game'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isEngine = (value: unknown): value is Engine =>
  value === 'CPU' || value === 'GPU' || value === 'NPU'

const isFallbackEngine = (value: unknown): value is FallbackEngine =>
  value === 'CPU' || value === 'GPU'

const isBenefit = (value: unknown): value is NpuBenefit =>
  value === 'none' || value === 'low' || value === 'high'

const isPhase = (value: unknown): value is Phase =>
  value === 'landing' ||
  value === 'setup' ||
  value === 'challenges' ||
  value === 'race-finish' ||
  value === 'store' ||
  value === 'value' ||
  value === 'next-step' ||
  value === 'staff'

const isChallengeId = (value: unknown): value is ChallengeId =>
  value === 'study-sprint' ||
  value === 'creator-mode' ||
  value === 'privacy-shield' ||
  value === 'stream-night' ||
  value === 'battery-escape'

const fail: (path: string) => never = (path) => {
  throw new Error(`Invalid game config at ${path}`)
}

const readRecord = (value: unknown, path: string): Record<string, unknown> => {
  if (!isRecord(value)) {
    fail(path)
  }
  return value
}

const readArray = (value: unknown, path: string): unknown[] => {
  if (!Array.isArray(value)) {
    fail(path)
  }
  return value
}

const readString = (
  source: Record<string, unknown>,
  key: string,
  path: string,
): string => {
  const value = source[key]
  if (typeof value !== 'string' || value.length === 0) {
    fail(`${path}.${key}`)
  }
  return value
}

const readNumber = (
  source: Record<string, unknown>,
  key: string,
  path: string,
): number => {
  const value = source[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`${path}.${key}`)
  }
  return value
}

const readBoolean = (
  source: Record<string, unknown>,
  key: string,
  path: string,
): boolean => {
  const value = source[key]
  if (typeof value !== 'boolean') {
    fail(`${path}.${key}`)
  }
  return value
}

const parsePacket = (
  raw: unknown,
  challengeId: ChallengeId,
  tuning: Record<string, unknown>,
  seenPacketIds: Set<string>,
): EffectivePacket => {
  const path = `challenges.${challengeId}.packets`
  const record = readRecord(raw, path)
  const id = readString(record, 'id', path)

  if (seenPacketIds.has(id)) {
    fail(`duplicate packet id ${id}`)
  }
  seenPacketIds.add(id)

  const fallbackEngine = record.fallbackEngine
  const defaultEngine = record.defaultEngine
  const benefit = record.npuBenefit

  if (!isFallbackEngine(fallbackEngine)) {
    fail(`${path}.${id}.fallbackEngine`)
  }
  if (!isEngine(defaultEngine)) {
    fail(`${path}.${id}.defaultEngine`)
  }
  if (!isBenefit(benefit)) {
    fail(`${path}.${id}.npuBenefit`)
  }

  const tuningRecord = readRecord(tuning[id], `race.packetTuning.${id}`)

  return {
    id,
    challengeId,
    label: readString(record, 'label', `${path}.${id}`),
    npuCompatible: readBoolean(record, 'npuCompatible', `${path}.${id}`),
    gpuSuitable: readBoolean(record, 'gpuSuitable', `${path}.${id}`),
    npuBenefit: benefit,
    fallbackEngine,
    defaultEngine,
    caption: readString(record, 'caption', `${path}.${id}`),
    illustrativeRoutingWeight: readNumber(
      tuningRecord,
      'illustrativeRoutingWeight',
      `race.packetTuning.${id}`,
    ),
    fallbackDelayMs: readNumber(
      tuningRecord,
      'fallbackDelayMs',
      `race.packetTuning.${id}`,
    ),
  }
}

const parseConcepts = (raw: unknown[], path: string): ConceptOption[] =>
  raw.map((item) => {
    const record = readRecord(item, path)
    return {
      id: readString(record, 'id', path),
      label: readString(record, 'label', path),
      correct: readBoolean(record, 'correct', path),
    }
  })

const parseTools = (raw: unknown[], path: string): ToolOption[] =>
  raw.map((item) => {
    const record = readRecord(item, path)
    return {
      id: readString(record, 'id', path),
      label: readString(record, 'label', path),
      order: readNumber(record, 'order', path),
    }
  })

const parseOptions = (raw: unknown[], path: string): FollowUpOption[] =>
  raw.map((item) => {
    const record = readRecord(item, path)
    return {
      id: readString(record, 'id', path),
      label: readString(record, 'label', path),
    }
  })

const parseChallenge = (
  raw: unknown,
  tuning: Record<string, unknown>,
  seenPacketIds: Set<string>,
): ChallengeDefinition => {
  const path = 'challenges'
  const record = readRecord(raw, path)
  const idValue = record.id
  if (!isChallengeId(idValue)) {
    fail(`${path}.id`)
  }
  const id = idValue
  const challengePath = `${path}.${id}`

  const packets = readArray(record.packets, `${challengePath}.packets`).map(
    (packet) => parsePacket(packet, id, tuning, seenPacketIds),
  )

  if (packets.length === 0) {
    fail(`${challengePath}.packets`)
  }

  const challenge: ChallengeDefinition = {
    id,
    index: readNumber(record, 'index', challengePath),
    title: readString(record, 'title', challengePath),
    category: readString(record, 'category', challengePath),
    scenario: readString(record, 'scenario', challengePath),
    objective: readString(record, 'objective', challengePath),
    educationalMessage: readString(record, 'educationalMessage', challengePath),
    timeLimitMs: readNumber(record, 'timeLimitMs', challengePath),
    packets,
  }

  if (typeof record.demoLabel === 'string') {
    challenge.demoLabel = record.demoLabel
  }
  if (typeof record.resultLine === 'string') {
    challenge.resultLine = record.resultLine
  }
  if (record.concepts !== undefined) {
    challenge.concepts = parseConcepts(
      readArray(record.concepts, `${challengePath}.concepts`),
      `${challengePath}.concepts`,
    )
  }
  if (record.tools !== undefined) {
    challenge.tools = parseTools(
      readArray(record.tools, `${challengePath}.tools`),
      `${challengePath}.tools`,
    )
  }
  if (record.followUp !== undefined) {
    const followUp = readRecord(record.followUp, `${challengePath}.followUp`)
    challenge.followUp = {
      prompt: readString(followUp, 'prompt', `${challengePath}.followUp`),
      correctId: readString(
        followUp,
        'correctId',
        `${challengePath}.followUp`,
      ),
      options: parseOptions(
        readArray(followUp.options, `${challengePath}.followUp.options`),
        `${challengePath}.followUp.options`,
      ),
    }
  }

  return challenge
}

const parseRaceConfig = (): RaceConfig => {
  const race = readRecord(raceData, 'race')
  const progress = readRecord(race.progress, 'race.progress')
  const segments = readArray(race.segments, 'race.segments').map((raw) => {
    const record = readRecord(raw, 'race.segments')
    const phase = record.phase
    if (!isPhase(phase)) {
      fail('race.segments.phase')
    }
    const segment: TimelineSegment = {
      startMs: readNumber(record, 'startMs', 'race.segments'),
      endMs: readNumber(record, 'endMs', 'race.segments'),
      phase,
      challengeIndex: readNumber(record, 'challengeIndex', 'race.segments'),
    }
    return segment
  })

  if (segments.length === 0) {
    fail('race.segments')
  }

  return {
    disclosure: readString(race, 'disclosure', 'race'),
    fallbackCaptionTemplate: readString(
      race,
      'fallbackCaptionTemplate',
      'race',
    ),
    noChangeCaption: readString(race, 'noChangeCaption', 'race'),
    skipCaption: readString(race, 'skipCaption', 'race'),
    defaultFallbackDelayMs: readNumber(
      race,
      'defaultFallbackDelayMs',
      'race',
    ),
    maxParticles: readNumber(race, 'maxParticles', 'race'),
    progress: {
      leftLaneFactor: readNumber(progress, 'leftLaneFactor', 'race.progress'),
      npuRouteFactor: readNumber(progress, 'npuRouteFactor', 'race.progress'),
      suitableRouteFactor: readNumber(
        progress,
        'suitableRouteFactor',
        'race.progress',
      ),
      wrongRouteFactor: readNumber(
        progress,
        'wrongRouteFactor',
        'race.progress',
      ),
      fallbackFactor: readNumber(progress, 'fallbackFactor', 'race.progress'),
    },
    segments,
  }
}

const parseScoringConfig = (): ScoringConfig => {
  const scoring = readRecord(scoringData, 'scoring')
  const section = (key: string) =>
    readRecord(scoring[key], `scoring.${key}`)

  const studySprint = section('studySprint')
  const creatorMode = section('creatorMode')
  const privacyShield = section('privacyShield')
  const streamNight = section('streamNight')
  const batteryEscape = section('batteryEscape')

  return {
    maxScore: readNumber(scoring, 'maxScore', 'scoring'),
    studySprint: {
      pointsPerCorrect: readNumber(
        studySprint,
        'pointsPerCorrect',
        'scoring.studySprint',
      ),
      penaltyPerIncorrect: readNumber(
        studySprint,
        'penaltyPerIncorrect',
        'scoring.studySprint',
      ),
      completionBonus: readNumber(
        studySprint,
        'completionBonus',
        'scoring.studySprint',
      ),
      timeBonus: readNumber(
        studySprint,
        'timeBonus',
        'scoring.studySprint',
      ),
      timeThresholdMs: readNumber(
        studySprint,
        'timeThresholdMs',
        'scoring.studySprint',
      ),
    },
    creatorMode: {
      pointsPerStep: readNumber(
        creatorMode,
        'pointsPerStep',
        'scoring.creatorMode',
      ),
      pointsPerRoute: readNumber(
        creatorMode,
        'pointsPerRoute',
        'scoring.creatorMode',
      ),
      completionBonus: readNumber(
        creatorMode,
        'completionBonus',
        'scoring.creatorMode',
      ),
      timeBonus: readNumber(
        creatorMode,
        'timeBonus',
        'scoring.creatorMode',
      ),
      timeThresholdMs: readNumber(
        creatorMode,
        'timeThresholdMs',
        'scoring.creatorMode',
      ),
    },
    privacyShield: {
      localPoints: readNumber(
        privacyShield,
        'localPoints',
        'scoring.privacyShield',
      ),
      leakBonus: readNumber(
        privacyShield,
        'leakBonus',
        'scoring.privacyShield',
      ),
      completionBonus: readNumber(
        privacyShield,
        'completionBonus',
        'scoring.privacyShield',
      ),
      timeBonus: readNumber(
        privacyShield,
        'timeBonus',
        'scoring.privacyShield',
      ),
      timeThresholdMs: readNumber(
        privacyShield,
        'timeThresholdMs',
        'scoring.privacyShield',
      ),
    },
    streamNight: {
      pointsPerCorrectRoute: readNumber(
        streamNight,
        'pointsPerCorrectRoute',
        'scoring.streamNight',
      ),
      stabilityWeight: readNumber(
        streamNight,
        'stabilityWeight',
        'scoring.streamNight',
      ),
      stabilityPenaltyPerWrongRoute: readNumber(
        streamNight,
        'stabilityPenaltyPerWrongRoute',
        'scoring.streamNight',
      ),
      timeBonus: readNumber(
        streamNight,
        'timeBonus',
        'scoring.streamNight',
      ),
      timeThresholdMs: readNumber(
        streamNight,
        'timeThresholdMs',
        'scoring.streamNight',
      ),
    },
    batteryEscape: {
      pointsPerCorrectRoute: readNumber(
        batteryEscape,
        'pointsPerCorrectRoute',
        'scoring.batteryEscape',
      ),
      batteryWeight: readNumber(
        batteryEscape,
        'batteryWeight',
        'scoring.batteryEscape',
      ),
      timeBonus: readNumber(
        batteryEscape,
        'timeBonus',
        'scoring.batteryEscape',
      ),
      timeThresholdMs: readNumber(
        batteryEscape,
        'timeThresholdMs',
        'scoring.batteryEscape',
      ),
      startingBattery: readNumber(
        batteryEscape,
        'startingBattery',
        'scoring.batteryEscape',
      ),
      baseDrain: readNumber(
        batteryEscape,
        'baseDrain',
        'scoring.batteryEscape',
      ),
      gpuSuitableDrain: readNumber(
        batteryEscape,
        'gpuSuitableDrain',
        'scoring.batteryEscape',
      ),
      lowNpuDrain: readNumber(
        batteryEscape,
        'lowNpuDrain',
        'scoring.batteryEscape',
      ),
      highNpuDrain: readNumber(
        batteryEscape,
        'highNpuDrain',
        'scoring.batteryEscape',
      ),
    },
  }
}

const buildConfig = (): GameConfig => {
  const race = parseRaceConfig()
  const tuning = readRecord(
    readRecord(raceData, 'race').packetTuning,
    'race.packetTuning',
  )
  const seenPacketIds = new Set<string>()
  const challenges = readArray(
    readRecord(challengeData, 'challenges').challenges,
    'challenges',
  ).map((raw) => parseChallenge(raw, tuning, seenPacketIds))

  if (challenges.length === 0) {
    fail('challenges')
  }

  return { challenges, race, scoring: parseScoringConfig() }
}

export const gameConfig: GameConfig = buildConfig()

export const allPackets: EffectivePacket[] = gameConfig.challenges.flatMap(
  (challenge) => challenge.packets,
)

export const getChallenge = (id: ChallengeId): ChallengeDefinition => {
  const challenge = gameConfig.challenges.find((item) => item.id === id)
  if (!challenge) {
    fail(`missing challenge ${id}`)
  }
  return challenge
}

export const getChallengeByIndex = (index: number): ChallengeDefinition | undefined =>
  gameConfig.challenges.find((challenge) => challenge.index === index)

export const segmentAt = (elapsedMs: number): TimelineSegment => {
  const segments = gameConfig.race.segments
  if (elapsedMs < segments[0].startMs) {
    return segments[0]
  }
  const match = segments.find(
    (segment) => elapsedMs >= segment.startMs && elapsedMs < segment.endMs,
  )
  if (match) {
    return match
  }
  return segments[segments.length - 1]
}

import personaData from '../../data/personas.json'
import type { PersonaDefinition, PersonaResult, PersonaSignals } from '../../types/product'

const definitions = personaData.personas as PersonaDefinition[]

const clampScore = (value: number): number => Math.min(200, Math.max(0, value))

const toTwoHundred = (value: number | undefined, fallback: number): number =>
  value === undefined ? fallback : clampScore(value * 2)

export const calculatePersona = (signals: PersonaSignals): PersonaResult => {
  const scores = signals.challengeScores
  const subscores = signals.challengeSubscores
  const statuses = signals.challengeStatus
  const statusValues = Object.values(statuses)
  const completedCount = statusValues.filter((status) => status === 'completed').length
  const skippedCount = statusValues.filter(
    (status) => status === 'skipped' || status === 'timed-out',
  ).length
  const skipHeavy = completedCount < 2 || skippedCount >= 3

  const study = clampScore(scores['study-sprint'] ?? 0)
  const creator = clampScore(scores['creator-mode'] ?? 0)
  const privacy = clampScore(scores['privacy-shield'] ?? 0)
  const stream = clampScore(scores['stream-night'] ?? 0)
  const battery = clampScore(scores['battery-escape'] ?? 0)
  const gaming = toTwoHundred(
    subscores['stream-night']?.gamingRouting,
    stream * 0.5,
  )
  const multitasking = toTwoHundred(
    subscores['stream-night']?.multitaskingRouting,
    stream * 0.5,
  )

  const primaryByPersona: Record<string, number> = {
    THE_LEARNER: study,
    THE_CREATOR: creator,
    THE_POWER_USER: multitasking,
    THE_GAMER: gaming,
  }
  const secondaryByPersona: Record<string, number> = {
    THE_LEARNER: privacy,
    THE_CREATOR: stream,
    THE_POWER_USER: (privacy + battery) / 2,
    THE_GAMER: creator,
  }

  const categoryScores = Object.fromEntries(
    definitions.map((definition) => [
      definition.id,
      primaryByPersona[definition.id] + secondaryByPersona[definition.id] * 0.5,
    ]),
  )

  const ranked = [...definitions].sort((left, right) => {
    const weightedDifference =
      categoryScores[right.id] - categoryScores[left.id]
    if (weightedDifference !== 0) {
      return weightedDifference
    }
    const primaryDifference =
      primaryByPersona[right.id] - primaryByPersona[left.id]
    if (primaryDifference !== 0) {
      return primaryDifference
    }
    if (left.id === 'THE_POWER_USER') {
      return -1
    }
    if (right.id === 'THE_POWER_USER') {
      return 1
    }
    return definitions.indexOf(left) - definitions.indexOf(right)
  })

  const chosen = skipHeavy
    ? definitions.find((definition) => definition.id === 'THE_POWER_USER')
    : ranked[0]
  const definition = chosen ?? definitions[0]

  return {
    persona: definition.id,
    priorities: [...definition.priorities],
    rankingKeys: [...definition.rankingKeys],
    primaryRaw: primaryByPersona[definition.id],
    note: skipHeavy ? 'Play again to unlock a sharper match.' : null,
    categoryScores,
  }
}

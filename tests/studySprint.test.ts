import { describe, expect, it } from 'vitest'
import { gameConfig } from '../src/game/config/loadConfig'
import { scoreStudySprint } from '../src/game/scoring/studySprint'

const rules = gameConfig.scoring

describe('Study Sprint scorer', () => {
  it('uses a nine-concept pool with two distractors', () => {
    const concepts = gameConfig.challenges.find(
      (challenge) => challenge.id === 'study-sprint',
    )?.concepts
    expect(concepts).toHaveLength(9)
    expect(concepts?.filter((concept) => concept.correct)).toHaveLength(7)
    expect(concepts?.filter((concept) => !concept.correct)).toHaveLength(2)
  })

  it('awards the full 200 only for a fast, fully correct summary', () => {
    expect(
      scoreStudySprint(
        { correct: 5, incorrect: 0, elapsedMs: 12000, completed: true },
        rules,
      ),
    ).toBe(200)
  })

  it('does not award a speed bonus after the threshold', () => {
    expect(
      scoreStudySprint(
        { correct: 5, incorrect: 0, elapsedMs: 20000, completed: true },
        rules,
      ),
    ).toBe(180)
  })

  it('penalises distractors and never goes below zero', () => {
    expect(
      scoreStudySprint(
        { correct: 3, incorrect: 2, elapsedMs: 10000, completed: true },
        rules,
      ),
    ).toBe(60)
    expect(
      scoreStudySprint(
        { correct: 0, incorrect: 5, elapsedMs: 10000, completed: true },
        rules,
      ),
    ).toBe(0)
  })

  it('scores the best partial result at timeout', () => {
    const score = scoreStudySprint(
      { correct: 4, incorrect: 0, elapsedMs: 25000, completed: false },
      rules,
    )
    expect(score).toBe(120)
    expect(score).toBeLessThanOrEqual(rules.maxScore)
  })
})

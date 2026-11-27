import { describe, expect, it } from 'vitest'
import { calculatePersona } from '../src/features/recommendations/personaEngine'
import { buildScoringSummary } from '../src/features/recommendations/scoringSummary'
import { checkStoreReadiness } from '../src/features/store-readiness/gate'
import { rankModels } from '../src/features/recommendations/modelRanking'
import { buildComparisonRows } from '../src/features/value-compare/valueCompare'
import { buildFitRows, FIT_CLOSING_LINE } from '../src/features/fit-panel/fitPanel'
import {
  buildCompetitorRows,
  competitorClasses,
} from '../src/features/competitors/competitorContent'
import { buildQrPayload } from '../src/features/persona-card/qrPayload'
import { verifiedNpuClass } from '../src/features/recommendations/verifiedSpecs'
import type { ChallengeId, ChallengeStatus } from '../src/types/game'
import type { InventoryModel, PersonaResult, StoreInventory } from '../src/types/product'

const challengeIds: ChallengeId[] = [
  'study-sprint',
  'creator-mode',
  'privacy-shield',
  'stream-night',
  'battery-escape',
]

const completedStatuses = Object.fromEntries(
  challengeIds.map((id) => [id, 'completed' as ChallengeStatus]),
) as Record<ChallengeId, ChallengeStatus>

const model = (overrides: Partial<InventoryModel>): InventoryModel => ({
  code: 'IN-A1',
  brand: 'Brand',
  model: 'Model A',
  processorFamily: 'Intel Core Ultra',
  processorModel: 'Exact model',
  npu: { available: true, classFromIntelSpec: 'Intel AI Boost', tops: null },
  gpu: 'Intel Arc graphics',
  ram: '16GB',
  storage: '512GB SSD',
  batteryWh: 70,
  displayNote: '14-inch display',
  warrantyMonths: 24,
  price: 80000,
  inStock: true,
  sourceUrls: ['https://example.invalid/model'],
  lastVerified: '2026-11-20',
  aiFeatures: [],
  supportedApplications: [],
  coolingNote: 'Manufacturer cooling note',
  ...overrides,
})

const inventory = (models: InventoryModel[]): StoreInventory => ({
  storeId: 'DEL01',
  storeName: 'Pilot Store',
  currency: 'INR',
  priceDate: '2026-11-20',
  models,
})

const learner: PersonaResult = {
  persona: 'THE_LEARNER',
  priorities: ['Battery capacity', 'RAM', 'Price'],
  rankingKeys: ['batteryWh', 'ram', 'price'],
  primaryRaw: 200,
  note: null,
  categoryScores: {},
}

describe('phase 4 recommendations', () => {
  it('calculates weighted personas and handles tie-breaks', () => {
    const zeroScores = Object.fromEntries(
      challengeIds.map((id) => [id, 0]),
    ) as Record<ChallengeId, number>
    const tie = calculatePersona({
      challengeScores: zeroScores,
      challengeSubscores: {},
      challengeStatus: completedStatuses,
    })
    expect(tie.persona).toBe('THE_POWER_USER')

    const learnerResult = calculatePersona({
      challengeScores: {
        ...zeroScores,
        'study-sprint': 200,
        'privacy-shield': 200,
      },
      challengeSubscores: {},
      challengeStatus: completedStatuses,
    })
    expect(learnerResult.persona).toBe('THE_LEARNER')

    const gamerResult = calculatePersona({
      challengeScores: {
        ...zeroScores,
        'creator-mode': 100,
        'stream-night': 200,
      },
      challengeSubscores: {
        'stream-night': { gamingRouting: 200, multitaskingRouting: 0 },
      },
      challengeStatus: completedStatuses,
    })
    expect(gamerResult.persona).toBe('THE_GAMER')
  })

  it('assigns the power user persona with a note for skip-heavy sessions', () => {
    const result = calculatePersona({
      challengeScores: Object.fromEntries(
        challengeIds.map((id) => [id, 0]),
      ) as Record<ChallengeId, number>,
      challengeSubscores: {},
      challengeStatus: {
        ...completedStatuses,
        'study-sprint': 'skipped',
        'creator-mode': 'skipped',
        'privacy-shield': 'skipped',
      },
    })
    expect(result.persona).toBe('THE_POWER_USER')
    expect(result.note).toBe('Play again to unlock a sharper match.')
  })

  it('passes the readiness gate only with two verified in-stock models', () => {
    const now = new Date('2026-11-26T00:00:00Z')
    const pass = inventory([
      model({ code: 'IN-A1' }),
      model({ code: 'IN-B2' }),
    ])
    expect(checkStoreReadiness(pass, now).ready).toBe(true)

    const fail = inventory([
      model({ code: 'IN-A1' }),
      model({ code: 'IN-B2', inStock: false }),
    ])
    expect(checkStoreReadiness(fail, now).ready).toBe(false)
  })

  it('ranks in-stock models by persona priority without inventing values', () => {
    const picks = rankModels(
      [
        model({ code: 'IN-A1', batteryWh: 50, price: 70000 }),
        model({ code: 'IN-B2', batteryWh: 80, price: 90000 }),
        model({ code: 'IN-C3', batteryWh: 60, price: 60000, inStock: false }),
      ],
      learner,
    )
    expect(picks.top?.code).toBe('IN-B2')
    expect(picks.value?.code).toBe('IN-A1')
    expect(picks.alternative).toBeNull()
  })

  it('builds comparison, fit and competitor content with null-safe values', () => {
    const top = model({})
    const value = model({
      code: 'IN-B2',
      batteryWh: null,
      price: null,
      warrantyMonths: null,
      npu: { available: false, classFromIntelSpec: null, tops: null },
      sourceUrls: [],
    })
    const rows = buildComparisonRows(top, value)
    expect(rows.find((row) => row.label === 'Battery capacity')?.valueValue).toBe(
      'Not shown',
    )
    expect(rows.find((row) => row.label === 'NPU class')?.plainLanguage).toContain(
      'Ask our team',
    )

    const fitRows = buildFitRows(['Battery capacity', 'NPU class'], value, null)
    expect(fitRows[0].value).toBe('Ask our team')
    expect(fitRows[1].source).toBe('Ask our team')
    expect(FIT_CLOSING_LINE).toContain('Compare the exact configuration')

    for (const competitor of competitorClasses) {
      expect(competitor.strengths.length).toBeGreaterThan(0)
      expect(competitor.intelStrengths.length).toBeGreaterThan(0)
      expect(competitor.npuSourceUrl).toMatch(/^https:\/\//)
      const labels = buildCompetitorRows(competitor, learner).map((row) => row.label)
      expect(labels).toEqual(
        expect.arrayContaining([
          'NPU approach',
          'Memory',
          'Storage',
          'Battery capacity',
          'App support for Battery capacity, RAM, Price',
          'Competitor strength',
        ]),
      )
    }
  })

  it('shows an NPU class only when an Intel specification source is present', () => {
    const unverified = model({})
    expect(verifiedNpuClass(unverified)).toBeNull()

    const verified = model({
      sourceUrls: [
        'https://www.intel.com/content/www/us/en/products/sku/240961/example.html',
      ],
    })
    expect(verifiedNpuClass(verified)).toBe('Intel AI Boost')
  })

  it('builds QR payloads with no shopper identifiers', () => {
    expect(
      buildQrPayload({
        storeId: 'DEL01',
        persona: 'THE_CREATOR',
        modelCodes: ['IN-A1', 'IN-B2'],
      }),
    ).toBe('IPCS|STORE:DEL01|P:CREATOR|M:IN-A1,IN-B2')
  })

  it('summarises capped scores and achievements', () => {
    const summary = buildScoringSummary({
      scores: {
        'study-sprint': 200,
        'creator-mode': 140,
        'privacy-shield': 100,
        'stream-night': 90,
        'battery-escape': 80,
      },
      statuses: completedStatuses,
      startedAt: 1000,
      completedAt: 181000,
    })
    expect(summary.total).toBe(610)
    expect(summary.completedCount).toBe(5)
    expect(summary.durationMs).toBe(180000)
    expect(summary.achievement).toBe('Productivity Master')
  })

  it('does not award an achievement before a completed challenge', () => {
    const summary = buildScoringSummary({
      scores: Object.fromEntries(challengeIds.map((id) => [id, 0])) as Record<
        ChallengeId,
        number
      >,
      statuses: Object.fromEntries(
        challengeIds.map((id) => [id, 'pending' as ChallengeStatus]),
      ) as Record<ChallengeId, ChallengeStatus>,
      startedAt: 1000,
      completedAt: 5000,
    })
    expect(summary.achievement).toBe('No achievement yet')
  })
})

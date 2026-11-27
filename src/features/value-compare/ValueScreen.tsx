import { useEffect, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EndingFrame from '../../components/common/EndingFrame'
import { useDeadlineNavigation } from '../challenges/useDeadlineNavigation'
import { useRequireSession } from '../challenges/useRequireSession'
import { buildCompetitorRows, competitorClasses } from '../competitors/competitorContent'
import { FIT_CLOSING_LINE, buildFitRows } from '../fit-panel/fitPanel'
import { buildComparisonRows } from '../value-compare/valueCompare'
import { checkStoreReadiness } from '../store-readiness/gate'
import { loadInventory } from '../../services/inventory/loadInventory'
import { getPersonaDefinition } from '../../services/recommendations/loadPersona'
import { useGameStore } from '../../store/gameStore'
import type { InventoryModel } from '../../types/product'
import { useIdleReset } from '../onboarding/useIdleReset'

const checklist = [
  'Which processor family and exact model is it?',
  'Does it have an NPU, and which AI features do the apps I use support?',
  'How much RAM, and can it be upgraded?',
  "What's the battery capacity, and does the manufacturer publish a battery-life test?",
  "What's the warranty and return policy?",
]

export default function ValueScreen() {
  const navigate = useNavigate()
  const sessionReady = useRequireSession()
  const storeId = useGameStore((state) => state.storeId)
  const startedAt = useGameStore((state) => state.startedAt)
  const persona = useGameStore((state) => state.persona)
  const codes = useGameStore((state) => state.recommendedModelCodes)
  const setPhase = useGameStore((state) => state.setPhase)
  const [competitorId, setCompetitorId] = useState(competitorClasses[0]?.id ?? '')
  const inventory = useMemo(() => loadInventory(storeId), [storeId])
  const readiness = useMemo(() => checkStoreReadiness(inventory), [inventory])
  const definition = getPersonaDefinition(persona)
  const competitor =
    competitorClasses.find((item) => item.id === competitorId) ?? competitorClasses[0]
  const competitorRows = competitor ? buildCompetitorRows(competitor, definition) : []

  useIdleReset(45000)
  useDeadlineNavigation(startedAt, 175000, '/next-step')

  useEffect(() => {
    setPhase('value', 0)
  }, [setPhase])

  if (!sessionReady) {
    return null
  }

  const top = codes
    .map((code) => inventory.models.find((model) => model.code === code))
    .find((model): model is InventoryModel => Boolean(model)) ?? null
  const cheapest =
    [...inventory.models]
      .filter((model) => model.inStock)
      .sort(
        (left, right) =>
          (left.price ?? Number.POSITIVE_INFINITY) -
            (right.price ?? Number.POSITIVE_INFINITY) ||
          left.code.localeCompare(right.code),
      )[0] ?? null
  const rows = buildComparisonRows(top, cheapest)
  const fitRows = buildFitRows(definition.priorities, top, inventory.priceDate)

  return (
    <EndingFrame
      kicker="Compare before you decide"
      title="WHY THIS FITS YOU."
      footer={
        <button
          type="button"
          className="primary-button"
          onClick={() => navigate('/next-step')}
        >
          Next: Your Specialist <ArrowRight size={18} aria-hidden="true" />
        </button>
      }
    >
      {readiness.ready && rows.length > 0 ? (
        <section className="value-section">
          <h2>Top pick vs cheapest in-stock model</h2>
          <table className="compare-table">
            <thead>
              <tr>
                <th>Measure</th>
                <th>{top?.model ?? 'Top pick'}</th>
                <th>{cheapest?.model ?? 'Value pick'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.topValue}</td>
                  <td>{row.valueValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="plain-language">
            {rows.map((row) => (
              <li key={`${row.label}-plain`}>{row.plainLanguage}</li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="fallback-panel">
          <p>Our team will match you to the best in-stock model.</p>
        </div>
      )}

      <section className="value-section">
        <h2>Why this fits you</h2>
        <div className="fit-grid">
          {fitRows.map((row) => (
            <article key={row.priority} className="fit-row">
              <h3>{row.priority}</h3>
              <p>{row.value}</p>
              <small>Source: {row.source}</small>
            </article>
          ))}
        </div>
        <p className="disclosure">{FIT_CLOSING_LINE}</p>
      </section>

      <section className="value-section">
        <h2>Even-handed comparison</h2>
        <div className="competitor-tabs">
          {competitorClasses.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === competitorId ? 'tab-button tab-button--active' : 'tab-button'}
              onClick={() => setCompetitorId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="fit-grid">
          {competitorRows.map((row, index) => (
            <article key={`${row.label}-${index}`} className="fit-row">
              <h3>{row.label}</h3>
              <p>{row.value}</p>
              {row.sourceUrl ? <small>Source: {row.sourceUrl}</small> : null}
            </article>
          ))}
        </div>
        <p className="disclosure">Check independent reviews before you buy.</p>
      </section>

      <section className="value-section">
        <h2>Shopper checklist</h2>
        <ol className="checklist">
          {checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>
    </EndingFrame>
  )
}

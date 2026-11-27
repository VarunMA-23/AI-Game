import { useEffect, useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EndingFrame from '../../components/common/EndingFrame'
import { useDeadlineNavigation } from '../challenges/useDeadlineNavigation'
import { useRequireSession } from '../challenges/useRequireSession'
import { buildCompetitorRows, competitorClasses } from '../competitors/competitorContent'
import { FIT_CLOSING_LINE, buildFitRows } from '../fit-panel/fitPanel'
import { buildWeeklyReport } from '../recommendations/weeklyReport'
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
  const packetRoutes = useGameStore((state) => state.packetRoutes)
  const challengeScores = useGameStore((state) => state.challengeScores)
  const setPhase = useGameStore((state) => state.setPhase)
  const [competitorId, setCompetitorId] = useState(competitorClasses[0]?.id ?? '')
  const inventory = useMemo(() => loadInventory(storeId), [storeId])
  const readiness = useMemo(() => checkStoreReadiness(inventory), [inventory])
  const definition = getPersonaDefinition(persona)
  const weeklyReport = useMemo(
    () => buildWeeklyReport(packetRoutes, persona, challengeScores),
    [packetRoutes, persona, challengeScores],
  )
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
  const priceDelta =
    top?.price != null && cheapest?.price != null
      ? Math.max(0, top.price - cheapest.price)
      : 14000

  return (
    <EndingFrame
      kicker="Personalized Plan & Comparison"
      title="YOUR AI PC WEEK."
      footer={
        <button
          type="button"
          className="primary-button"
          onClick={() => navigate('/next-step')}
        >
          Next: Save &amp; Specialist <ArrowRight size={18} aria-hidden="true" />
        </button>
      }
    >
      <section className="value-section weekly-report-box">
        <h2>Your AI PC Week — Personal Plan</h2>
        <p className="weekly-headline">
          You spend ~{weeklyReport.totalEstimatedHoursOffloaded} hours per week studying, attending calls, and editing content. Here are the 3 AI PC features that actually benefit your workflow{priceDelta > 0 ? ` — and what you gain for a ₹${priceDelta.toLocaleString('en-IN')} step-up over the entry model` : ''}.
        </p>
        <div className="weekly-summary-strip">
          <span>
            <strong>~{weeklyReport.totalEstimatedHoursOffloaded} hrs/week</strong> moved to The Quiet Assistant (estimate)
          </span>
          <span>
            <strong>{weeklyReport.estimatedBatteryGainPct}</strong> battery headroom saved (estimate)
          </span>
        </div>
        <div className="fit-grid">
          {weeklyReport.tasks.map((item) => (
            <article key={item.task} className="fit-row">
              <h3>{item.task}</h3>
              <p>
                <strong>{item.engine}</strong> · {item.estimatedHoursPerWeek}
              </p>
              <p className="weekly-choice-note">{item.playerChoiceNote}</p>
              <small>Spec basis: {item.specCitation}</small>
            </article>
          ))}
        </div>
        <div className="cited-specs-strip">
          {weeklyReport.citedSpecs.map((spec) => (
            <div key={spec.label} className="cited-spec-chip">
              <strong>{spec.label}:</strong> {spec.value} <span>({spec.source})</span>
            </div>
          ))}
        </div>
        <ul className="disclosure">
          {weeklyReport.assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      </section>

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
      ) : null}

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
        <h2>Intel Core Ultra vs AMD Ryzen AI vs Qualcomm Snapdragon X</h2>
        <table className="compare-table">
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Intel Core Ultra</th>
              <th>AMD Ryzen AI (400 Series)</th>
              <th>Qualcomm Snapdragon X</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>NPU &amp; AI Role</td>
              <td>Intel AI Boost NPU (11–47 TOPS); OpenVINO, DirectML, ONNX Runtime, WebNN</td>
              <td>Dedicated Ryzen AI NPU; availability depends on system &amp; app support</td>
              <td>Hexagon NPU (up to 45 TOPS); always-on NPU role</td>
            </tr>
            <tr>
              <td>App Compatibility</td>
              <td>Native x86 Windows compatibility for games, creative suites &amp; enterprise apps</td>
              <td>Native x86 Windows compatibility for multitasking, creation &amp; gaming</td>
              <td>ARM-based Windows; check exact app compatibility on the store unit</td>
            </tr>
            <tr>
              <td>Spec Transparency</td>
              <td>Exact Core Ultra SKU, GPU name &amp; NPU framework list on Intel ARK</td>
              <td>Verify exact laptop memory, storage &amp; Wh on manufacturer sheet</td>
              <td>Verify exact laptop memory, storage &amp; Wh on manufacturer sheet</td>
            </tr>
          </tbody>
        </table>
        <p className="disclosure">
          Sources: Intel ARK Core Ultra Series 1 &amp; 2 specs, AMD Ryzen AI product page, Qualcomm Snapdragon X AI documentation (verified 2026-11-20).
        </p>
      </section>

      <section className="value-section">
        <h2>Detailed platform notes</h2>
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

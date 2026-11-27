import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EndingFrame from '../../components/common/EndingFrame'
import { useDeadlineNavigation } from '../challenges/useDeadlineNavigation'
import { useRequireSession } from '../challenges/useRequireSession'
import { competitorClasses, buildCompetitorRows } from '../competitors/competitorContent'
import { FIT_CLOSING_LINE, buildFitRows } from '../fit-panel/fitPanel'
import { buildWeeklyReport } from '../recommendations/weeklyReport'
import { loadInventory } from '../../services/inventory/loadInventory'
import { getPersonaDefinition } from '../../services/recommendations/loadPersona'
import { useGameStore } from '../../store/gameStore'
import type { InventoryModel } from '../../types/product'
import { useIdleReset } from '../onboarding/useIdleReset'
import { buildComparisonRows } from './valueCompare'

const show = (value: string | null | undefined): string =>
  value && value.trim().length > 0 ? value : 'Not shown'

const sourceName = (url: string): string => {
  if (!url) {
    return 'Not shown'
  }
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Store inventory'
  }
}

const CHECKLIST = [
  'Which processor family and exact model is it?',
  'Does it have an NPU, and which AI features do the apps I use support?',
  'How much RAM, and can it be upgraded?',
  "What's the battery capacity, and does the manufacturer publish a battery-life test?",
  "What's the warranty and return policy?",
]

export default function ValueScreen() {
  const navigate = useNavigate()
  const sessionReady = useRequireSession()
  const startedAt = useGameStore((state) => state.startedAt)
  const storeId = useGameStore((state) => state.storeId)
  const persona = useGameStore((state) => state.persona)
  const packetRoutes = useGameStore((state) => state.packetRoutes)
  const codes = useGameStore((state) => state.recommendedModelCodes)
  const setPhase = useGameStore((state) => state.setPhase)
  const inventory = useMemo(() => loadInventory(storeId), [storeId])
  const personaDefinition = getPersonaDefinition(persona)
  const weeklyReport = useMemo(
    () => buildWeeklyReport(packetRoutes, persona),
    [packetRoutes, persona],
  )
  const [platformIndex, setPlatformIndex] = useState(0)
  const platformButtons = useRef<Array<HTMLButtonElement | null>>([])

  useIdleReset(45000)
  useDeadlineNavigation(startedAt, 175000, '/next-step')

  useEffect(() => {
    setPhase('value', 0)
  }, [setPhase])

  if (!sessionReady) {
    return null
  }

  const recommended = codes
    .map((code) => inventory.models.find((model) => model.code === code))
    .filter((model): model is InventoryModel => Boolean(model))
  const top = recommended[0] ?? null
  const inStock = inventory.models.filter((model) => model.inStock)
  const byPrice = [...inStock].sort(
    (left, right) =>
      (left.price ?? Number.POSITIVE_INFINITY) -
        (right.price ?? Number.POSITIVE_INFINITY) ||
      left.code.localeCompare(right.code),
  )
  const cheapest = byPrice[0] ?? null
  const value =
    cheapest && cheapest.code !== top?.code
      ? cheapest
      : byPrice.find((model) => model.code !== top?.code) ?? null
  const priceDelta = top?.price !== null && value?.price !== null && top && value
    ? (top.price ?? 0) - (value.price ?? 0)
    : 0

  const comparisonRows = buildComparisonRows(top ?? null, value ?? null)
  const fitRows = buildFitRows(personaDefinition.priorities, top ?? null, inventory.priceDate)
  const activeCompetitor = competitorClasses[Math.min(platformIndex, competitorClasses.length - 1)]
  const competitorRows = activeCompetitor ? buildCompetitorRows(activeCompetitor, personaDefinition).slice(0, 5) : []
  const sourceList = Array.from(
    new Set(
      [
        ...inventory.models.flatMap((model) => model.sourceUrls),
        ...competitorClasses.flatMap((item) => [
          item.npuSourceUrl,
          ...item.strengths.map((strength) => strength.sourceUrl),
        ]),
      ].filter(Boolean),
    ),
  ).map(sourceName)

  const handlePlatformKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = competitorClasses.length - 1
    let next: number
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = index === last ? 0 : index + 1
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = index === 0 ? last : index - 1
    } else if (event.key === 'Home') {
      next = 0
    } else if (event.key === 'End') {
      next = last
    } else {
      return
    }
    event.preventDefault()
    setPlatformIndex(next)
    platformButtons.current[next]?.focus()
  }

  return (
    <EndingFrame
      kicker="Plan and store picks"
      title="Your AI PC Week."
      footer={
        <button type="button" className="primary-button" onClick={() => navigate('/next-step')}>
          Next: ask a specialist <ArrowRight size={18} aria-hidden="true" />
        </button>
      }
    >
      <section className="plan-container design-reveal" aria-labelledby="plan-lead">
        <p id="plan-lead" className="plan-lead">
          {weeklyReport.personaHeadline}
          {priceDelta > 0
            ? ` The top pick is ₹${priceDelta.toLocaleString('en-IN')} above the cheapest in-stock model.`
            : ''}
        </p>
        <div className="plan-metrics">
          <div className="plan-metric">
            <span className="metric">{weeklyReport.tasks.length}</span>
            <span className="metric-label">everyday tasks</span>
          </div>
          <div className="plan-metric">
            <span className="metric">3</span>
            <span className="metric-label">engines explained</span>
          </div>
          <div className="plan-metric">
            <span className="metric">0</span>
            <span className="metric-label">personal details stored</span>
          </div>
        </div>
        <div className="feature-grid">
          {weeklyReport.tasks.map((task) => (
            <article key={task.task} className="feature-card">
              <span className="feature-icon" aria-hidden="true">
                <Sparkles size={22} />
              </span>
              <h3 className="card-title">{task.task}</h3>
              <p className="body-text">{task.playerChoiceNote}</p>
              <p className="caption-text">
                Suggested engine: {task.engine}. {task.specCitation}
              </p>
            </article>
          ))}
        </div>
        <div className="evidence-row" aria-label="Cited specifications">
          {weeklyReport.citedSpecs.map((spec) => (
            <span key={spec.label} className="evidence-chip">
              {spec.label}: {spec.value} · {spec.source}
            </span>
          ))}
        </div>
        <p className="battery-note">
          <ShieldCheck size={20} aria-hidden="true" /> {weeklyReport.batteryNote}
        </p>
        <div className="assumptions">
          <p className="caption-text">Assumptions</p>
          <ul>
            {weeklyReport.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="value-section" aria-labelledby="fit-title">
        <h2 id="fit-title" className="section-heading">
          Why this fits you
        </h2>
        <div className="fit-grid">
          {fitRows.map((row) => (
            <article key={row.priority} className="fit-row">
              <h3 className="card-title">{row.priority}</h3>
              <p className="body-text">{show(row.value)}</p>
              <p className="caption-text">Source: {show(row.source)}</p>
            </article>
          ))}
        </div>
        <p className="caption-text closing-line">{FIT_CLOSING_LINE}</p>
      </section>

      <section className="value-section" aria-labelledby="compare-title">
        <h2 id="compare-title" className="section-heading">
          Price versus value
        </h2>
        <p className="body-text">
          Top pick: {top ? `${top.brand} ${top.model}` : 'Not shown'} · Cheapest in stock:{' '}
          {cheapest ? `${cheapest.brand} ${cheapest.model}` : 'Not shown'}
        </p>
        <div className="table-scroll">
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col">Spec</th>
                <th scope="col">Top pick</th>
                <th scope="col">Value pick</th>
                <th scope="col">What it means</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{show(row.topValue)}</td>
                  <td>{show(row.valueValue)}</td>
                  <td>{row.plainLanguage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="value-section" aria-labelledby="platform-title">
        <h2 id="platform-title" className="section-heading">
          Compare platforms
        </h2>
        <div className="platform-tabs" role="tablist" aria-label="Platform class">
          {competitorClasses.map((competitor, index) => (
            <button
              key={competitor.id}
              ref={(element) => {
                platformButtons.current[index] = element
              }}
              id={`platform-tab-${competitor.id}`}
              type="button"
              role="tab"
              aria-selected={index === platformIndex}
              aria-controls="platform-panel"
              tabIndex={index === platformIndex ? 0 : -1}
              className={`platform-tab ${index === platformIndex ? 'platform-tab--active' : ''}`}
              onClick={() => setPlatformIndex(index)}
              onKeyDown={(event) => handlePlatformKey(event, index)}
            >
              {competitor.label}
            </button>
          ))}
        </div>
        {activeCompetitor ? (
          <div
            id="platform-panel"
            className="platform-panel"
            role="tabpanel"
            aria-labelledby={`platform-tab-${activeCompetitor.id}`}
          >
            <p className="lead-text">{activeCompetitor.npuNote}</p>
            <p className="caption-text">Source: {sourceName(activeCompetitor.npuSourceUrl)}</p>
            <div className="note-grid">
              {competitorRows.map((row, index) => (
                <article key={`${row.label}-${index}`} className="note-tile">
                  <h3 className="card-title">{row.label}</h3>
                  <p className="body-text">{row.value}</p>
                  <p className="caption-text">Source: {sourceName(row.sourceUrl)}</p>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <p className="body-text">Comparison data is not available.</p>
        )}
      </section>

      <section className="value-section" aria-labelledby="checklist-title">
        <h2 id="checklist-title" className="section-heading">
          Shopper checklist
        </h2>
        <ol className="checklist">
          {CHECKLIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <footer className="source-footer">
        <p className="caption-text">Sources checked 27 Nov 2026</p>
        <p className="caption-text">{sourceList.join(' · ')}</p>
      </footer>
    </EndingFrame>
  )
}

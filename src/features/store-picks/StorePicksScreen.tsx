import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EndingFrame from '../../components/common/EndingFrame'
import { useDeadlineNavigation } from '../challenges/useDeadlineNavigation'
import { useRequireSession } from '../challenges/useRequireSession'
import { checkStoreReadiness } from '../store-readiness/gate'
import { USE_CASE_BUNDLES, pickModelForBundle } from '../recommendations/useCaseBundles'
import { loadInventory } from '../../services/inventory/loadInventory'
import { getPersonaDefinition } from '../../services/recommendations/loadPersona'
import { verifiedNpuClass } from '../recommendations/verifiedSpecs'
import { useGameStore } from '../../store/gameStore'
import type { InventoryModel } from '../../types/product'
import { useIdleReset } from '../onboarding/useIdleReset'

const shown = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === '' ? 'Not shown' : String(value)

const priceWithDate = (model: InventoryModel, priceDate: string | null): string =>
  model.price === null
    ? 'Not shown'
    : `₹${model.price.toLocaleString('en-IN')} (price date ${priceDate ?? 'Not shown'})`

const retailerFrom = (url: string): string => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (host.includes('reliancedigital')) {
      return 'Reliance Digital'
    }
    if (host.includes('croma')) {
      return 'Croma'
    }
    if (host.includes('vijaysales')) {
      return 'Vijay Sales'
    }
    return host
  } catch {
    return 'Store inventory'
  }
}

const npuSummary = (model: InventoryModel): string => {
  const verified = verifiedNpuClass(model)
  if (verified) {
    return `${verified}${model.npu.tops ? ` · ${model.npu.tops} TOPS (retailer spec)` : ''}`
  }
  if (model.npu.available) {
    return model.npu.tops
      ? `NPU available · ${model.npu.tops} TOPS (retailer spec)`
      : 'NPU available · class to be checked'
  }
  return 'Not shown'
}

const needsRecheck = (model: InventoryModel): boolean => {
  if (!model.lastVerified) {
    return true
  }
  const verified = new Date(`${model.lastVerified}T00:00:00Z`)
  if (Number.isNaN(verified.getTime())) {
    return true
  }
  return (Date.now() - verified.getTime()) / 86_400_000 > 90
}

function ModelCard({
  label,
  model,
  priceDate,
}: {
  label: string
  model: InventoryModel
  priceDate: string | null
}) {
  return (
    <article className="model-card design-reveal">
      <div className="model-card-head">
        <span className="model-label">{label}</span>
        <span className="stock-pill">
          <CheckCircle2 size={16} aria-hidden="true" />
          In stock at this store
        </span>
      </div>
      {needsRecheck(model) ? (
        <p className="caption-text warning-text">Specs to be re-checked</p>
      ) : null}
      <h2 className="model-name">{model.model}</h2>
      <p className="model-brand">
        {model.brand} · {retailerFrom(model.sourceUrls[0] ?? '')}
      </p>
      <dl className="spec-grid">
        <div>
          <dt>Processor</dt>
          <dd>{shown(model.processorModel)}</dd>
        </div>
        <div>
          <dt>NPU</dt>
          <dd>{npuSummary(model)}</dd>
        </div>
        <div>
          <dt>RAM</dt>
          <dd>{shown(model.ram)}</dd>
        </div>
        <div>
          <dt>Storage</dt>
          <dd>{shown(model.storage)}</dd>
        </div>
        <div>
          <dt>Battery</dt>
          <dd>
            {model.batteryWh === null ? 'Not shown' : `${model.batteryWh} Wh (manufacturer spec)`}
          </dd>
        </div>
        <div>
          <dt>Display</dt>
          <dd>{shown(model.displayNote)}</dd>
        </div>
        <div>
          <dt>GPU</dt>
          <dd>{shown(model.gpu)}</dd>
        </div>
        <div>
          <dt>Warranty</dt>
          <dd>
            {model.warrantyMonths === null ? 'Not shown' : `${model.warrantyMonths} months`}
          </dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd>{priceWithDate(model, priceDate)}</dd>
        </div>
      </dl>
    </article>
  )
}

export default function StorePicksScreen() {
  const navigate = useNavigate()
  const sessionReady = useRequireSession()
  const storeId = useGameStore((state) => state.storeId)
  const startedAt = useGameStore((state) => state.startedAt)
  const persona = useGameStore((state) => state.persona)
  const codes = useGameStore((state) => state.recommendedModelCodes)
  const selectedBundle = useGameStore((state) => state.selectedBundle)
  const maxBudget = useGameStore((state) => state.maxBudget ?? 150000)
  const setPhase = useGameStore((state) => state.setPhase)
  const setShopperPreferences = useGameStore((state) => state.setShopperPreferences)
  const inventory = useMemo(() => loadInventory(storeId), [storeId])
  const readiness = useMemo(() => checkStoreReadiness(inventory), [inventory])
  const definition = getPersonaDefinition(persona)
  const [activeBundleId, setActiveBundleId] = useState<string>(
    selectedBundle ?? USE_CASE_BUNDLES[0].id,
  )
  const bundleButtons = useRef<Array<HTMLButtonElement | null>>([])

  useIdleReset(45000)
  useDeadlineNavigation(startedAt, 165000, '/value')

  useEffect(() => {
    setPhase('store', 0)
  }, [setPhase])

  if (!sessionReady) {
    return null
  }

  const activeBundleIndex = Math.max(
    0,
    USE_CASE_BUNDLES.findIndex((bundle) => bundle.id === activeBundleId),
  )
  const activeBundle = USE_CASE_BUNDLES[activeBundleIndex] ?? USE_CASE_BUNDLES[0]
  const bundlePick = pickModelForBundle(inventory.models, activeBundle)

  const inStockWithinBudget = inventory.models
    .filter((model) => model.inStock && (model.price === null || model.price <= maxBudget))
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))

  const personaPicks = codes
    .map((code) => inStockWithinBudget.find((model) => model.code === code))
    .filter((model): model is InventoryModel => Boolean(model))

  const recommendations =
    personaPicks.length > 0
      ? personaPicks.slice(0, 3)
      : bundlePick && inStockWithinBudget.some((model) => model.code === bundlePick.code)
        ? [bundlePick, ...inStockWithinBudget.filter((model) => model.code !== bundlePick.code)].slice(0, 3)
        : inStockWithinBudget.slice(0, 3)

  const labels = ['Top pick', 'Value pick', 'Alternative']
  const retailers = Array.from(
    new Set(inventory.models.map((model) => retailerFrom(model.sourceUrls[0] ?? ''))),
  ).filter((name) => name !== 'Store inventory')

  const handleBundleKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = USE_CASE_BUNDLES.length - 1
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
    const bundle = USE_CASE_BUNDLES[next]
    setActiveBundleId(bundle.id)
    setShopperPreferences({ selectedBundle: bundle.label, maxBudget: bundle.maxPrice })
    bundleButtons.current[next]?.focus()
  }

  const selectBundle = (index: number) => {
    const bundle = USE_CASE_BUNDLES[index]
    setActiveBundleId(bundle.id)
    setShopperPreferences({ selectedBundle: bundle.label, maxBudget: bundle.maxPrice })
  }

  return (
    <EndingFrame
      kicker={`${definition.name} · ${inventory.storeName}`}
      title={readiness.ready ? 'In stock at this store.' : 'Our team will match you.'}
      footer={
        <button type="button" className="primary-button" onClick={() => navigate('/value')}>
          Next: your plan <ArrowRight size={18} aria-hidden="true" />
        </button>
      }
    >
      <section className="plan-container design-reveal">
        <p className="plan-lead">
          {readiness.ready
            ? 'Three in-stock models, ranked from verified store data. Prices come from the retailers listed below.'
            : 'Store data needs a refresh. A specialist will match you to the best in-stock model.'}
        </p>
        <div className="plan-metrics">
          <div className="plan-metric">
            <span className="metric">{inventory.models.length}</span>
            <span className="metric-label">real models checked</span>
          </div>
          <div className="plan-metric">
            <span className="metric">{retailers.length}</span>
            <span className="metric-label">retailer sources</span>
          </div>
          <div className="plan-metric">
            <span className="metric">{shown(inventory.priceDate)}</span>
            <span className="metric-label">price date</span>
          </div>
        </div>
      </section>

      <div className="bundle-section">
        <div className="bundle-tabs platform-tabs" role="tablist" aria-label="Use-case tracks">
          {USE_CASE_BUNDLES.map((bundle, index) => (
            <button
              key={bundle.id}
              ref={(element) => {
                bundleButtons.current[index] = element
              }}
              type="button"
              role="tab"
              aria-selected={index === activeBundleIndex}
              tabIndex={index === activeBundleIndex ? 0 : -1}
              className={`platform-tab ${index === activeBundleIndex ? 'platform-tab--active' : ''}`}
              onClick={() => selectBundle(index)}
              onKeyDown={(event) => handleBundleKey(event, index)}
            >
              {bundle.label} · {bundle.budgetBand}
            </button>
          ))}
        </div>
        {bundlePick && (
          <div className="bundle-callout">
            <div>
              <strong>
                {activeBundle.label} track pick: {bundlePick.brand} {bundlePick.model}
              </strong>
              <p className="body-text">{activeBundle.pitch}</p>
            </div>
            <span className="bundle-price">
              {bundlePick.price === null
                ? 'Not shown'
                : `₹${bundlePick.price.toLocaleString('en-IN')}`}
            </span>
          </div>
        )}
      </div>

      <div className="budget-slider-box">
        <div className="budget-slider-head">
          <label htmlFor="budget-slider">Maximum budget</label>
          <strong>Up to ₹{maxBudget.toLocaleString('en-IN')}</strong>
        </div>
        <input
          id="budget-slider"
          type="range"
          min={55000}
          max={150000}
          step={5000}
          value={maxBudget}
          onChange={(event) => setShopperPreferences({ maxBudget: Number(event.target.value) })}
          className="budget-slider"
        />
      </div>

      {readiness.ready && recommendations.length > 0 ? (
        <div className="model-grid">
          {recommendations.map((model, index) => (
            <ModelCard
              key={model.code}
              label={labels[index] ?? 'Model'}
              model={model}
              priceDate={inventory.priceDate}
            />
          ))}
        </div>
      ) : (
        <div className="fallback-panel">
          <p>
            {readiness.ready
              ? 'No in-stock models under that budget — drag right to see more options.'
              : 'Our team will match you to the best in-stock model.'}
          </p>
        </div>
      )}

      <footer className="source-footer">
        <p className="caption-text">Retailer data checked {shown(inventory.priceDate)}</p>
        <p className="caption-text">{retailers.join(' · ')}</p>
      </footer>
    </EndingFrame>
  )
}

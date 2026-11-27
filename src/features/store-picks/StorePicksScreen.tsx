import { useEffect, useMemo, useState } from 'react'
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
  model.price === null ? 'Not shown' : `₹${model.price.toLocaleString('en-IN')} (${priceDate ?? 'verified'})`

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
    <article className="model-card">
      <div className="model-card-head">
        <span className="model-label">{label}</span>
        <span className="stock-pill">
          <CheckCircle2 size={16} aria-hidden="true" />
          In stock
        </span>
      </div>
      {needsRecheck(model) ? (
        <p className="ending-kicker">Specs to be re-checked</p>
      ) : null}
      <h2 className="model-name">{model.model}</h2>
      <p className="model-brand">{model.brand}</p>
      <dl className="spec-grid">
        <div>
          <dt>Processor</dt>
          <dd>{shown(model.processorModel)}</dd>
        </div>
        <div>
          <dt>NPU class</dt>
          <dd>
            {shown(verifiedNpuClass(model))}
            {model.npu.tops ? ` (${model.npu.tops} TOPS)` : ''}
          </dd>
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
          <dd>{model.batteryWh === null ? 'Not shown' : `${model.batteryWh} Wh (Vendor spec)`}</dd>
        </div>
        <div>
          <dt>GPU</dt>
          <dd>{shown(model.gpu)}</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd>{priceWithDate(model, priceDate)}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>
            {model.sourceUrls[0] ? 'Intel Core Ultra / Vendor Spec' : 'Store inventory'}
          </dd>
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

  useIdleReset(45000)
  useDeadlineNavigation(startedAt, 165000, '/value')

  useEffect(() => {
    setPhase('store', 0)
  }, [setPhase])

  if (!sessionReady) {
    return null
  }

  const activeBundle =
    USE_CASE_BUNDLES.find((b) => b.id === activeBundleId) ?? USE_CASE_BUNDLES[0]
  const bundlePick = pickModelForBundle(inventory.models, activeBundle)

  const inStockWithinBudget = inventory.models
    .filter((m) => m.inStock && (m.price === null || m.price <= maxBudget))
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))

  const personaPicks = codes
    .map((code) => inStockWithinBudget.find((model) => model.code === code))
    .filter((model): model is InventoryModel => Boolean(model))

  const recommendations =
    personaPicks.length > 0 ? personaPicks.slice(0, 3) : inStockWithinBudget.slice(0, 3)

  const labels = ['Top pick', 'Value pick', 'Alternative']

  return (
    <EndingFrame
      kicker={`${definition.name} · ${inventory.storeName}`}
      title={readiness.ready ? 'IN STOCK AT THIS STORE.' : 'OUR TEAM WILL MATCH YOU.'}
      footer={
        <button
          type="button"
          className="primary-button"
          onClick={() => navigate('/value')}
        >
          Next: Your AI PC Week <ArrowRight size={18} aria-hidden="true" />
        </button>
      }
    >
      <div className="bundle-section">
        <div className="bundle-tabs" role="tablist" aria-label="Use-case tracks">
          {USE_CASE_BUNDLES.map((bundle) => (
            <button
              key={bundle.id}
              type="button"
              role="tab"
              aria-selected={bundle.id === activeBundleId}
              className={`tab-button ${bundle.id === activeBundleId ? 'tab-button--active' : ''}`}
              onClick={() => {
                setActiveBundleId(bundle.id)
                setShopperPreferences({
                  selectedBundle: bundle.label,
                  maxBudget: bundle.maxPrice,
                })
              }}
            >
              {bundle.label} · {bundle.budgetBand}
            </button>
          ))}
        </div>
        {bundlePick && (
          <div className="bundle-callout">
            <div>
              <strong>{activeBundle.label} Track Pick: {bundlePick.brand} {bundlePick.model}</strong>
              <p>{activeBundle.pitch}</p>
            </div>
            <span className="bundle-price">
              ₹{(bundlePick.price ?? 0).toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>

      <div className="budget-slider-box">
        <div className="budget-slider-head">
          <label htmlFor="budget-slider">Filter store picks by max budget</label>
          <strong>Up to ₹{maxBudget.toLocaleString('en-IN')}</strong>
        </div>
        <input
          id="budget-slider"
          type="range"
          min={55000}
          max={150000}
          step={5000}
          value={maxBudget}
          onChange={(e) => setShopperPreferences({ maxBudget: Number(e.target.value) })}
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
              ? 'No in-stock models under that budget slider — drag right to see more options.'
              : 'Our team will match you to the best in-stock model.'}
          </p>
        </div>
      )}
    </EndingFrame>
  )
}

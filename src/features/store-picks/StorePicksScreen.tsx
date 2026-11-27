import { useEffect, useMemo } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EndingFrame from '../../components/common/EndingFrame'
import { useDeadlineNavigation } from '../challenges/useDeadlineNavigation'
import { useRequireSession } from '../challenges/useRequireSession'
import { checkStoreReadiness } from '../store-readiness/gate'
import { loadInventory } from '../../services/inventory/loadInventory'
import { getPersonaDefinition } from '../../services/recommendations/loadPersona'
import { verifiedNpuClass } from '../recommendations/verifiedSpecs'
import { useGameStore } from '../../store/gameStore'
import type { InventoryModel } from '../../types/product'
import { useIdleReset } from '../onboarding/useIdleReset'

const shown = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === '' ? 'Not shown' : String(value)

const priceWithDate = (model: InventoryModel, priceDate: string | null): string =>
  model.price === null ? 'Not shown' : `₹${model.price} on ${priceDate ?? 'Not shown'}`

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
          In stock at this store
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
          <dd>{shown(verifiedNpuClass(model))}</dd>
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
          <dt>Battery capacity</dt>
          <dd>{model.batteryWh === null ? 'Not shown' : `${model.batteryWh} Wh`}</dd>
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
          <dt>Warranty</dt>
          <dd>
            {model.warrantyMonths === null
              ? 'Not shown'
              : `${model.warrantyMonths} months`}
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
  const setPhase = useGameStore((state) => state.setPhase)
  const inventory = useMemo(() => loadInventory(storeId), [storeId])
  const readiness = useMemo(() => checkStoreReadiness(inventory), [inventory])
  const definition = getPersonaDefinition(persona)

  useIdleReset(45000)
  useDeadlineNavigation(startedAt, 165000, '/value')

  useEffect(() => {
    setPhase('store', 0)
  }, [setPhase])

  if (!sessionReady) {
    return null
  }

  const recommendations = codes
    .map((code) => inventory.models.find((model) => model.code === code))
    .filter((model): model is InventoryModel => Boolean(model))
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
          Next: Value &amp; Fit <ArrowRight size={18} aria-hidden="true" />
        </button>
      }
    >
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
          <p>Our team will match you to the best in-stock model.</p>
          <ul>
            {readiness.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </EndingFrame>
  )
}

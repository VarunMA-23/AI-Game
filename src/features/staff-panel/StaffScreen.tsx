import { useMemo, useState } from 'react'
import { CheckCircle2, LogOut, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EndingFrame from '../../components/common/EndingFrame'
import kioskConfig from '../../data/kiosk.config.json'
import { checkStoreReadiness } from '../store-readiness/gate'
import { loadInventory } from '../../services/inventory/loadInventory'
import {
  confirmHandoff,
  listHandoffs,
} from '../../services/storage/handoffStorage'
import { readDailyTotals } from '../../services/storage/measurementStorage'
import { useGameStore } from '../../store/gameStore'

export default function StaffScreen({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const storeId = useGameStore((state) => state.storeId)
  const mode = useGameStore((state) => state.mode)
  const resetSession = useGameStore((state) => state.resetSession)
  const inventory = useMemo(() => loadInventory(storeId), [storeId])
  const readiness = useMemo(() => checkStoreReadiness(inventory), [inventory])
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [handoffs, setHandoffs] = useState(() => listHandoffs())
  const [exitMessage, setExitMessage] = useState('')
  const totals = readDailyTotals()

  const handleUnlock = () => {
    if (pin === kioskConfig.staffPin) {
      setUnlocked(true)
      setHandoffs(listHandoffs())
    }
  }

  const handleConfirm = (createdAt: number) => {
    confirmHandoff(createdAt)
    setHandoffs(listHandoffs())
  }

  const handleReset = () => {
    resetSession()
    onClose()
    navigate('/', { replace: true })
  }

  const handleExit = () => {
    setExitMessage('Maintenance exit requested. Close the kiosk window if it stays open.')
    window.close()
  }

  return (
    <EndingFrame kicker="Staff" title="KIOSK PANEL.">
      {!unlocked ? (
        <div className="staff-login">
          <label htmlFor="staff-pin">Store PIN</label>
          <input
            id="staff-pin"
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
          />
          <button type="button" className="secondary-button" onClick={handleUnlock}>
            OPEN PANEL
          </button>
          <button type="button" className="text-button" onClick={onClose}>
            CLOSE
          </button>
        </div>
      ) : (
        <div className="staff-grid">
          <section className="staff-section">
            <h2>Store readiness</h2>
            <p>{readiness.ready ? 'Pass — store picks enabled.' : 'Warning — fallback mode.'}</p>
            <p>Verified in-stock models: {readiness.verifiedInStockCount}</p>
            <ul>
              {readiness.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </section>

          <section className="staff-section">
            <h2>Pending handoffs</h2>
            {handoffs.length === 0 ? (
              <p>No pending handoffs.</p>
            ) : (
              handoffs.map((handoff) => (
                <article key={handoff.createdAt} className="handoff-row">
                  <div className="handoff-context">
                    <strong>
                      {handoff.persona}
                      {handoff.cardTitle ? ` — “${handoff.cardTitle}”` : ''}
                      {handoff.rarity ? ` (${handoff.rarity})` : ''}
                    </strong>
                    <span>
                      Track: {handoff.bundleLabel ?? 'General'} · Model: {handoff.modelCode ?? 'No model'}
                      {handoff.budgetMax ? ` · Max ₹${handoff.budgetMax.toLocaleString('en-IN')}` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="small-button"
                    onClick={() => handleConfirm(handoff.createdAt)}
                  >
                    <CheckCircle2 size={18} aria-hidden="true" />
                    CONFIRM
                  </button>
                </article>
              ))
            )}
          </section>

          <section className="staff-section">
            <h2>Daily totals</h2>
            <p>{totals.date}</p>
            <p>Started: {totals.starts}</p>
            <p>Completed: {totals.completions}</p>
            <p>Actions: {totals.actions}</p>
          </section>

          <section className="staff-section">
            <h2>Kiosk controls</h2>
            <p>Mode: {mode}</p>
            <button type="button" className="secondary-button" onClick={handleReset}>
              RESET SESSION
              <RotateCcw size={20} aria-hidden="true" />
            </button>
            <button type="button" className="small-button" onClick={handleExit}>
              EXIT KIOSK
              <LogOut size={18} aria-hidden="true" />
            </button>
            {exitMessage ? <p>{exitMessage}</p> : null}
          </section>
        </div>
      )}
    </EndingFrame>
  )
}

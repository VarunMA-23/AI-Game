import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { Check, Download, Lock, MessageSquareText, RotateCcw, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EndingFrame from '../../components/common/EndingFrame'
import { useRequireSession } from '../challenges/useRequireSession'
import { buildQrPayload } from '../persona-card/qrPayload'
import { renderPersonaCard } from '../persona-card/personaCard'
import type { PersonaCardImages } from '../persona-card/personaCard'
import { buildCollectibleCard } from '../recommendations/collectibleCard'
import { buildScoringSummary } from '../recommendations/scoringSummary'
import { loadInventory } from '../../services/inventory/loadInventory'
import { getPersonaDefinition } from '../../services/recommendations/loadPersona'
import { addHandoff } from '../../services/storage/handoffStorage'
import { recordEndingAction } from '../../services/storage/measurementStorage'
import { useGameStore } from '../../store/gameStore'
import { useIdleReset } from '../onboarding/useIdleReset'

export default function NextStepScreen() {
  const navigate = useNavigate()
  const sessionReady = useRequireSession()
  const sessionId = useGameStore((state) => state.sessionId)
  const storeId = useGameStore((state) => state.storeId)
  const persona = useGameStore((state) => state.persona)
  const codes = useGameStore((state) => state.recommendedModelCodes)
  const scores = useGameStore((state) => state.challengeScores)
  const statuses = useGameStore((state) => state.challengeStatus)
  const startedAt = useGameStore((state) => state.startedAt)
  const completedAt = useGameStore((state) => state.completedAt)
  const selectedBundle = useGameStore((state) => state.selectedBundle)
  const maxBudget = useGameStore((state) => state.maxBudget)
  const handoffPending = useGameStore((state) => state.handoffPending)
  const setPhase = useGameStore((state) => state.setPhase)
  const finishSession = useGameStore((state) => state.finishSession)
  const setHandoffPending = useGameStore((state) => state.setHandoffPending)
  const resetSession = useGameStore((state) => state.resetSession)
  const inventory = useMemo(() => loadInventory(storeId), [storeId])
  const definition = getPersonaDefinition(persona)
  const summary = buildScoringSummary({ scores, statuses, startedAt, completedAt })
  const cardMeta = buildCollectibleCard(persona, scores, summary.total)
  const [qrImage, setQrImage] = useState('')
  const [cardImages, setCardImages] = useState<PersonaCardImages | null>(null)
  const [remindOptIn, setRemindOptIn] = useState(false)

  useIdleReset(45000)

  useEffect(() => {
    finishSession()
    setPhase('next-step', 0)
  }, [finishSession, setPhase])

  if (!sessionReady) {
    return null
  }

  const handleSpecialist = () => {
    if (!persona || handoffPending) {
      return
    }
    addHandoff({
      storeId,
      persona,
      modelCode: codes[0] ?? null,
      cardTitle: cardMeta.title,
      rarity: cardMeta.rarity,
      bundleLabel: selectedBundle ?? 'General',
      budgetMax: maxBudget,
    })
    setHandoffPending(true)
    recordEndingAction(sessionId, 'specialist')
  }

  const handleSave = async () => {
    if (!persona) {
      return
    }
    const payload = buildQrPayload({ storeId, persona, modelCodes: codes })
    const [qr, card] = await Promise.all([
      QRCode.toDataURL(payload, {
        margin: 1,
        width: 420,
        color: { dark: '#111827', light: '#FFFFFF' },
      }),
      renderPersonaCard({
        storeName: inventory.storeName,
        storeId,
        persona,
        personaName: definition.name,
        topPriority: definition.priorities[0] ?? '',
        modelCodes: codes,
        cardTitle: cardMeta.title,
        rarity: cardMeta.rarity,
        stats: cardMeta.stats,
      }),
    ])
    setQrImage(qr)
    setCardImages(card)
    recordEndingAction(sessionId, 'save')
  }

  const handlePlayAgain = () => {
    resetSession()
    navigate('/', { replace: true })
  }

  return (
    <EndingFrame
      kicker="Your next step"
      title="TAKE THE NEXT STEP."
      footer={
        <span className="ending-progress">
          {handoffPending
            ? `A specialist has your ${cardMeta.title} card & ${selectedBundle ?? 'store'} preferences.`
            : 'No personal details are collected.'}
        </span>
      }
    >
      <div className="privacy-closing-hook">
        <Lock size={22} aria-hidden="true" />
        <div>
          <strong>What leaves your device? With on-device AI, your files stay yours.</strong>
          <p>
            Compatible apps run summaries, blur, and creative edits locally on the NPU — no cloud upload required.
          </p>
        </div>
      </div>

      <div className="next-step-actions">
        <button
          type="button"
          className="primary-button"
          onClick={handleSpecialist}
          disabled={!persona || handoffPending}
        >
          {handoffPending ? 'SPECIALIST HAS YOUR CONTEXT' : 'ASK A SPECIALIST'}
          <MessageSquareText size={24} aria-hidden="true" />
        </button>
        <button type="button" className="secondary-button" onClick={handleSave} disabled={!persona}>
          SAVE &amp; REMIND (QR)
          <Save size={22} aria-hidden="true" />
        </button>
        <button type="button" className="text-button" onClick={handlePlayAgain}>
          PLAY AGAIN
          <RotateCcw size={20} aria-hidden="true" />
        </button>
      </div>

      <label className="remind-optin">
        <input
          type="checkbox"
          checked={remindOptIn}
          onChange={(e) => setRemindOptIn(e.target.checked)}
        />
        <span>
          {remindOptIn ? (
            <>
              <Check size={15} aria-hidden="true" /> Your plan is ready when you are — scan the QR below to keep it on your phone.
            </>
          ) : (
            'Opt in to save a low-pressure reminder with your QR plan (no email or phone number needed).'
          )}
        </span>
      </label>

      {qrImage || cardImages ? (
        <div className="saved-picks">
          {qrImage ? (
            <figure>
              <img src={qrImage} alt="QR code with your persona and saved model codes" />
              <figcaption>Your plan is ready when you are</figcaption>
            </figure>
          ) : null}
          {cardImages ? (
            <>
              <figure>
                <img src={cardImages.front} alt="Front of your collectible persona trading card" />
                <figcaption>
                  <a href={cardImages.front} download="ai-pc-persona-card-front.png">
                    SAVE CARD FRONT
                    <Download size={18} aria-hidden="true" />
                  </a>
                </figcaption>
              </figure>
              <figure>
                <img src={cardImages.back} alt="Back of your persona card with shopper checklist" />
                <figcaption>
                  <a href={cardImages.back} download="ai-pc-persona-card-back.png">
                    SAVE CHECKLIST BACK
                    <Download size={18} aria-hidden="true" />
                  </a>
                </figcaption>
              </figure>
            </>
          ) : null}
          <p className="disclosure">
            No name, photo, session ID or timestamp is stored on the card.
          </p>
        </div>
      ) : null}
    </EndingFrame>
  )
}

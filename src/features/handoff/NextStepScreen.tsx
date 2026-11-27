import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { Download, Lock, MessageSquareText, RotateCcw, Save } from 'lucide-react'
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

const CHECKLIST = [
  'Which processor family and exact model is it?',
  'Does it have an NPU, and which AI features do the apps I use support?',
  'How much RAM, and can it be upgraded?',
  "What's the battery capacity, and does the manufacturer publish a battery-life test?",
  "What's the warranty and return policy?",
]

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
        color: { dark: '#0f172a', light: '#FFFFFF' },
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
      title="Take the next step."
      footer={
        <span className="ending-progress">
          {handoffPending
            ? `A specialist has your ${cardMeta.title} card and ${selectedBundle ?? 'store'} preferences.`
            : 'No personal details are collected.'}
        </span>
      }
    >
      <section className="plan-container design-reveal">
        <p className="plan-lead">
          Ask a specialist about the exact configuration, then save a QR plan to compare later.
          Nothing here identifies you.
        </p>
        <div className="privacy-closing-hook">
          <Lock size={22} aria-hidden="true" />
          <div>
            <strong className="card-title">Keep the file on the device?</strong>
            <p className="body-text">
              Compatible apps can run summaries, blur and edits on the device. Privacy still depends
              on the app and its settings.
            </p>
          </div>
        </div>
      </section>

      <div className="next-step-actions">
        <button
          type="button"
          className="primary-button"
          onClick={handleSpecialist}
          disabled={!persona || handoffPending}
        >
          {handoffPending ? 'Specialist has your context' : 'Ask a specialist'}
          <MessageSquareText size={24} aria-hidden="true" />
        </button>
        <button type="button" className="secondary-button" onClick={handleSave} disabled={!persona}>
          Save your picks <Save size={22} aria-hidden="true" />
        </button>
        <button type="button" className="text-button" onClick={handlePlayAgain}>
          Play again <RotateCcw size={20} aria-hidden="true" />
        </button>
      </div>

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
                <img src={cardImages.front} alt="Front of your collectible persona card" />
                <figcaption>
                  <a href={cardImages.front} download="ai-pc-persona-card-front.png">
                    Save card front <Download size={18} aria-hidden="true" />
                  </a>
                </figcaption>
              </figure>
              <figure>
                <img src={cardImages.back} alt="Back of your persona card with shopper checklist" />
                <figcaption>
                  <a href={cardImages.back} download="ai-pc-persona-card-back.png">
                    Save checklist back <Download size={18} aria-hidden="true" />
                  </a>
                </figcaption>
              </figure>
            </>
          ) : null}
          <p className="disclosure">No name, photo, session ID or timestamp is stored on the card.</p>
        </div>
      ) : null}

      <section className="value-section" aria-labelledby="next-checklist-title">
        <h2 id="next-checklist-title" className="section-heading">
          Shopper checklist
        </h2>
        <ol className="checklist">
          {CHECKLIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <footer className="source-footer">
        <p className="caption-text">
          Compare the exact configuration, software support, warranty and price before you decide.
        </p>
      </footer>
    </EndingFrame>
  )
}

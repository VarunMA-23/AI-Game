import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { Download, MessageSquareText, RotateCcw, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EndingFrame from '../../components/common/EndingFrame'
import { useRequireSession } from '../challenges/useRequireSession'
import { buildQrPayload } from '../persona-card/qrPayload'
import { renderPersonaCard } from '../persona-card/personaCard'
import type { PersonaCardImages } from '../persona-card/personaCard'
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
  const handoffPending = useGameStore((state) => state.handoffPending)
  const setPhase = useGameStore((state) => state.setPhase)
  const finishSession = useGameStore((state) => state.finishSession)
  const setHandoffPending = useGameStore((state) => state.setHandoffPending)
  const resetSession = useGameStore((state) => state.resetSession)
  const inventory = useMemo(() => loadInventory(storeId), [storeId])
  const definition = getPersonaDefinition(persona)
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
        color: { dark: '#071426', light: '#FFFFFF' },
      }),
      renderPersonaCard({
        storeName: inventory.storeName,
        storeId,
        persona,
        personaName: definition.name,
        topPriority: definition.priorities[0] ?? '',
        modelCodes: codes,
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
            ? 'A specialist has been asked to find you.'
            : 'No personal details are collected.'}
        </span>
      }
    >
      <div className="next-step-actions">
        <button
          type="button"
          className="primary-button"
          onClick={handleSpecialist}
          disabled={!persona || handoffPending}
        >
          {handoffPending ? 'SPECIALIST ASKED' : 'ASK A SPECIALIST'}
          <MessageSquareText size={24} aria-hidden="true" />
        </button>
        <button type="button" className="secondary-button" onClick={handleSave} disabled={!persona}>
          SAVE YOUR PICKS
          <Save size={22} aria-hidden="true" />
        </button>
        <button type="button" className="text-button" onClick={handlePlayAgain}>
          PLAY AGAIN
          <RotateCcw size={20} aria-hidden="true" />
        </button>
      </div>

      {qrImage || cardImages ? (
        <div className="saved-picks">
          {qrImage ? (
            <figure>
              <img src={qrImage} alt="QR code with your persona and saved model codes" />
              <figcaption>Phone-scannable QR</figcaption>
            </figure>
          ) : null}
          {cardImages ? (
            <>
              <figure>
                <img src={cardImages.front} alt="Front of your shareable persona card" />
                <figcaption>
                  <a href={cardImages.front} download="ai-pc-persona-card-front.png">
                    SAVE FRONT
                    <Download size={18} aria-hidden="true" />
                  </a>
                </figcaption>
              </figure>
              <figure>
                <img src={cardImages.back} alt="Back of your persona card with shopper checklist" />
                <figcaption>
                  <a href={cardImages.back} download="ai-pc-persona-card-back.png">
                    SAVE BACK
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

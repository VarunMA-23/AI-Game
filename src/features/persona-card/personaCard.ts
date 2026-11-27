import QRCode from 'qrcode'
import type { PersonaId } from '../../types/game'
import { buildQrPayload } from './qrPayload'

const checklist = [
  'Which processor family and exact model is it?',
  'Does it have an NPU, and which AI features do the apps I use support?',
  'How much RAM, and can it be upgraded?',
  "What's the battery capacity, and does the manufacturer publish a battery-life test?",
  "What's the warranty and return policy?",
]

export interface PersonaCardImages {
  front: string
  back: string
}

const wrapText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number => {
  const words = text.split(' ')
  let line = ''
  let currentY = y
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, currentY)
      currentY += lineHeight
      line = word
    } else {
      line = candidate
    }
  }
  if (line) {
    context.fillText(line, x, currentY)
    currentY += lineHeight
  }
  return currentY
}

const createContext = (): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } => {
  const canvas = document.createElement('canvas')
  canvas.width = 900
  canvas.height = 1120
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas is unavailable')
  }
  return { canvas, context }
}

export const renderPersonaCard = async (input: {
  storeName: string
  storeId: string
  persona: PersonaId
  personaName: string
  topPriority: string
  modelCodes: string[]
  cardTitle?: string
  rarity?: string
  stats?: { focus: number; creativity: number; privacy: number; batteryCare: number }
}): Promise<PersonaCardImages> => {
  const payload = buildQrPayload({
    storeId: input.storeId,
    persona: input.persona,
    modelCodes: input.modelCodes,
  })
  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 420,
    color: { dark: '#111827', light: '#FFFFFF' },
  })
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Unable to render QR code'))
    image.src = qrDataUrl
  })

  const front = createContext()
  front.context.fillStyle = '#FFFFFF'
  front.context.fillRect(0, 0, front.canvas.width, front.canvas.height)
  front.context.fillStyle = '#0068B5'
  front.context.fillRect(0, 0, front.canvas.width, 18)
  front.context.fillStyle = '#0068B5'
  front.context.font = '700 28px "Space Grotesk", sans-serif'
  front.context.fillText(
    `AI PC SHOWDOWN · ${(input.rarity ?? 'RARE').toUpperCase()} TIER`,
    72,
    88,
  )
  front.context.fillStyle = '#111827'
  front.context.font = '700 64px "Space Grotesk", sans-serif'
  front.context.fillText(input.personaName.toUpperCase(), 72, 176)
  front.context.fillStyle = '#4B5563'
  front.context.font = '600 30px Inter, sans-serif'
  front.context.fillText(
    input.cardTitle ? `“${input.cardTitle}”` : `Top priority: ${input.topPriority}`,
    72,
    228,
  )
  if (input.stats) {
    front.context.font = '600 24px Inter, sans-serif'
    front.context.fillStyle = '#111827'
    front.context.fillText(
      `Focus ${input.stats.focus} · Creativity ${input.stats.creativity} · Privacy ${input.stats.privacy} · Battery ${input.stats.batteryCare}`,
      72,
      276,
    )
  }
  front.context.fillStyle = '#4B5563'
  front.context.font = '24px Inter, sans-serif'
  front.context.fillText(input.storeName, 72, 318)
  front.context.drawImage(image, 240, 380, 420, 420)
  front.context.fillStyle = '#4B5563'
  front.context.font = '24px Inter, sans-serif'
  front.context.fillText('Your plan is ready when you are — scan to save.', 72, 880)

  const back = createContext()
  back.context.fillStyle = '#FFFFFF'
  back.context.fillRect(0, 0, back.canvas.width, back.canvas.height)
  back.context.fillStyle = '#0068B5'
  back.context.fillRect(0, 0, back.canvas.width, 18)
  back.context.fillStyle = '#0068B5'
  back.context.font = '700 34px "Space Grotesk", sans-serif'
  back.context.fillText('SHOPPER CHECKLIST', 72, 110)
  back.context.fillStyle = '#111827'
  back.context.font = '28px Inter, sans-serif'
  let y = 190
  checklist.forEach((item, index) => {
    y = wrapText(back.context, `${index + 1}. ${item}`, 72, y, back.canvas.width - 144, 42)
    y += 22
  })

  return {
    front: front.canvas.toDataURL('image/png'),
    back: back.canvas.toDataURL('image/png'),
  }
}

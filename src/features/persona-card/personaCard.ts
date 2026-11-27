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
    color: { dark: '#071426', light: '#FFFFFF' },
  })
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Unable to render QR code'))
    image.src = qrDataUrl
  })

  const front = createContext()
  front.context.fillStyle = '#071426'
  front.context.fillRect(0, 0, front.canvas.width, front.canvas.height)
  front.context.fillStyle = '#00A8FF'
  front.context.fillRect(0, 0, front.canvas.width, 16)
  front.context.fillStyle = '#00E5FF'
  front.context.font = '700 30px "Space Grotesk", sans-serif'
  front.context.fillText('AI PC SHOWDOWN', 72, 92)
  front.context.fillStyle = '#FFFFFF'
  front.context.font = '700 70px "Space Grotesk", sans-serif'
  front.context.fillText(input.personaName.toUpperCase(), 72, 190)
  front.context.fillStyle = '#94A3B8'
  front.context.font = '30px Inter, sans-serif'
  front.context.fillText(`Top priority: ${input.topPriority}`, 72, 240)
  front.context.fillText(input.storeName, 72, 282)
  front.context.fillStyle = '#FFFFFF'
  front.context.fillRect(240, 350, 420, 420)
  front.context.drawImage(image, 240, 350, 420, 420)
  front.context.fillStyle = '#94A3B8'
  front.context.font = '24px Inter, sans-serif'
  front.context.fillText('Scan for your saved persona and model codes.', 72, 900)

  const back = createContext()
  back.context.fillStyle = '#071426'
  back.context.fillRect(0, 0, back.canvas.width, back.canvas.height)
  back.context.fillStyle = '#00A8FF'
  back.context.fillRect(0, 0, back.canvas.width, 16)
  back.context.fillStyle = '#00E5FF'
  back.context.font = '700 34px "Space Grotesk", sans-serif'
  back.context.fillText('SHOPPER CHECKLIST', 72, 110)
  back.context.fillStyle = '#FFFFFF'
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

import type { PersonaId } from '../../types/game'

const payloadCodes: Record<PersonaId, string> = {
  THE_LEARNER: 'LEARNER',
  THE_CREATOR: 'CREATOR',
  THE_POWER_USER: 'POWER_USER',
  THE_GAMER: 'GAMER',
}

export const buildQrPayload = (input: {
  storeId: string
  persona: PersonaId
  modelCodes: string[]
}): string => {
  const codes = input.modelCodes.filter(Boolean).join(',')
  return `IPCS|STORE:${input.storeId}|P:${payloadCodes[input.persona]}|M:${codes}`
}

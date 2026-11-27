import personaData from '../../data/personas.json'
import type { PersonaId } from '../../types/game'
import type { PersonaDefinition } from '../../types/product'

export const personaDefinitions = personaData.personas as PersonaDefinition[]

export const getPersonaDefinition = (id: PersonaId | null): PersonaDefinition => {
  const match = personaDefinitions.find((definition) => definition.id === id)
  return match ?? personaDefinitions[0]
}

import competitorData from '../../data/competitors.json'
import type { CompetitorClass, CompetitorFact } from '../../types/product'

const validFact = (value: unknown): value is CompetitorFact =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as CompetitorFact).value === 'string' &&
  typeof (value as CompetitorFact).sourceUrl === 'string'

const validClass = (value: unknown): value is CompetitorClass => {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<CompetitorClass>
  const facts = candidate.comparisonFacts
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.npuNote === 'string' &&
    typeof candidate.npuSourceUrl === 'string' &&
    typeof facts === 'object' &&
    facts !== null &&
    validFact(facts.memory) &&
    validFact(facts.storage) &&
    validFact(facts.battery) &&
    validFact(facts.appSupport) &&
    Array.isArray(candidate.strengths) &&
    candidate.strengths.length > 0 &&
    candidate.strengths.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.text === 'string' &&
        typeof item.sourceUrl === 'string',
    ) &&
    Array.isArray(candidate.intelStrengths) &&
    candidate.intelStrengths.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.text === 'string' &&
        typeof item.sourceUrl === 'string',
    ) &&
    typeof candidate.lastVerified === 'string'
  )
}

const parsedClasses: unknown = competitorData.competitors

if (!Array.isArray(parsedClasses) || !parsedClasses.every(validClass)) {
  throw new Error('Invalid competitor data')
}

export const competitorClasses = parsedClasses as CompetitorClass[]

export interface CompetitorRow {
  label: string
  value: string
  sourceUrl: string
}

export const buildCompetitorRows = (
  competitor: CompetitorClass,
  persona: { priorities: string[] } | null,
): CompetitorRow[] => {
  const priorities = persona?.priorities.join(', ') ?? 'your priorities'
  return [
    { label: 'NPU approach', value: competitor.npuNote, sourceUrl: competitor.npuSourceUrl },
    {
      label: 'Memory',
      value: competitor.comparisonFacts.memory.value,
      sourceUrl: competitor.comparisonFacts.memory.sourceUrl,
    },
    {
      label: 'Storage',
      value: competitor.comparisonFacts.storage.value,
      sourceUrl: competitor.comparisonFacts.storage.sourceUrl,
    },
    {
      label: 'Battery capacity',
      value: competitor.comparisonFacts.battery.value,
      sourceUrl: competitor.comparisonFacts.battery.sourceUrl,
    },
    {
      label: `App support for ${priorities}`,
      value: competitor.comparisonFacts.appSupport.value,
      sourceUrl: competitor.comparisonFacts.appSupport.sourceUrl,
    },
    ...competitor.strengths.map((strength) => ({
      label: 'Competitor strength',
      value: strength.text,
      sourceUrl: strength.sourceUrl,
    })),
    ...competitor.intelStrengths.map((strength) => ({
      label: 'Intel strength',
      value: strength.text,
      sourceUrl: strength.sourceUrl,
    })),
    {
      label: 'Check before you buy',
      value: `Check independent reviews for ${priorities} before you decide.`,
      sourceUrl: '',
    },
  ]
}

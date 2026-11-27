import type { PacketRoute, PersonaId } from '../../types/game'

export interface WeeklyTaskEstimate {
  task: string
  engine: string
  playerChoiceNote: string
  specCitation: string
}

export interface WeeklyReport {
  personaHeadline: string
  tasks: WeeklyTaskEstimate[]
  batteryNote: string
  citedSpecs: Array<{ label: string; value: string; source: string }>
  assumptions: string[]
}

const HEADLINES: Record<PersonaId, string> = {
  THE_LEARNER: 'A study plan built around note summaries, local processing and portable specs.',
  THE_CREATOR: 'A creative plan built around memory, storage, display and supported effects.',
  THE_POWER_USER: 'A multitasking plan built around memory, local processing and battery capacity.',
  THE_GAMER: 'A gaming plan built around the GPU, memory and display.',
}

export const buildWeeklyReport = (
  packetRoutes: Record<string, PacketRoute>,
  persona: PersonaId | null = null,
): WeeklyReport => {
  const notesRoute = packetRoutes['notes-summary']
  const bgRoute = packetRoutes['background-removal']
  const privacyRoute = packetRoutes['confidential-document']
  const blurRoute = packetRoutes['call-blur'] ?? packetRoutes['background-blur-batch']

  const tasks: WeeklyTaskEstimate[] = [
    {
      task: 'Video call blur and noise removal',
      engine: blurRoute?.routedTo === 'NPU' && !blurRoute.fellBack ? 'NPU' : 'CPU or GPU',
      playerChoiceNote: blurRoute
        ? `You routed this to ${blurRoute.routedTo}${blurRoute.fellBack ? ' and saw a fallback' : ''}.`
        : 'Route it to the NPU only when the call app supports that effect.',
      specCitation: 'App support must be checked on the store unit.',
    },
    {
      task: 'Local document and note summaries',
      engine: privacyRoute?.routedTo === 'NPU' || notesRoute?.routedTo === 'NPU' ? 'NPU' : 'CPU',
      playerChoiceNote:
        privacyRoute?.routedTo === 'NPU' || notesRoute?.routedTo === 'NPU'
          ? 'In the demo, that file stayed on this device.'
          : 'Local processing keeps the file on the device; check the app settings.',
      specCitation: 'Privacy depends on the app and its settings.',
    },
    {
      task: 'Photo background removal',
      engine: bgRoute?.routedTo === 'NPU' && !bgRoute.fellBack ? 'NPU' : 'GPU',
      playerChoiceNote: bgRoute
        ? `You routed background removal to ${bgRoute.routedTo}.`
        : 'Some creative effects run on the GPU, even on an AI PC.',
      specCitation: 'RAM and storage matter when several apps are open.',
    },
  ]

  return {
    personaHeadline: persona
      ? HEADLINES[persona]
      : 'A plan built from your routing choices across the challenges.',
    tasks,
    batteryNote:
      'Routing supported tasks to the NPU can reduce power use. Real battery life depends on the laptop, screen, software and workload.',
    citedSpecs: [
      {
        label: 'NPU availability',
        value: 'Intel Core Ultra models in this store inventory',
        source: 'Store inventory, verified 27 Nov 2026',
      },
      {
        label: 'Battery capacity',
        value: 'Shown in Wh where the manufacturer publishes it',
        source: 'Store inventory, verified 27 Nov 2026',
      },
      {
        label: 'App support',
        value: 'Not assumed; ask our team',
        source: 'Store inventory',
      },
    ],
    assumptions: [
      'Each task uses the NPU only when the app supports it.',
      'The race is an illustrative routing simulation, not a benchmark.',
      'Compare the exact configuration, software support, warranty and price before you decide.',
    ],
  }
}

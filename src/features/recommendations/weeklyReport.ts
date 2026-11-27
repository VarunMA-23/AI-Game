import type { ChallengeId, PacketRoute, PersonaId } from '../../types/game'

export interface WeeklyTaskEstimate {
  task: string
  engine: string
  playerChoiceNote: string
  estimatedHoursPerWeek: string
  specCitation: string
}

export interface WeeklyReport {
  personaHeadline: string
  tasks: WeeklyTaskEstimate[]
  totalEstimatedHoursOffloaded: number
  estimatedBatteryGainPct: string
  citedSpecs: Array<{ label: string; value: string; source: string }>
  assumptions: string[]
}

const HEADLINES: Record<PersonaId, string> = {
  THE_LEARNER: 'Built for study sprints, lecture notes, and all-day campus battery.',
  THE_CREATOR: 'Built for layered photo/video edits without waking high-wattage cores.',
  THE_POWER_USER: 'Built for confidential local docs, multitasking, and quiet calls.',
  THE_GAMER: 'Built to keep GPU frames locked while the NPU handles call blur.',
}

export const buildWeeklyReport = (
  packetRoutes: Record<string, PacketRoute>,
  persona: PersonaId | null = null,
  challengeScores: Partial<Record<ChallengeId, number>> = {},
): WeeklyReport => {
  const npuCount = Object.values(packetRoutes).filter(
    (r) => r.routedTo === 'NPU' && !r.fellBack,
  ).length

  const notesRoute = packetRoutes['notes-summary']
  const bgRoute = packetRoutes['background-removal']
  const privacyRoute = packetRoutes['confidential-document']
  const blurRoute = packetRoutes['call-blur'] ?? packetRoutes['background-blur-batch']

  const tasks: WeeklyTaskEstimate[] = [
    {
      task: 'Video call background blur & noise removal',
      engine: 'NPU (The Quiet Assistant)',
      playerChoiceNote: blurRoute
        ? `You routed this to ${blurRoute.routedTo}${blurRoute.fellBack ? ' (fell back)' : ''}.`
        : 'Recommended for NPU offload in compatible call apps.',
      estimatedHoursPerWeek: `${(challengeScores['stream-night'] ?? 0) >= 120 ? '7–9' : '5–7'} hrs/week (estimate)`,
      specCitation: '11–47 NPU TOPS (Intel Core Ultra Spec)',
    },
    {
      task: 'Local lecture & contract summaries',
      engine: 'NPU (The Quiet Assistant)',
      playerChoiceNote:
        privacyRoute?.routedTo === 'NPU' || notesRoute?.routedTo === 'NPU'
          ? 'You kept this on-device (0 bytes uploaded).'
          : 'Moving this to the NPU keeps confidential files on-device.',
      estimatedHoursPerWeek: `${(challengeScores['privacy-shield'] ?? 0) >= 120 ? '4–5' : '2–3'} hrs/week (estimate)`,
      specCitation: '17W–28W Processor Base Power (Intel Ark 258V / 125H)',
    },
    {
      task: 'AI photo background removal & batch effects',
      engine: bgRoute?.routedTo === 'NPU' ? 'NPU (The Quiet Assistant)' : 'NPU + Arc GPU',
      playerChoiceNote: bgRoute
        ? `You routed background removal to ${bgRoute.routedTo}.`
        : 'Offloads routine masking from the GPU.',
      estimatedHoursPerWeek: `${(challengeScores['creator-mode'] ?? 0) >= 120 ? '3–4' : '1.5–2.5'} hrs/week (estimate)`,
      specCitation: '64–76 Wh battery capacity (DEL01 Verified Inventory)',
    },
  ]

  const baseHours = 6 + Math.min(8, npuCount * 1.5)
  const batteryGain = npuCount >= 3 ? '12%–18% (estimate)' : '8%–12% (estimate)'

  return {
    personaHeadline: persona
      ? HEADLINES[persona]
      : 'Personalized from your routing choices across all 5 challenges.',
    tasks,
    totalEstimatedHoursOffloaded: Math.round(baseHours),
    estimatedBatteryGainPct: batteryGain,
    citedSpecs: [
      {
        label: 'NPU Compute',
        value: '11–47 TOPS (Intel AI Boost)',
        source: 'Source: Intel Core Ultra Specifications',
      },
      {
        label: 'Battery Capacity',
        value: '64–76 Wh across DEL01 lineup',
        source: 'Source: DEL01 Verified Store Inventory (2026-11-20)',
      },
      {
        label: 'Processor Base Power',
        value: '17W (Core Ultra 7 258V) / 28W (Core Ultra 5 125H)',
        source: 'Source: Intel ARK Product Specifications',
      },
    ],
    assumptions: [
      'Assumes ~1.5 hours/day of video calls in NPU-compatible apps (Zoom, Microsoft Teams, Windows Studio Effects).',
      'Assumes 4–6 local document summary or photo-mask runs per week in supported apps.',
      'Secondary note: weekly hours and battery percentages are estimates; NPU TOPS, Wh, and TDP are published vendor specs.',
    ],
  }
}

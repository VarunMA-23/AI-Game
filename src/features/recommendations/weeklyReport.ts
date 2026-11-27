import type { PacketRoute } from '../../types/game'

export interface WeeklyTaskEstimate {
  task: string
  engine: string
  estimatedHoursPerWeek: string
  benefitNote: string
}

export interface WeeklyReport {
  tasks: WeeklyTaskEstimate[]
  totalEstimatedHoursOffloaded: number
  estimatedBatteryGainPct: string
  assumptions: string[]
}

export const buildWeeklyReport = (
  packetRoutes: Record<string, PacketRoute>,
): WeeklyReport => {
  const npuCount = Object.values(packetRoutes).filter(
    (r) => r.routedTo === 'NPU' && !r.fellBack,
  ).length

  const tasks: WeeklyTaskEstimate[] = [
    {
      task: 'Video call background blur & noise removal',
      engine: 'NPU (The Quiet Assistant)',
      estimatedHoursPerWeek: '6–8 hrs/week (estimate)',
      benefitNote: 'Keeps CPU & GPU cool during daily standups and classes.',
    },
    {
      task: 'Local document & lecture note summaries',
      engine: 'NPU (The Quiet Assistant)',
      estimatedHoursPerWeek: '3–4 hrs/week (estimate)',
      benefitNote: 'Runs on-device with zero cloud document uploads.',
    },
    {
      task: 'AI photo background removal & quick edits',
      engine: 'NPU + GPU',
      estimatedHoursPerWeek: '2–3 hrs/week (estimate)',
      benefitNote: 'Avoids waking high-wattage cores for routine masks.',
    },
  ]

  const baseHours = 6 + Math.min(6, npuCount * 1.5)
  const batteryGain = npuCount >= 3 ? '12%–18% (estimate)' : '8%–12% (estimate)'

  return {
    tasks,
    totalEstimatedHoursOffloaded: Math.round(baseHours),
    estimatedBatteryGainPct: batteryGain,
    assumptions: [
      'Assumes ~1.5 hours/day of video calls in compatible apps (Zoom, Teams, Windows Studio Effects).',
      'Assumes 4–6 local AI summary or photo-mask runs per week in NPU-enabled software.',
      'All hours and battery percentages are illustrative estimates — actual results vary by model, screen brightness, and app support.',
    ],
  }
}


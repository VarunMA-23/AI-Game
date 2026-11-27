import { describe, expect, it } from 'vitest'
import { gameConfig, getChallenge } from '../src/game/config/loadConfig'
import { batteryDrainFor, scoreBatteryEscape } from '../src/game/scoring/batteryEscape'
import type { BatteryEscapeChoice } from '../src/game/scoring/batteryEscape'

const packets = getChallenge('battery-escape').packets
const config = gameConfig.scoring
const routes: Record<string, BatteryEscapeChoice> = {
  'background-blur-batch': { engine: 'NPU', fellBack: false },
  'spreadsheet-recalc': { engine: 'CPU', fellBack: false },
  'video-export': { engine: 'GPU', fellBack: false },
  'notes-summary-batch': { engine: 'NPU', fellBack: false },
  'browser-tabs': { engine: 'CPU', fellBack: false },
}

describe('Battery Escape scorer', () => {
  it('rewards correct routes and a steadier illustrative battery', () => {
    const result = scoreBatteryEscape({ routes, elapsedMs: 12000 }, packets, config)
    expect(result.correctRoutes).toBe(5)
    expect(result.remainingBattery).toBe(76)
    expect(result.score).toBe(181)
    expect(result.subscores).toEqual({ batteryEscape: 76 })
  })

  it('does not move the meter when a no-benefit packet is sent to the NPU', () => {
    const packet = packets.find((item) => item.id === 'browser-tabs')
    expect(packet).toBeDefined()
    if (!packet) {
      return
    }
    expect(
      batteryDrainFor(packet, { engine: 'NPU', fellBack: true }, config),
    ).toBe(0)
  })

  it('removes the time bonus after the threshold', () => {
    const result = scoreBatteryEscape({ routes, elapsedMs: 20000 }, packets, config)
    expect(result.score).toBe(161)
  })

  it('uses only illustrative battery copy', () => {
    const challenge = getChallenge('battery-escape')
    const copy = [challenge.objective, challenge.educationalMessage].join(' ')
    expect(copy.toLowerCase()).toContain('illustrative')
    expect(copy).not.toMatch(/hours|minutes|% improvement|speedup/i)
    expect(gameConfig.race.noChangeCaption).toContain('does not change')
  })
})

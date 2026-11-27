import { describe, expect, it } from 'vitest'
import { gameConfig, getChallenge } from '../src/game/config/loadConfig'
import { scorePrivacyShield } from '../src/game/scoring/privacyShield'

const challenge = getChallenge('privacy-shield')
const correctLeakId = challenge.followUp?.correctId ?? 'app-settings'

describe('Privacy Shield scorer', () => {
  it('awards 200 for local processing and the app-settings answer', () => {
    expect(
      scorePrivacyShield(
        {
          choice: 'local',
          leakChoice: correctLeakId,
          correctLeakId,
          elapsedMs: 10000,
        },
        gameConfig.scoring,
      ),
    ).toBe(200)
  })

  it('gives no local points for cloud processing', () => {
    expect(
      scorePrivacyShield(
        {
          choice: 'cloud',
          leakChoice: correctLeakId,
          correctLeakId,
          elapsedMs: 10000,
        },
        gameConfig.scoring,
      ),
    ).toBe(55)
  })

  it('keeps the local choice score when the leak is missed', () => {
    expect(
      scorePrivacyShield(
        {
          choice: 'local',
          leakChoice: 'chip-only',
          correctLeakId,
          elapsedMs: 10000,
        },
        gameConfig.scoring,
      ),
    ).toBe(110)
  })

  it('shows the required result line without an NPU guarantee', () => {
    expect(challenge.resultLine).toBe(
      "Keeping the file on the device means it isn't sent to a cloud service. It doesn't make the app or the operating system private. Check the app's privacy settings.",
    )
    const allCopy = [
      challenge.scenario,
      challenge.objective,
      challenge.educationalMessage,
      challenge.resultLine ?? '',
    ].join(' ')
    expect(allCopy.toLowerCase()).not.toContain('npu guarantees privacy')
  })
})

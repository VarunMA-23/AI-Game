import type { Engine } from '../types/game'

export type CharacterMood = 'idle' | 'happy' | 'strained'

export interface EngineCharacter {
  engine: Engine
  name: string
  role: string
  tagline: string
  avatars: Record<CharacterMood, string>
  goodLines: string[]
  badLines: string[]
}

export const ENGINE_CHARACTERS: Record<Engine, EngineCharacter> = {
  CPU: {
    engine: 'CPU',
    name: 'The Generalist',
    role: 'Everyday coordinator',
    tagline: 'Handles tabs, docs & logic fast',
    avatars: {
      idle: '🧠',
      happy: '😎',
      strained: '😅',
    },
    goodLines: [
      'The Generalist: "Right in my wheelhouse — handled cleanly."',
      'The Generalist: "Quick, predictable, zero drama."',
    ],
    badLines: [
      'The Generalist: "I can do it, though an AI or graphics engine would be smoother."',
      'The Generalist: "Taking the load myself — my fans might notice."',
    ],
  },
  GPU: {
    engine: 'GPU',
    name: 'The Heavy Lifter',
    role: 'Visuals & rendering powerhouse',
    tagline: 'Built for games, video & filters',
    avatars: {
      idle: '🎮',
      happy: '🔥',
      strained: '🥵',
    },
    goodLines: [
      'The Heavy Lifter: "Frames locked. Pixels flying."',
      'The Heavy Lifter: "Heavy graphics? That is what I am here for."',
    ],
    badLines: [
      'The Heavy Lifter: "Overkill for a light background task — waking up the big cores."',
      'The Heavy Lifter: "I can crunch it, but it draws extra power."',
    ],
  },
  NPU: {
    engine: 'NPU',
    name: 'The Quiet Assistant',
    role: 'On-device AI specialist',
    tagline: 'Low-power blur, summaries & privacy',
    avatars: {
      idle: '✨',
      happy: '🤫',
      strained: '🤔',
    },
    goodLines: [
      'The Quiet Assistant: "Done silently on-device — CPU and GPU stay free."',
      'The Quiet Assistant: "Zero cloud upload, barely a ripple on battery."',
    ],
    badLines: [
      'The Quiet Assistant: "Not built for that workload — handing it back so nothing stalls."',
      'The Quiet Assistant: "I will pass this one to the main engines."',
    ],
  },
}

export const getCharacterVoiceLine = (engine: Engine, isGood: boolean, seed = 0): string => {
  const char = ENGINE_CHARACTERS[engine]
  const pool = isGood ? char.goodLines : char.badLines
  return pool[seed % pool.length] ?? pool[0]
}


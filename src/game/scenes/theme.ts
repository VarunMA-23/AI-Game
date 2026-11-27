import Phaser from 'phaser'

export const GAME_WIDTH = 1280
export const GAME_HEIGHT = 720

export const COLORS = {
  navy: 0xf8fafc,
  navySoft: 0xf1f5f9,
  intel: 0x0071c5,
  electric: 0x0071c5,
  cyan: 0x0284c7,
  white: 0x0f172a,
  muted: 0x64748b,
  success: 0x16a34a,
  rival: 0xe11d48,
} as const

export const FONT_DISPLAY = '"Space Grotesk", system-ui, sans-serif'
export const FONT_BODY = 'Inter, system-ui, sans-serif'

export const addBackdrop = (scene: Phaser.Scene): void => {
  scene.add.rectangle(
    GAME_WIDTH / 2,
    GAME_HEIGHT / 2,
    GAME_WIDTH,
    GAME_HEIGHT,
    COLORS.navy,
  )

  scene.add.rectangle(
    GAME_WIDTH / 2,
    0,
    GAME_WIDTH,
    4,
    COLORS.intel,
    0.7,
  )
}

export const addLabel = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  options: {
    size?: number
    color?: number
    display?: boolean
    origin?: number
    width?: number
  } = {},
): Phaser.GameObjects.Text =>
  scene.add.text(x, y, text, {
    fontFamily: options.display ? FONT_DISPLAY : FONT_BODY,
    fontSize: `${options.size ?? 20}px`,
    color: `#${(options.color ?? COLORS.white).toString(16).padStart(6, '0')}`,
    wordWrap: options.width ? { width: options.width } : undefined,
  }).setOrigin(options.origin ?? 0, 0)

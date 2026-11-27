import react from '@vitejs/plugin-react'
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'AI PC Showdown',
        short_name: 'AI PC Showdown',
        description: 'A 180-second offline retail experience.',
        theme_color: '#f8fafc',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff,woff2,json,webmanifest}',
        ],
        globIgnores: ['game/**'],
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/game\//],
      },
    }),
    {
      name: 'copy-cloudgarden',
      closeBundle() {
        const source = resolve(process.cwd(), 'game-dist')
        const target = resolve(process.cwd(), 'dist/game')
        if (!existsSync(source)) return
        rmSync(target, { recursive: true, force: true })
        mkdirSync(target, { recursive: true })
        cpSync(source, target, { recursive: true })
      },
    },
  ],
})

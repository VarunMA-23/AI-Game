/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: 'var(--color-navy)',
        intel: 'var(--color-intel)',
        electric: 'var(--color-electric)',
        cyan: 'var(--color-cyan)',
        muted: 'var(--color-muted)',
        success: 'var(--color-success)',
        rival: 'var(--color-rival)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

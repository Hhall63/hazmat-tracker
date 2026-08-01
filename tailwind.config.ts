import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a1120',
        panel: '#10192d',
        panel2: '#16223b',
        gold: {
          DEFAULT: '#cda349',
          bright: '#e6c479',
        },
        status: {
          red: '#d21f3c',
          amber: '#f2b705',
          green: '#34d399',
        },
        ink: {
          DEFAULT: '#eef2f7',
          dim: '#92a1b8',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config

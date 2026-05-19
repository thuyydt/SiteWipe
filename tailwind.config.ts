import type { Config } from 'tailwindcss'

export default {
  darkMode: 'media',
  content: ['./src/**/*.{vue,ts,html}'],
  theme: {
    extend: {
      borderRadius: {
        card: '12px',
      },
      colors: {
        surface: {
          DEFAULT: '#fafafa',
          dark: '#1c1c1e',
        },
      },
    },
  },
  plugins: [],
} satisfies Config

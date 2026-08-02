import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  theme: {
    extend: {
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        blood: {
          50: '#fff1f2',
          400: '#fb7185',
          500: '#ef4444',
          700: '#b91c1c',
          900: '#4c0519'
        },
        moon: '#e7d9b8',
        ember: '#f59e0b',
        iron: '#96a0aa',
        void: '#08090d'
      },
      boxShadow: {
        glow: '0 0 40px rgba(239, 68, 68, 0.18)',
        panel: '0 18px 60px rgba(0, 0, 0, 0.35)'
      },
      backgroundImage: {}
    }
  }
}

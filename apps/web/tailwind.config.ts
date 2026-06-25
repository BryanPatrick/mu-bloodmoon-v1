import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  darkMode: 'class',
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
      backgroundImage: {
        'hero-blood':
          'linear-gradient(90deg, rgba(8,9,13,.95), rgba(28,8,13,.78), rgba(8,9,13,.42)), url("https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=1800&q=80")'
      }
    }
  }
}

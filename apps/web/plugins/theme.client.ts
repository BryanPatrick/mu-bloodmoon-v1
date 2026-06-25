export default defineNuxtPlugin(() => {
  const savedTheme = localStorage.getItem('blood-moon-theme')
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches
  const theme = savedTheme || (prefersLight ? 'light' : 'dark')

  document.documentElement.classList.toggle('light', theme === 'light')
  document.documentElement.classList.toggle('dark', theme !== 'light')
})

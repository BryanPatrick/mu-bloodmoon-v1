export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  components: [
    {
      path: '~/components',
      pathPrefix: false
    }
  ],
  experimental: {
    appManifest: false
  },
  nitro: {
    externals: {
      trace: false
    }
  },
  vite: {
    optimizeDeps: {
      exclude: ['lucide-vue-next']
    }
  },
  modules: [
    '@nuxt/ui',
    '@pinia/nuxt'
  ],
  fonts: {
    providers: {
      bunny: false,
      fontshare: false,
      fontsource: false,
      google: false,
      googleicons: false
    },
    families: [
      { name: 'Cinzel', provider: 'none' },
      { name: 'Inter', provider: 'none' }
    ]
  },
  css: [
    '~/assets/css/main.css'
  ],
  app: {
    head: {
      titleTemplate: '%s | Blood Moon',
      htmlAttrs: { lang: 'pt-BR' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Portal oficial do servidor Blood Moon, uma experiência Mu Online premium com rankings, guias, notícias e downloads.'
        },
        { property: 'og:site_name', content: 'Blood Moon' },
        { property: 'og:type', content: 'website' },
        { name: 'theme-color', content: '#13080b' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;800&family=Inter:wght@400;500;600;700;800&display=swap'
        },
        { rel: 'preconnect', href: 'https://images.unsplash.com' },
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'shortcut icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/favicon.png' }
      ]
    }
  }
})

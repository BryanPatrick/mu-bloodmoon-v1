<template>
  <div>
    <PageHero kicker="Institucional" title="Sobre o Blood Moon" description="Conheça o portal, os serviços disponíveis e os canais oficiais publicados pela administração." />

    <section class="bm-container grid gap-8 py-14 lg:grid-cols-[1fr_340px]">
      <div class="grid gap-6">
        <article class="bm-panel rounded-md p-6">
          <p class="bm-kicker">Blood Moon</p>
          <h2 class="mt-2 font-display text-3xl font-bold text-white">Um ecossistema para o servidor</h2>
          <p class="mt-5 text-sm leading-7 text-zinc-300">
            Este portal centraliza o acesso à conta, personagens, Wiki, downloads, notícias, roadmap, loja, marketplace e comunidade do Blood Moon.
            Informações operacionais são publicadas pela administração e dados do jogo aparecem somente quando estão sincronizados com os serviços oficiais.
          </p>
        </article>

        <article class="bm-panel rounded-md p-6">
          <p class="bm-kicker">Áreas disponíveis</p>
          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <NuxtLink v-for="item in portalAreas" :key="item.to" :to="item.to" class="rounded-md border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-zinc-200 transition hover:border-blood-400/50 hover:bg-white/[0.07]">
              {{ item.label }}
            </NuxtLink>
          </div>
        </article>

        <article id="contato" class="bm-panel rounded-md p-6">
          <p class="bm-kicker">Contato</p>
          <h2 class="mt-2 font-display text-3xl font-bold text-white">Canais oficiais</h2>
          <p class="mt-4 text-sm leading-7 text-zinc-300">Somente canais cadastrados e publicados pela administração são exibidos abaixo.</p>
          <div v-if="socials.length" class="mt-5 flex flex-wrap gap-2">
            <a v-for="social in socials" :key="social.href" :href="social.href" class="rounded-md border border-white/10 px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10" target="_blank" rel="noopener noreferrer">{{ social.label }}</a>
          </div>
          <p v-else class="mt-5 text-sm font-bold text-white/45">Nenhum canal oficial foi publicado no momento.</p>
        </article>
      </div>

      <aside class="grid h-fit content-start gap-6">
        <div class="bm-panel rounded-md p-6">
          <h2 class="font-display text-2xl font-bold text-white">Servidor</h2>
          <div class="mt-5 grid gap-3">
            <div v-for="stat in serverFacts" :key="stat.label" class="flex justify-between border-b border-white/10 pb-3 text-sm">
              <span class="text-zinc-400">{{ stat.label }}</span>
              <strong class="text-moon">{{ stat.value }}</strong>
            </div>
          </div>
        </div>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({ title: 'Sobre o Blood Moon' })

const contentApi = useContentApi()
const settings = ref<Record<string, unknown>>({})
try { settings.value = await contentApi.settings<Record<string, unknown>>() } catch { settings.value = {} }

const portalAreas = [
  { label: 'Wiki', to: '/wiki' },
  { label: 'Downloads', to: '/downloads' },
  { label: 'Roadmap', to: '/roadmap' },
  { label: 'Loja', to: '/loja' },
  { label: 'Marketplace', to: '/marketplace' },
  { label: 'Comunidade', to: '/comunidade' }
]
const socialDefinitions = [
  ['Discord', 'launcher-discord-url'],
  ['WhatsApp', 'launcher-whatsapp-url'],
  ['Instagram', 'launcher-instagram-url'],
  ['YouTube', 'launcher-youtube-url']
] as const
const socials = computed(() => socialDefinitions.flatMap(([label, key]) => {
  const href = settings.value[key]
  return typeof href === 'string' && /^https:\/\//i.test(href) ? [{ label, href }] : []
}))
const serverFacts = computed(() => [
  { label: 'Versão', value: 'Season 6' },
  ...(typeof settings.value['launcher-client-version'] === 'string'
    ? [{ label: 'Cliente', value: settings.value['launcher-client-version'] as string }]
    : [])
])
</script>

<template>
  <div>
    <PageHero wide kicker="Biblioteca do jogador" title="Guias" description="Categorias completas para personagens, equipamentos, fórmulas, builds, chaos machine e monstros." />
    <section class="bm-guide-container grid gap-5 py-14 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      <article v-for="category in store.guideCategories" :key="category.title" class="bm-panel rounded-md p-6">
        <h2 class="font-display text-2xl font-bold text-white">{{ category.title }}</h2>
        <p class="mt-3 text-sm leading-7 text-zinc-400">{{ category.description }}</p>
        <div class="mt-5 flex flex-wrap gap-2">
          <template v-for="link in linksForCategory(category)" :key="link.label">
            <NuxtLink
              v-if="!link.disabled"
              :to="`/guias/${slugify(category.title)}/${slugify(link.label)}`"
              class="rounded-md border border-white/10 px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10"
            >
              {{ link.label }}
            </NuxtLink>
            <span
              v-else
              class="cursor-not-allowed rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-bold text-zinc-500"
              title="Disponivel em uma versao futura"
            >
              {{ link.label }} <span class="ml-1 text-ember">Futuro</span>
            </span>
          </template>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useSiteStore } from '~/stores/site'
import { permissions } from '~/data/security'

useSeoMeta({ title: 'Guias' })
const store = useSiteStore()
const { hasPermission, loadSession } = useAuth()
const futureCharacters = ['Grow Lancer', 'Rune Mage', 'Slayer', 'Gun Crusher', 'White Wizard', 'Mage']

onMounted(loadSession)

const linksForCategory = (category: { title: string, links: string[] }) =>
  category.links.map((label) => ({
    label,
    disabled: category.title === 'Personagens' || category.title === 'Personajes' || category.title === 'Characters'
      ? futureCharacters.includes(label) && !hasPermission(permissions.guidesFutureView)
      : false
  }))

const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
</script>

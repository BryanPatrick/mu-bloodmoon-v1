<template>
  <div>
    <PageHero wide kicker="Biblioteca do jogador" title="Guias" description="Categorias completas para personagens, equipamentos, fórmulas, builds, chaos machine e monstros." />
    <section class="bm-guide-container grid gap-5 py-14 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      <article v-for="category in store.guideCategories" :key="category.title" class="bm-panel guide-category-card rounded-md p-6">
        <div class="bm-icon-tile guide-category-card__icon"><BloodMoonIcon :name="iconForCategory(category.title)" class="size-5" /></div>
        <h2 class="bm-heading mt-4 font-display text-2xl font-bold">{{ category.title }}</h2>
        <p class="bm-copy mt-3">{{ category.description }}</p>
        <div class="mt-5 flex flex-wrap gap-2">
          <template v-for="link in linksForCategory(category)" :key="link.label">
            <NuxtLink
              v-if="!link.disabled"
              :to="`/guias/${slugify(category.title)}/${slugify(link.label)}`"
              class="guide-category-card__link"
            >
              {{ link.label }}
            </NuxtLink>
            <span
              v-else
              class="guide-category-card__link is-disabled"
              title="Disponivel em uma versao futura"
            >
              {{ link.label }} <span class="ml-1 text-[var(--bm-red)]">Futuro</span>
            </span>
          </template>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useSiteStore } from '~/stores/site'
import BloodMoonIcon from '~/components/ui/BloodMoonIcon.vue'

useSeoMeta({ title: 'Guias' })
const store = useSiteStore()

const categoryIcons: Record<string, string> = {
  Personagens: 'characters',
  Equipamentos: 'items',
  'Fórmulas': 'status',
  Builds: 'progress',
  'Chaos Machine': 'reset',
  'Mapas e PvM': 'maps',
  Eventos: 'trophy',
  'Quests e NPCs': 'book'
}
const iconForCategory = (title: string) => categoryIcons[title] || 'book'

const linksForCategory = (category: { title: string, links: string[] }) =>
  category.links.map((label) => ({
    label,
    disabled: false
  }))

const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
</script>

<style scoped>
.guide-category-card__icon { width: 44px; height: 44px; }
.guide-category-card__link {
  border: 1px solid var(--bm-border-strong);
  border-radius: 7px;
  padding: 0.5rem 0.75rem;
  color: var(--bm-text);
  font-size: 0.72rem;
  font-weight: 800;
  background: var(--bm-surface-strong);
  transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
}
.guide-category-card__link:hover { border-color: var(--bm-wine); background: var(--bm-surface); color: var(--bm-wine); }
.guide-category-card__link.is-disabled { cursor: not-allowed; color: var(--bm-muted); background: var(--bm-surface); }
</style>

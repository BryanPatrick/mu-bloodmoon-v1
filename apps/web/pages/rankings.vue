<template>
  <div>
    <PageHero :kicker="t('rankingsKicker')" title="Rankings" :description="t('rankingsDescription')" image="/images/guide-dark-lord-hero.png" />
    <section class="bm-container py-14">
      <div class="mb-8 flex flex-wrap gap-2">
        <button v-for="type in store.rankingTypes" :key="type" class="ranking-filter rounded-md border px-4 py-2 text-sm font-bold transition" :class="{ 'is-active': type === active }" @click="active = type">
          {{ type }}
        </button>
      </div>
      <div class="bm-panel overflow-x-auto rounded-md p-4">
        <h2 class="bm-heading mb-5 font-display text-2xl font-bold">{{ t('rankingOf') }} {{ active }}</h2>
        <RankingTable v-if="store.rankingRows.length" :rows="store.rankingRows" />
        <p v-else class="py-12 text-center text-sm font-bold text-white/45">O ranking ainda não possui dados sincronizados pelo servidor.</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useSiteStore } from '~/stores/site'

useSeoMeta({ title: 'Rankings' })
const store = useSiteStore()
const { t } = useLocale()
const active = ref('')

watchEffect(() => {
  if (!store.rankingTypes.includes(active.value)) {
    active.value = store.rankingTypes[1] || store.rankingTypes[0] || 'Reset'
  }
})
</script>

<style scoped>
.ranking-filter {
  border-color: var(--bm-border-strong);
  background: var(--bm-surface-strong);
  color: var(--bm-text);
}
.ranking-filter:hover {
  border-color: var(--bm-wine);
  color: var(--bm-wine);
  background: var(--bm-surface);
}
.ranking-filter.is-active {
  border-color: var(--bm-red);
  background: var(--bm-red);
  color: #ffffff;
}
</style>

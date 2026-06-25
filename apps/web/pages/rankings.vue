<template>
  <div>
    <PageHero :kicker="t('rankingsKicker')" title="Rankings" :description="t('rankingsDescription')" />
    <section class="bm-container py-14">
      <div class="mb-8 flex flex-wrap gap-2">
        <button v-for="type in store.rankingTypes" :key="type" class="rounded-md border px-4 py-2 text-sm font-bold transition" :class="type === active ? 'border-blood-400 bg-blood-700/30 text-white' : 'border-white/10 text-zinc-300 hover:bg-white/10'" @click="active = type">
          {{ type }}
        </button>
      </div>
      <div class="bm-panel overflow-x-auto rounded-md p-4">
        <h2 class="bm-heading mb-5 font-display text-2xl font-bold">{{ t('rankingOf') }} {{ active }}</h2>
        <RankingTable :rows="store.rankingRows" />
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

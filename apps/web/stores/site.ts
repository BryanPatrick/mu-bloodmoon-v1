import { defineStore } from 'pinia'

export const useSiteStore = defineStore('site', () => {
  const { dictionary, rankingRows } = useLocale()

  const mainNav = computed(() => dictionary.value.nav)
  const guideCategories = computed(() => dictionary.value.guideCategories)
  const rankingTypes = computed(() => dictionary.value.rankingTypes)
  const news = computed(() => dictionary.value.news)
  const serverStats = computed(() => dictionary.value.stats)

  return {
    mainNav,
    guideCategories,
    rankingTypes,
    news,
    rankingRows,
    serverStats
  }
})

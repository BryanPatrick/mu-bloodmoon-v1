<template>
  <div>
    <section class="relative overflow-hidden">
      <div
        v-for="(slide, index) in heroSlides"
        :key="slide.title"
        class="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
        :class="activeSlide === index ? 'opacity-100' : 'opacity-0'"
        :style="{ backgroundImage: slide.background }"
      />
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_78%_46%,rgba(8,9,13,0),rgba(8,9,13,0.14)_42%,rgba(8,9,13,0.5)_86%)]" />
      <div class="absolute inset-0 bg-gradient-to-r from-void/75 via-void/28 to-transparent" />
      <div class="pointer-events-none absolute inset-0 shadow-[inset_0_0_34px_rgba(0,0,0,0.38)]" />

      <button
        class="bm-button-glass absolute left-3 top-1/2 z-20 hidden size-12 -translate-y-1/2 place-items-center rounded-md text-white md:grid"
        type="button"
        aria-label="Slide anterior"
        @click="previousSlide"
      >
        <ChevronLeft class="size-6" />
      </button>
      <button
        class="bm-button-glass absolute right-3 top-1/2 z-20 hidden size-12 -translate-y-1/2 place-items-center rounded-md text-white md:grid"
        type="button"
        aria-label="Próximo slide"
        @click="nextSlide"
      >
        <ChevronRight class="size-6" />
      </button>

      <div class="bm-container relative z-10 flex min-h-[calc(100vh-5rem)] flex-col justify-center pb-28 pt-16">
        <Transition name="hero-copy" mode="out-in">
          <div :key="activeSlide" class="max-w-3xl">
            <p class="bm-kicker">{{ currentSlide.kicker }}</p>
            <h1 class="mt-4 font-display text-5xl font-extrabold text-white sm:text-7xl">{{ currentSlide.title }}</h1>
            <p class="mt-6 max-w-2xl text-lg leading-8 text-zinc-100">
              {{ currentSlide.description }}
            </p>
            <div class="mt-8 flex flex-wrap gap-3">
              <NuxtLink :to="currentSlide.primaryTo" class="rounded-md bg-blood-700 px-5 py-3 text-sm font-extrabold text-white shadow-glow transition hover:bg-blood-500">
                {{ currentSlide.primaryLabel }}
              </NuxtLink>
              <NuxtLink :to="currentSlide.secondaryTo" class="bm-button-glass rounded-md px-5 py-3 text-sm font-extrabold text-white transition">
                {{ currentSlide.secondaryLabel }}
              </NuxtLink>
            </div>
          </div>
        </Transition>
      </div>

      <div class="hero-stats-bar absolute inset-x-0 bottom-0 z-10">
        <div class="bm-container grid gap-3 py-2 sm:grid-cols-2 lg:grid-cols-6">
          <div v-for="stat in dictionary.stats" :key="stat.label" class="bm-panel flex items-center justify-between rounded-md px-3 py-1.5 lg:block">
            <span class="bm-muted text-[10px] font-bold uppercase leading-none tracking-[0.22em]">{{ stat.label }}</span>
            <strong class="font-display text-lg leading-tight text-moon lg:mt-0.5 lg:block">{{ stat.value }}</strong>
          </div>
        </div>
      </div>

      <div class="hero-slide-dots absolute left-1/2 z-20 flex -translate-x-1/2 gap-2">
        <button
          v-for="(_, index) in heroSlides"
          :key="index"
          class="h-1.5 rounded-full transition-all"
          :class="activeSlide === index ? 'w-8 bg-blood-500' : 'w-3 bg-white/45 hover:bg-white/70'"
          type="button"
          :aria-label="`Ir para slide ${index + 1}`"
          @click="activeSlide = index"
        />
      </div>
    </section>

    <section class="bm-container bm-density-compact grid gap-8 py-16 lg:grid-cols-[1.2fr_.8fr]">
      <div>
        <p class="bm-kicker">{{ t('latestNews') }}</p>
        <h2 class="bm-title mt-2">{{ t('followSeason') }}</h2>
        <div class="mt-8 grid gap-4">
          <article v-for="item in dictionary.news" :key="item.title" class="bm-panel rounded-md p-5">
            <div class="bm-muted flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.2em]">
              <span class="text-ember">{{ item.tag }}</span>
              <span>{{ item.date }}</span>
            </div>
            <h3 class="bm-heading mt-3 font-display text-2xl font-bold">{{ item.title }}</h3>
            <p class="bm-muted mt-3 text-sm leading-7">{{ item.excerpt }}</p>
          </article>
        </div>
      </div>

      <div class="bm-panel rounded-md p-5">
        <p class="bm-kicker">{{ t('topReset') }}</p>
        <h2 class="bm-heading mt-2 font-display text-2xl font-bold">{{ t('hall') }}</h2>
        <div class="mt-6 grid gap-3">
          <div v-for="row in rankingRows.slice(0, 4)" :key="row.name" class="bm-glass flex items-center justify-between rounded-md p-4">
            <div>
              <strong class="bm-heading block">#{{ row.pos }} {{ row.name }}</strong>
              <span class="bm-muted text-sm">{{ row.class }}</span>
            </div>
            <span class="font-bold text-ember">{{ row.score }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

useSeoMeta({
  title: 'Portal Oficial',
  ogTitle: 'Blood Moon - Portal Oficial'
})

const { dictionary, rankingRows, t } = useLocale()
const activeSlide = ref(0)
const heroSlides = computed(() => [
  {
    kicker: t('heroKicker'),
    title: t('heroTitle'),
    description: t('heroDescription'),
    primaryLabel: t('createAccount'),
    primaryTo: '/registrar',
    secondaryLabel: t('downloadClient'),
    secondaryTo: '/downloads',
    background:
      'linear-gradient(90deg, rgba(8,9,13,.7), rgba(20,8,12,.22), rgba(8,9,13,.02)), url("/images/hero-elfa-noria.png")'
  },
  {
    kicker: t('eventKicker'),
    title: t('eventTitle'),
    description: t('eventDescription'),
    primaryLabel: t('viewNews'),
    primaryTo: '/noticias',
    secondaryLabel: t('eventGuides'),
    secondaryTo: '/wiki',
    background:
      'linear-gradient(90deg, rgba(8,9,13,.72), rgba(35,8,16,.32), rgba(8,9,13,.08)), url("https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=1800&q=80")'
  },
  {
    kicker: t('rankingKicker'),
    title: t('rankingTitle'),
    description: t('rankingDescription'),
    primaryLabel: t('viewRankings'),
    primaryTo: '/rankings',
    secondaryLabel: t('knowServer'),
    secondaryTo: '/about',
    background:
      'linear-gradient(90deg, rgba(8,9,13,.72), rgba(22,10,14,.34), rgba(8,9,13,.1)), url("https://images.unsplash.com/photo-1531306728370-e2ebd9d7bb99?auto=format&fit=crop&w=1800&q=80")'
  }
])

const currentSlide = computed(() => heroSlides.value[activeSlide.value])
const nextSlide = () => {
  activeSlide.value = (activeSlide.value + 1) % heroSlides.value.length
}
const previousSlide = () => {
  activeSlide.value = (activeSlide.value - 1 + heroSlides.value.length) % heroSlides.value.length
}
</script>

<style scoped>
.hero-stats-bar {
  border-top: 1px solid rgba(255, 255, 255, 0.16);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(10, 11, 16, 0.18)),
    rgba(8, 9, 13, 0.26);
  backdrop-filter: blur(10px) saturate(1.25);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.hero-slide-dots {
  bottom: 92px;
}

@media (max-width: 1023px) {
  .hero-slide-dots {
    bottom: 220px;
  }
}

html.light .hero-stats-bar {
  border-top-color: rgba(255, 255, 255, 0.48);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.18)),
    rgba(255, 255, 255, 0.22);
}

.hero-copy-enter-active,
.hero-copy-leave-active {
  transition:
    opacity 260ms ease,
    transform 260ms ease;
}

.hero-copy-enter-from,
.hero-copy-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>

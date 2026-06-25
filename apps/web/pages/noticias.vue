<template>
  <div>
    <PageHero kicker="Central de notícias" title="Notícias" description="Eventos, destaques, atualizações e manutenções organizados para manter a comunidade sempre informada." />
    <section class="bm-container py-14">
      <div class="grid gap-5 lg:grid-cols-3">
        <article v-for="item in store.news" :key="item.title" class="bm-panel rounded-md p-6">
          <span class="text-xs font-bold uppercase tracking-[0.22em] text-ember">{{ item.tag }}</span>
          <h2 class="mt-4 font-display text-2xl font-bold text-white">{{ item.title }}</h2>
          <p class="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">{{ item.date }}</p>
          <p class="mt-4 text-sm leading-7 text-zinc-400">{{ item.excerpt }}</p>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useSiteStore } from '~/stores/site'

useSeoMeta({ title: 'Notícias' })
const store = useSiteStore()
</script>

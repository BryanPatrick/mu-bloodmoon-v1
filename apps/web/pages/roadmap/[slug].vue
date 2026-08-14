<template>
  <main class="roadmap-detail min-h-screen px-6 py-12 lg:px-12">
    <article v-if="item" class="mx-auto max-w-5xl">
      <NuxtLink to="/roadmap" class="text-xs font-black uppercase tracking-[0.18em] text-[var(--bm-red)]">Voltar ao roadmap</NuxtLink>
      <img v-if="item.image" :src="item.image" :alt="item.title" class="mt-8 aspect-[16/7] w-full rounded-md object-cover">
      <div class="mt-8 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em]">
        <span class="roadmap-tag roadmap-tag--category">{{ item.category }}</span>
        <span class="roadmap-tag roadmap-tag--status">{{ item.status }}</span>
        <span class="roadmap-tag roadmap-tag--status">{{ item.progress }}%</span>
      </div>
      <h1 class="bm-heading mt-5 font-display text-4xl font-black uppercase sm:text-6xl">{{ item.title }}</h1>
      <p class="bm-copy mt-5 text-lg font-semibold leading-8">{{ item.summary }}</p>
      <div class="roadmap-divider mt-10 grid gap-8 pt-10 md:grid-cols-2">
        <section><p class="bm-kicker">Objetivo</p><p class="bm-copy mt-3 whitespace-pre-line">{{ item.objective || item.description }}</p></section>
        <section><p class="bm-kicker">Beneficio ao jogador</p><p class="bm-copy mt-3 whitespace-pre-line">{{ item.playerBenefit || 'Detalhes em elaboracao.' }}</p></section>
      </div>
      <section class="mt-10"><p class="bm-kicker">Descricao</p><p class="bm-copy mt-3 whitespace-pre-line">{{ item.description }}</p></section>
      <section v-if="item.updates?.length" class="roadmap-divider mt-12 pt-10">
        <h2 class="bm-heading font-display text-3xl font-black uppercase">Atualizacoes</h2>
        <article v-for="update in item.updates" :key="update.id" class="roadmap-update mt-5 pl-5">
          <p class="text-xs font-black text-[var(--bm-red)]">{{ formatDate(update.createdAt) }}</p>
          <h3 class="bm-heading mt-2 font-display text-xl font-black">{{ update.title }}</h3>
          <p class="bm-copy mt-2 whitespace-pre-line">{{ update.content }}</p>
        </article>
      </section>
    </article>
  </main>
</template>

<script setup lang="ts">
const route = useRoute()
const api = useRoadmapApi()
const item = await api.publicDetail(String(route.params.slug)).catch(() => null)
if (!item) throw createError({ statusCode: 404, statusMessage: 'Iniciativa nao encontrada' })
useSeoMeta({ title: `${item.title} | Roadmap`, description: item.summary })
const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(value))
</script>

<style scoped>
.roadmap-detail { background: var(--bm-page-bg); color: var(--bm-text); }
.roadmap-tag { border-radius: 5px; padding: 0.25rem 0.5rem; }
.roadmap-tag--category { background: rgb(159 2 2 / 0.12); color: var(--bm-red); }
.roadmap-tag--status { background: var(--bm-surface); color: var(--bm-muted); }
.roadmap-divider { border-top: 1px solid var(--bm-border); }
.roadmap-update { border-left: 1px solid rgb(159 2 2 / 0.4); }
</style>

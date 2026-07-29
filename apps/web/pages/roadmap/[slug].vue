<template>
  <main class="min-h-screen bg-black px-6 py-12 text-white lg:px-12">
    <article v-if="item" class="mx-auto max-w-5xl">
      <NuxtLink to="/roadmap" class="text-xs font-black uppercase tracking-[0.18em] text-ember">Voltar ao roadmap</NuxtLink>
      <img v-if="item.image" :src="item.image" :alt="item.title" class="mt-8 aspect-[16/7] w-full object-cover">
      <div class="mt-8 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.16em]">
        <span class="bg-ember/15 px-2 py-1 text-ember">{{ item.category }}</span>
        <span class="bg-white/10 px-2 py-1">{{ item.status }}</span>
        <span class="bg-white/10 px-2 py-1">{{ item.progress }}%</span>
      </div>
      <h1 class="mt-5 font-display text-4xl font-black uppercase sm:text-6xl">{{ item.title }}</h1>
      <p class="mt-5 text-lg font-semibold leading-8 text-white/65">{{ item.summary }}</p>
      <div class="mt-10 grid gap-8 border-t border-white/10 pt-10 md:grid-cols-2">
        <section><p class="bm-kicker">Objetivo</p><p class="mt-3 whitespace-pre-line text-sm leading-7 text-white/65">{{ item.objective || item.description }}</p></section>
        <section><p class="bm-kicker">Beneficio ao jogador</p><p class="mt-3 whitespace-pre-line text-sm leading-7 text-white/65">{{ item.playerBenefit || 'Detalhes em elaboracao.' }}</p></section>
      </div>
      <section class="mt-10"><p class="bm-kicker">Descricao</p><p class="mt-3 whitespace-pre-line text-sm leading-7 text-white/65">{{ item.description }}</p></section>
      <section v-if="item.updates?.length" class="mt-12 border-t border-white/10 pt-10">
        <h2 class="font-display text-3xl font-black uppercase">Atualizacoes</h2>
        <article v-for="update in item.updates" :key="update.id" class="mt-5 border-l border-ember/60 pl-5">
          <p class="text-xs font-black text-ember">{{ formatDate(update.createdAt) }}</p>
          <h3 class="mt-2 font-display text-xl font-black">{{ update.title }}</h3>
          <p class="mt-2 whitespace-pre-line text-sm leading-7 text-white/60">{{ update.content }}</p>
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

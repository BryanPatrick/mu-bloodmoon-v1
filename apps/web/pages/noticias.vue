<template>
  <div>
    <PageHero kicker="Central de noticias" title="Noticias" description="Eventos, destaques, atualizacoes e manutencoes organizados para manter a comunidade sempre informada." />
    <section class="bm-container py-14">
      <div class="grid gap-5 lg:grid-cols-3">
        <article v-for="item in publishedNews" :key="item.id" class="bm-panel rounded-md p-6">
          <span class="text-xs font-bold uppercase tracking-[0.22em] text-ember">Noticia</span>
          <h2 class="mt-4 font-display text-2xl font-bold text-white">{{ item.title }}</h2>
          <p class="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">{{ formatDate(item.updatedAt) }}</p>
          <p class="mt-4 text-sm leading-7 text-zinc-400">{{ item.summary }}</p>
        </article>
        <p v-if="!publishedNews.length" class="text-sm font-bold text-white/45">Nenhuma noticia publicada no momento.</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({ title: 'Noticias' })
type NewsEntry = { id: string; title: string; summary?: string | null; updatedAt: string }
const contentApi = useContentApi()
const publishedNews = ref<NewsEntry[]>([])
try {
  const result = await contentApi.entries<{ data: NewsEntry[] }>({ kind: 'NEWS', pageSize: 60 })
  publishedNews.value = result.data
} catch {
  publishedNews.value = []
}
const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
</script>

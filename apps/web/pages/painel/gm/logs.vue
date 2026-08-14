<template>
  <ManagementShell>
    <div class="flex flex-col gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p class="bm-kicker">Operação de jogo</p>
        <h1 class="mt-2 font-display text-4xl font-black uppercase">Logs operacionais</h1>
        <p class="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/68">
          Eventos de comunidade, guildas, personagens e marketplace relevantes para a operação do jogo.
          Não inclui logs de infraestrutura, segurança ou financeiro.
        </p>
      </div>

      <select v-model="activeModule" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
        <option class="bg-zinc-950 text-white" value="">Todos os módulos</option>
        <option v-for="module in modules" :key="module" class="bg-zinc-950 text-white" :value="module">{{ module }}</option>
      </select>
    </div>

    <section class="mt-6 grid gap-2">
      <article v-for="entry in entries" :key="entry.id" class="bm-panel rounded-md p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em]">
            <span class="rounded-sm bg-white/10 px-2 py-1 text-white/65">{{ entry.module }}</span>
            <span class="text-white/45">{{ entry.eventType }}</span>
          </div>
          <span class="text-xs text-white/45">{{ formatDate(entry.occurredAt) }}</span>
        </div>
        <p class="mt-2 text-sm font-semibold">{{ entry.description }}</p>
        <p v-if="entry.entityType" class="mt-1 text-xs text-white/45">{{ entry.entityType }}{{ entry.entityId ? ` · ${entry.entityId}` : '' }}</p>
      </article>
      <p v-if="!entries.length" class="rounded-md border border-white/10 bg-black/20 p-6 text-center text-sm font-bold text-white/55">
        Nenhum evento operacional registrado.
      </p>
    </section>
  </ManagementShell>
</template>

<script setup lang="ts">
import type { GmLogEntry } from '~/composables/useGmApi'

const gmApi = useGmApi()
useSeoMeta({ title: 'Logs operacionais GM' })

const modules = ['community', 'guilds', 'characters', 'marketplace']
const activeModule = ref('')
const entries = ref<GmLogEntry[]>([])

const load = async () => {
  try {
    const result = await gmApi.logs({ module: activeModule.value || undefined, pageSize: 50 })
    entries.value = result.data
  } catch {
    entries.value = []
  }
}

watch(activeModule, load)
onMounted(load)

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
</script>

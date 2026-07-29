<template>
  <ManagementShell>
    <div class="grid gap-4">
      <AdminObservabilityHeader
        eyebrow="Auditoria"
        title="Exportações"
        description="Exporte conjuntos sanitizados em CSV e acompanhe quem gerou cada arquivo."
      >
        <UButton color="neutral" variant="soft" :loading="loading" @click="load"><RefreshCw class="size-4" /> Atualizar</UButton>
      </AdminObservabilityHeader>
      <AdminObservabilityNav />

      <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article v-for="source in sources" :key="source.key" class="bm-panel rounded-md p-4">
          <component :is="source.icon" class="size-5 text-ember" />
          <h2 class="mt-4 text-sm font-black uppercase">{{ source.label }}</h2>
          <p class="mt-2 min-h-10 text-xs font-semibold leading-5 text-white/55">{{ source.description }}</p>
          <UButton class="mt-4 w-full justify-center" color="neutral" variant="soft" :loading="downloading === source.key" @click="download(source.key)">
            <Download class="size-4" /> Exportar CSV
          </UButton>
        </article>
      </section>

      <p v-if="errorMessage" class="rounded-md border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{{ errorMessage }}</p>

      <section class="bm-panel rounded-md p-4">
        <div class="flex items-center justify-between gap-3">
          <div><p class="bm-kicker">Histórico</p><h2 class="mt-2 font-display text-xl font-black uppercase">Arquivos gerados</h2></div>
          <span class="rounded-sm bg-white/8 px-2 py-1 text-[10px] font-black">{{ items.length }} REGISTROS</span>
        </div>
        <div v-if="items.length" class="mt-4 grid gap-2">
          <article v-for="item in items" :key="String(item.id)" class="grid gap-2 rounded-md border border-white/8 bg-black/15 p-3 md:grid-cols-[1fr_130px_130px_150px] md:items-center">
            <div><p class="text-xs font-black">{{ item.fileName || item.source }}</p><p class="mt-1 font-mono text-[10px] text-white/35">{{ item.checksum }}</p></div>
            <p class="text-xs font-bold text-white/60">{{ item.recordCount }} registros</p>
            <span class="w-fit rounded-sm bg-emerald-400/12 px-2 py-1 text-[10px] font-black text-emerald-200">{{ item.status }}</span>
            <p class="text-xs font-semibold text-white/50">{{ formatDate(String(item.createdAt)) }}</p>
          </article>
        </div>
        <AdminEmptyState v-else-if="!loading" class="mt-4" title="Nenhuma exportação" description="Os arquivos gerados serão registrados aqui com checksum e responsável." :icon="Download" />
      </section>
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import { Activity, AlertTriangle, ClipboardCheck, Download, FileSearch, RefreshCw } from 'lucide-vue-next'

useSeoMeta({ title: 'Exportações de logs' })
const api = useAdminObservabilityApi()
const items = ref<Array<Record<string, unknown>>>([])
const loading = ref(false)
const downloading = ref('')
const errorMessage = ref('')
const sources = [
  { key: 'audit' as const, label: 'Auditoria', description: 'Ações administrativas e alterações.', icon: FileSearch },
  { key: 'work' as const, label: 'Trabalho', description: 'Comprovação das atividades da equipe.', icon: ClipboardCheck },
  { key: 'events' as const, label: 'Eventos', description: 'Fluxos comerciais e operacionais.', icon: Activity },
  { key: 'errors' as const, label: 'Erros', description: 'Incidentes agrupados e situação atual.', icon: AlertTriangle }
]
onMounted(load)
async function load() {
  loading.value = true
  errorMessage.value = ''
  try { items.value = await api.exports() } catch (error) { errorMessage.value = 'Não foi possível consultar as exportações.'; console.error(error) } finally { loading.value = false }
}
async function download(source: 'audit' | 'work' | 'events' | 'errors') {
  downloading.value = source
  errorMessage.value = ''
  try { await api.downloadExport(source); await load() } catch (error) { errorMessage.value = 'Não foi possível gerar o arquivo.'; console.error(error) } finally { downloading.value = '' }
}
const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
</script>

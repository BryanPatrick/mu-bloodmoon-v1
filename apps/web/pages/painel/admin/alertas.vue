<template>
  <ManagementShell>
    <div class="grid gap-4">
      <AdminObservabilityHeader
        eyebrow="Monitoramento"
        title="Alertas criticos"
        description="Anomalias operacionais que exigem confirmacao, atribuicao e resolucao da equipe."
      >
        <UButton color="neutral" variant="soft" :loading="loading" @click="load"><RefreshCw class="size-4" /> Atualizar</UButton>
      </AdminObservabilityHeader>
      <AdminObservabilityNav />

      <form class="bm-panel grid gap-3 rounded-md p-3 lg:grid-cols-[1fr_170px_170px_auto]" @submit.prevent="load">
        <input v-model="filters.search" class="bm-alert-input" type="search" placeholder="Buscar alerta">
        <select v-model="filters.severity" class="bm-alert-input"><option value="">Severidades</option><option v-for="value in severities" :key="value">{{ value }}</option></select>
        <select v-model="filters.status" class="bm-alert-input"><option value="">Todos os status</option><option v-for="value in statuses" :key="value">{{ value }}</option></select>
        <UButton type="submit">Filtrar</UButton>
      </form>

      <p v-if="errorMessage" class="rounded-md border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{{ errorMessage }}</p>
      <section v-if="items.length" class="grid gap-3 xl:grid-cols-2">
        <article v-for="item in items" :key="item.id" class="bm-panel rounded-md border-l-2 border-l-red-400/60 p-4">
          <div class="flex items-start justify-between gap-3">
            <div><p class="text-[10px] font-black uppercase tracking-[0.18em] text-ember">{{ item.module }} / {{ item.alertType }}</p><h2 class="mt-2 text-sm font-black">{{ item.title }}</h2></div>
            <span class="rounded-sm bg-red-400/15 px-2 py-1 text-[10px] font-black text-red-100">{{ item.severity }}</span>
          </div>
          <p class="mt-3 text-xs font-semibold leading-5 text-white/60">{{ item.message }}</p>
          <div class="mt-4 flex flex-wrap items-center gap-2">
            <span class="rounded-sm bg-white/8 px-2 py-1 text-[10px] font-black">{{ item.status }}</span>
            <span class="text-[10px] text-white/40">{{ item.assignedTo || 'Sem responsavel' }}</span>
            <span class="ml-auto text-[10px] text-white/40">{{ formatDate(item.createdAt) }}</span>
          </div>
          <div v-if="canManage && item.status !== 'RESOLVED'" class="mt-4 flex gap-2">
            <UButton size="xs" color="neutral" variant="soft" :loading="saving === item.id" @click="update(item, 'ACKNOWLEDGED')">Reconhecer</UButton>
            <UButton size="xs" :loading="saving === item.id" @click="update(item, 'RESOLVED')">Resolver</UButton>
          </div>
        </article>
      </section>
      <AdminEmptyState v-else-if="!loading" title="Sem alertas" description="Nenhuma anomalia corresponde aos filtros selecionados." :icon="BellRing" />
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import { BellRing, RefreshCw } from 'lucide-vue-next'
import type { SystemAlertRecord } from '~/composables/useAdminObservabilityApi'
import { permissions } from '~/data/security'

useSeoMeta({ title: 'Alertas criticos' })
const api = useAdminObservabilityApi()
const { hasPermission } = useAuth()
const canManage = computed(() => hasPermission(permissions.adminAlertsManage))
const items = ref<SystemAlertRecord[]>([])
const loading = ref(false)
const saving = ref('')
const errorMessage = ref('')
const filters = reactive({ search: '', severity: '', status: '' })
const severities = ['INFO', 'WARNING', 'ERROR', 'CRITICAL']
const statuses = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED']
onMounted(load)
async function load() {
  loading.value = true
  try {
    const response = await api.alerts({ ...filters, pageSize: 100 })
    items.value = response.items
  } catch (error) {
    errorMessage.value = 'Nao foi possivel carregar os alertas.'
    console.error(error)
  } finally { loading.value = false }
}
async function update(item: SystemAlertRecord, status: string) {
  saving.value = item.id
  try { await api.updateAlert(item.id, { status, reason: `Alerta ${status.toLowerCase()} pelo painel.` }); await load() }
  catch (error) { errorMessage.value = 'Nao foi possivel atualizar o alerta.'; console.error(error) }
  finally { saving.value = '' }
}
const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
</script>

<style scoped>
.bm-alert-input {
  min-height: 2.5rem;
  min-width: 0;
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 0.375rem;
  background: rgb(255 255 255 / 0.06);
  padding-inline: 0.75rem;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
}
.bm-alert-input option { background: #111; }
</style>

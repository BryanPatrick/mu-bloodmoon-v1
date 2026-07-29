<template>
  <ManagementShell>
    <div class="grid gap-4">
      <AdminObservabilityHeader
        eyebrow="Super ADM"
        title="Politica de retencao"
        description="Prazos minimos de conservacao. Registros financeiros, comerciais e de auditoria permanecem protegidos contra exclusao por ADM comum."
      />
      <AdminObservabilityNav />
      <p v-if="errorMessage" class="rounded-md border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{{ errorMessage }}</p>
      <section v-if="items.length" class="grid gap-3 lg:grid-cols-2">
        <form v-for="item in items" :key="item.id" class="bm-panel grid gap-3 rounded-md p-4" @submit.prevent="save(item)">
          <div class="flex items-start justify-between gap-3">
            <div><p class="bm-kicker">{{ item.dataType }}</p><h2 class="mt-2 text-sm font-black uppercase">Retencao de registros</h2></div>
            <span class="rounded-sm px-2 py-1 text-[10px] font-black" :class="item.enabled ? 'bg-emerald-400/12 text-emerald-200' : 'bg-white/8 text-white/45'">{{ item.enabled ? 'ATIVA' : 'INATIVA' }}</span>
          </div>
          <label class="grid gap-1 text-[10px] font-black uppercase text-white/45">Dias de retencao
            <input v-model.number="item.retentionDays" class="bm-retention-input" type="number" min="30" step="1">
          </label>
          <label class="flex items-center gap-2 text-xs font-bold text-white/65"><input v-model="item.enabled" type="checkbox"> Politica habilitada</label>
          <p v-if="item.immutableForAdmin" class="text-[10px] font-bold leading-4 text-amber-100/70">ADM comum nao pode apagar estes registros.</p>
          <UButton type="submit" class="w-fit" :loading="saving === item.dataType"><Save class="size-4" /> Salvar</UButton>
        </form>
      </section>
      <AdminEmptyState v-else-if="!loading" title="Sem politicas" description="Execute a migracao de observabilidade para criar as politicas iniciais." :icon="Database" />
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import { Database, Save } from 'lucide-vue-next'
import type { RetentionPolicyRecord } from '~/composables/useAdminObservabilityApi'

useSeoMeta({ title: 'Politica de retencao' })
const api = useAdminObservabilityApi()
const items = ref<RetentionPolicyRecord[]>([])
const loading = ref(false)
const saving = ref('')
const errorMessage = ref('')
onMounted(load)
async function load() {
  loading.value = true
  try { items.value = await api.retentionPolicies() }
  catch (error) { errorMessage.value = 'Nao foi possivel carregar as politicas.'; console.error(error) }
  finally { loading.value = false }
}
async function save(item: RetentionPolicyRecord) {
  saving.value = item.dataType
  try {
    const updated = await api.updateRetentionPolicy(item.dataType, {
      retentionDays: item.retentionDays,
      enabled: item.enabled,
      reason: 'Politica atualizada pelo painel de Super ADM.'
    })
    Object.assign(item, updated)
  } catch (error) {
    errorMessage.value = 'Nao foi possivel salvar a politica.'
    console.error(error)
  } finally { saving.value = '' }
}
</script>

<style scoped>
.bm-retention-input {
  min-height: 2.5rem;
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 0.375rem;
  background: rgb(255 255 255 / 0.06);
  padding-inline: 0.75rem;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
}
</style>

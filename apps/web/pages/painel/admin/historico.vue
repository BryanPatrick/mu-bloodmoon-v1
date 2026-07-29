<template>
  <ManagementShell>
    <div class="grid gap-4">
      <AdminObservabilityHeader
        eyebrow="Auditoria"
        title="Histórico de alterações"
        description="Reconstrua a linha do tempo de um registro usando o tipo e o identificador da entidade."
      />
      <AdminObservabilityNav />
      <form class="bm-panel grid gap-3 rounded-md p-4 md:grid-cols-[220px_1fr_auto]" @submit.prevent="load">
        <input v-model="entityType" required class="bm-history-input" placeholder="Tipo: ShopProduct">
        <input v-model="entityId" required class="bm-history-input font-mono" placeholder="ID do registro">
        <UButton type="submit" :loading="loading"><Search class="size-4" /> Consultar</UButton>
      </form>

      <p v-if="errorMessage" class="rounded-md border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">{{ errorMessage }}</p>

      <section v-if="items.length" class="relative grid gap-3 pl-8 before:absolute before:bottom-4 before:left-3 before:top-4 before:w-px before:bg-white/15">
        <article v-for="item in items" :key="item.id" class="bm-panel relative rounded-md p-4 before:absolute before:-left-[26px] before:top-5 before:size-3 before:rounded-full before:border-2 before:border-black before:bg-ember">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-ember">Versão {{ item.version }}</p>
              <p class="mt-1 text-sm font-black uppercase">{{ item.action }}</p>
              <p class="mt-1 text-xs font-semibold text-white/55">{{ item.actorUsername || 'system' }} · {{ formatDate(item.createdAt) }}</p>
            </div>
            <span class="rounded-sm bg-white/8 px-2 py-1 text-[10px] font-black">{{ item.result }}</span>
          </div>
          <p v-if="item.reason" class="mt-3 text-xs font-semibold text-white/65">Motivo: {{ item.reason }}</p>
          <div class="mt-3 grid gap-3 lg:grid-cols-2">
            <AuditJsonBlock title="Antes" :value="item.beforeData" />
            <AuditJsonBlock title="Depois" :value="item.afterData" />
          </div>
          <p v-if="item.correlationId" class="mt-3 font-mono text-[10px] text-white/35">Correlação: {{ item.correlationId }}</p>
        </article>
      </section>

      <AdminEmptyState
        v-else-if="searched && !loading"
        title="Histórico não encontrado"
        description="Confira o tipo e o identificador do registro informado."
        :icon="FileClock"
      />
      <AdminEmptyState
        v-else
        title="Selecione um registro"
        description="Informe a entidade e o ID para visualizar todas as alterações registradas."
        :icon="Search"
      />
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import { FileClock, Search } from 'lucide-vue-next'
import type { AuditRecord } from '~/composables/useAdminObservabilityApi'

useSeoMeta({ title: 'Histórico de alterações' })
const api = useAdminObservabilityApi()
const entityType = ref('')
const entityId = ref('')
const items = ref<AuditRecord[]>([])
const loading = ref(false)
const searched = ref(false)
const errorMessage = ref('')
const load = async () => {
  loading.value = true
  searched.value = true
  errorMessage.value = ''
  try {
    items.value = await api.history(entityType.value.trim(), entityId.value.trim())
  } catch (error) {
    items.value = []
    errorMessage.value = 'Não foi possível consultar o histórico.'
    console.error(error)
  } finally {
    loading.value = false
  }
}
const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
</script>

<style scoped>
.bm-history-input {
  min-height: 2.5rem;
  min-width: 0;
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 0.375rem;
  background: rgb(255 255 255 / 0.06);
  padding-inline: 0.75rem;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
  outline: none;
}
</style>

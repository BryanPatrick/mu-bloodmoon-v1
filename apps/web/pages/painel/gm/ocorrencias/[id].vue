<template>
  <ManagementShell>
    <NuxtLink to="/painel/gm/ocorrencias" class="text-xs font-black text-ember">← Voltar para ocorrências</NuxtLink>

    <div v-if="occurrence" class="mt-4 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <section class="bm-panel rounded-md p-6">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-sm px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em]" :class="statusClass(occurrence.status)">
            {{ statusLabel(occurrence.status) }}
          </span>
          <span class="text-xs font-bold text-white/45">{{ occurrence.type }}</span>
        </div>
        <p class="mt-4 text-sm font-semibold leading-7">{{ occurrence.description }}</p>
        <div class="mt-4 grid gap-2 text-xs text-white/45 sm:grid-cols-2">
          <span>Criado por {{ occurrence.createdBy }} em {{ formatDate(occurrence.createdAt) }}</span>
          <span v-if="occurrence.targetType">Alvo: {{ occurrence.targetType }} {{ occurrence.targetId }}</span>
          <span v-if="occurrence.assignedTo">Responsável: {{ occurrence.assignedTo }}</span>
          <span v-if="occurrence.resolvedAt">Encerrada em {{ formatDate(occurrence.resolvedAt) }}</span>
        </div>

        <h2 class="mt-6 font-display text-xl font-black uppercase">Notas</h2>
        <div class="mt-3 grid gap-2">
          <div v-for="note in occurrence.notes" :key="note.id" class="rounded-md border border-white/10 bg-black/25 p-3">
            <div class="flex items-center justify-between gap-3 text-xs text-white/45">
              <strong class="text-white/70">{{ note.author }}</strong>
              <span>{{ formatDate(note.createdAt) }}</span>
            </div>
            <p class="mt-1 text-sm font-semibold">{{ note.note }}</p>
          </div>
          <p v-if="!occurrence.notes.length" class="text-sm text-white/45">Nenhuma nota registrada.</p>
        </div>

        <form class="mt-4 grid gap-2" @submit.prevent="submitNote">
          <textarea v-model="noteText" class="min-h-20 rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Adicionar nota operacional"></textarea>
          <button class="bm-liquid-primary w-fit px-5 py-3 text-sm font-black" type="submit">Adicionar nota</button>
        </form>
      </section>

      <section class="bm-panel rounded-md p-6">
        <h2 class="font-display text-xl font-black uppercase">Alterar status</h2>
        <div class="mt-4 grid gap-2">
          <button
            v-for="status in transitionableStatuses"
            :key="status"
            class="rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-black hover:border-ember/50"
            type="button"
            @click="changeStatus(status)"
          >
            {{ statusLabel(status) }}
          </button>
        </div>
        <p v-if="statusError" class="mt-3 text-xs font-bold text-blood-200">{{ statusError }}</p>
      </section>
    </div>

    <p v-else-if="loadError" class="mt-6 rounded-md border border-white/10 bg-black/20 p-6 text-center text-sm font-bold text-white/55">
      Não foi possível carregar esta ocorrência.
    </p>
  </ManagementShell>
</template>

<script setup lang="ts">
import type { GmOccurrenceDetail, GmOccurrenceStatus } from '~/composables/useGmApi'

const route = useRoute()
const gmApi = useGmApi()
useSeoMeta({ title: 'Ocorrência GM' })

const statusLabels: Record<GmOccurrenceStatus, string> = {
  OPEN: 'Aberta',
  IN_REVIEW: 'Em análise',
  ACTION_REQUIRED: 'Ação necessária',
  RESOLVED: 'Resolvida',
  DISMISSED: 'Descartada'
}
const statusLabel = (status: GmOccurrenceStatus) => statusLabels[status] || status
const statusClass = (status: GmOccurrenceStatus) => ({
  'bg-amber-500/15 text-amber-100': status === 'OPEN' || status === 'ACTION_REQUIRED',
  'bg-cyan-500/15 text-cyan-100': status === 'IN_REVIEW',
  'bg-emerald-500/15 text-emerald-100': status === 'RESOLVED',
  'bg-white/10 text-white/55': status === 'DISMISSED'
})

const occurrence = ref<GmOccurrenceDetail | null>(null)
const loadError = ref(false)
const noteText = ref('')
const statusError = ref('')

const allStatuses: GmOccurrenceStatus[] = ['OPEN', 'IN_REVIEW', 'ACTION_REQUIRED', 'RESOLVED', 'DISMISSED']
const transitionableStatuses = computed(() => allStatuses.filter((status) => status !== occurrence.value?.status))

const load = async () => {
  try {
    occurrence.value = await gmApi.getOccurrence(String(route.params.id))
  } catch {
    occurrence.value = null
    loadError.value = true
  }
}

onMounted(load)

const submitNote = async () => {
  if (!noteText.value.trim() || !occurrence.value) return
  try {
    occurrence.value = await gmApi.addNote(occurrence.value.id, noteText.value.trim())
    noteText.value = ''
  } catch {
    statusError.value = 'Não foi possível adicionar a nota.'
  }
}

const changeStatus = async (status: GmOccurrenceStatus) => {
  if (!occurrence.value) return
  statusError.value = ''
  const closing = status === 'RESOLVED' || status === 'DISMISSED'
  let reason: string | undefined
  if (closing) {
    reason = window.prompt(`Motivo para marcar como "${statusLabel(status)}" (mínimo 5 caracteres):`)?.trim()
    if (!reason || reason.length < 5) {
      statusError.value = 'É necessário informar um motivo com pelo menos 5 caracteres para encerrar a ocorrência.'
      return
    }
  }
  try {
    occurrence.value = await gmApi.updateOccurrence(occurrence.value.id, { status, reason })
  } catch {
    statusError.value = 'Não foi possível atualizar o status.'
  }
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
</script>

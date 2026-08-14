<template>
  <ManagementShell>
    <div class="flex flex-col gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p class="bm-kicker">Operação de jogo</p>
        <h1 class="mt-2 font-display text-4xl font-black uppercase">Ocorrências</h1>
        <p class="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/68">
          Registro e acompanhamento de ocorrências operacionais -- denúncias, incidentes em eventos, comportamento suspeito ou disputas.
          Nenhuma ação aqui aplica punição automática.
        </p>
      </div>

      <div class="bm-glass grid gap-3 rounded-md p-3 sm:grid-cols-2 xl:min-w-[420px]">
        <select v-model="activeStatus" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
          <option class="bg-zinc-950 text-white" value="">Todos status</option>
          <option v-for="status in statuses" :key="status" class="bg-zinc-950 text-white" :value="status">{{ statusLabel(status) }}</option>
        </select>
        <button class="h-11 rounded-md bg-blood-700 text-sm font-black text-white transition hover:bg-blood-500" type="button" @click="showCreate = true">
          Nova ocorrência
        </button>
      </div>
    </div>

    <section v-if="showCreate" class="bm-panel mt-6 grid gap-3 rounded-md p-5">
      <h2 class="font-display text-xl font-black uppercase">Registrar ocorrência</h2>
      <input v-model="createForm.type" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Tipo (ex: denuncia, incidente-evento, comportamento-suspeito)">
      <textarea v-model="createForm.description" class="min-h-24 rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Descrição"></textarea>
      <div class="grid gap-3 sm:grid-cols-2">
        <input v-model="createForm.targetType" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Alvo: tipo (opcional, ex: AccountCharacter)">
        <input v-model="createForm.targetId" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Alvo: id (opcional)">
      </div>
      <div class="flex gap-2">
        <button class="bm-liquid-primary w-fit px-5 py-3 text-sm font-black" type="button" @click="submitCreate">Registrar</button>
        <button class="w-fit rounded-md border border-white/10 px-5 py-3 text-sm font-black text-white/65" type="button" @click="showCreate = false">Cancelar</button>
      </div>
      <p v-if="createError" class="text-xs font-bold text-blood-200">{{ createError }}</p>
    </section>

    <section class="mt-6 grid gap-4">
      <NuxtLink
        v-for="occurrence in occurrences"
        :key="occurrence.id"
        :to="`/painel/gm/ocorrencias/${occurrence.id}`"
        class="bm-panel block rounded-md p-5 transition hover:border-ember/40"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="rounded-sm px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em]" :class="statusClass(occurrence.status)">
              {{ statusLabel(occurrence.status) }}
            </span>
            <span class="text-xs font-bold text-white/45">{{ occurrence.type }}</span>
          </div>
          <span class="text-xs text-white/45">{{ formatDate(occurrence.createdAt) }}</span>
        </div>
        <p class="mt-3 text-sm font-bold">{{ occurrence.description }}</p>
        <div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/45">
          <span>Criado por {{ occurrence.createdBy }}</span>
          <span v-if="occurrence.assignedTo">Responsável: {{ occurrence.assignedTo }}</span>
          <span>{{ occurrence.noteCount }} nota(s)</span>
        </div>
      </NuxtLink>
      <p v-if="!occurrences.length" class="rounded-md border border-white/10 bg-black/20 p-6 text-center text-sm font-bold text-white/55">
        Nenhuma ocorrência registrada{{ activeStatus ? ' com esse status' : '' }}.
      </p>
    </section>
  </ManagementShell>
</template>

<script setup lang="ts">
import type { GmOccurrenceStatus, GmOccurrenceSummary } from '~/composables/useGmApi'

const gmApi = useGmApi()
useSeoMeta({ title: 'Ocorrências GM' })

const statuses: GmOccurrenceStatus[] = ['OPEN', 'IN_REVIEW', 'ACTION_REQUIRED', 'RESOLVED', 'DISMISSED']
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

const occurrences = ref<GmOccurrenceSummary[]>([])
const activeStatus = ref<GmOccurrenceStatus | ''>('')
const showCreate = ref(false)
const createError = ref('')
const createForm = reactive({ type: '', description: '', targetType: '', targetId: '' })

const load = async () => {
  try {
    const result = await gmApi.listOccurrences({ status: activeStatus.value || undefined, pageSize: 50 })
    occurrences.value = result.data
  } catch {
    occurrences.value = []
  }
}

watch(activeStatus, load)
onMounted(load)

const submitCreate = async () => {
  createError.value = ''
  if (!createForm.type.trim() || !createForm.description.trim()) {
    createError.value = 'Informe tipo e descrição.'
    return
  }
  try {
    await gmApi.createOccurrence({
      type: createForm.type.trim(),
      description: createForm.description.trim(),
      targetType: createForm.targetType.trim() || undefined,
      targetId: createForm.targetId.trim() || undefined
    })
    createForm.type = ''
    createForm.description = ''
    createForm.targetType = ''
    createForm.targetId = ''
    showCreate.value = false
    await load()
  } catch {
    createError.value = 'Não foi possível registrar a ocorrência.'
  }
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
</script>

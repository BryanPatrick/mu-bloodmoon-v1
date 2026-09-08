<template>
  <ManagementShell>
    <section class="grid gap-5">
      <header class="border-b border-white/10 pb-5">
        <p class="bm-kicker">Beta · area administrativa · Super ADM</p>
        <h1 class="mt-2 font-display text-3xl font-black uppercase">Recompensas de Beta</h1>
        <p class="mt-2 max-w-3xl text-sm font-semibold text-white/60">
          Dois passos deliberadamente separados: 1) registrar um FATO DE ELEGIBILIDADE justificado (nunca inferido por data ou fase de conta);
          2) gerar, em lote e com previa obrigatoria, as recompensas reais (<code>BetaRewardEntitlement</code>) a partir dos fatos registrados.
          Nada aqui e criado automaticamente por <code>accountPhase=OPEN_BETA</code> sozinho.
        </p>
      </header>

      <div class="grid gap-4 lg:grid-cols-2">
        <form class="bm-panel grid gap-3 rounded-md p-4" @submit.prevent="recordParticipation">
          <h2 class="font-display text-lg font-black uppercase">1. Registrar elegibilidade</h2>
          <label class="grid gap-1 text-sm"><span class="font-bold text-white/70">Ciclo de Beta</span><input v-model="recordForm.betaCycleId" class="bm-admin-field" placeholder="open-beta-2026-09" required></label>
          <label class="grid gap-1 text-sm"><span class="font-bold text-white/70">E-mail da conta elegivel</span><input v-model="recordForm.email" class="bm-admin-field" placeholder="jogador@exemplo.com" required type="email"></label>
          <label class="grid gap-1 text-sm"><span class="font-bold text-white/70">accountId (opcional, referencia)</span><input v-model="recordForm.accountId" class="bm-admin-field"></label>
          <label class="grid gap-1 text-sm"><span class="font-bold text-white/70">Origem</span>
            <select v-model="recordForm.sourceType" class="bm-admin-field" required>
              <option value="" disabled>Selecione</option>
              <option v-for="s in sourceTypes" :key="s" :value="s">{{ sourceLabels[s] }}</option>
            </select>
          </label>
          <label class="grid gap-1 text-sm"><span class="font-bold text-white/70">sourceId (opcional -- ex: id de um BugReport)</span><input v-model="recordForm.sourceId" class="bm-admin-field"></label>
          <label class="grid gap-1 text-sm"><span class="font-bold text-white/70">Justificativa (obrigatoria, auditavel)</span><textarea v-model="recordForm.justification" class="bm-admin-field min-h-20" minlength="10" required/></label>
          <div class="flex justify-end"><button class="bm-admin-primary" type="submit">Registrar fato de elegibilidade</button></div>
          <p v-if="recordFeedback" class="text-xs font-bold" :class="recordFeedbackOk ? 'text-emerald-300' : 'text-ember'">{{ recordFeedback }}</p>
        </form>

        <div class="bm-panel grid gap-3 rounded-md p-4">
          <h2 class="font-display text-lg font-black uppercase">2. Gerar recompensas (lote selecionado)</h2>
          <p class="text-xs text-white/50">Selecione registros com status RECORDED na lista abaixo, defina o tipo/quantidade de recompensa e sempre rode a previa antes de confirmar.</p>
          <div class="grid gap-2 sm:grid-cols-2">
            <label class="grid gap-1 text-sm"><span class="font-bold text-white/70">Tipo de recompensa</span><input v-model="genForm.rewardType" class="bm-admin-field" placeholder="BUG_HUNTER_MEDIUM"></label>
            <label class="grid gap-1 text-sm"><span class="font-bold text-white/70">Quantidade</span><input v-model.number="genForm.rewardAmount" class="bm-admin-field" min="1" type="number"></label>
          </div>
          <p class="text-xs text-white/50">{{ selectedIds.length }} registro(s) selecionado(s).</p>
          <div class="flex flex-wrap gap-2">
            <button class="bm-admin-chip" type="button" @click="preview">Previa (dry-run)</button>
            <button class="bm-admin-primary" type="button" @click="commit">Confirmar geracao</button>
          </div>
          <div v-if="previewResult" class="grid gap-1 rounded-md bg-white/[0.04] p-3 text-xs">
            <p>Total: {{ previewResult.total }} · Seria criado: <strong class="text-emerald-300">{{ previewResult.wouldCreate }}</strong> · Ja convertido: {{ previewResult.alreadyConverted }} · Ignorado: {{ previewResult.skipped }}</p>
          </div>
          <div v-if="commitResult" class="grid gap-1 rounded-md bg-emerald-500/10 p-3 text-xs">
            <p>Criado agora: <strong>{{ commitResult.created }}</strong> · Ja convertido antes: {{ commitResult.alreadyConverted }} · Ignorado: {{ commitResult.skipped }}</p>
          </div>
        </div>
      </div>

      <div class="grid gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="font-display text-lg font-black uppercase">Registros de participacao</h2>
          <select v-model="listFilters.status" class="bm-admin-field w-auto" @change="loadRecords"><option value="">Todos os status</option><option value="RECORDED">RECORDED</option><option value="REJECTED">REJECTED</option><option value="CONVERTED">CONVERTED</option></select>
          <input v-model="listFilters.betaCycleId" class="bm-admin-field w-auto" placeholder="Filtrar por ciclo" @change="loadRecords">
        </div>
        <table class="w-full text-left text-xs">
          <thead class="text-white/45"><tr><th class="p-2"></th><th class="p-2">Origem</th><th class="p-2">Justificativa</th><th class="p-2">Status</th><th class="p-2">Registrado por</th><th class="p-2">Data</th><th class="p-2"></th></tr></thead>
          <tbody>
            <tr v-for="r in records" :key="r.id" class="border-t border-white/10">
              <td class="p-2"><input v-if="r.status === 'RECORDED'" v-model="selectedIds" :value="r.id" type="checkbox"></td>
              <td class="p-2">{{ sourceLabels[r.sourceType] || r.sourceType }}</td>
              <td class="max-w-xs truncate p-2" :title="r.justification">{{ r.justification }}</td>
              <td class="p-2"><span class="bm-admin-chip">{{ r.status }}</span></td>
              <td class="p-2">{{ r.recordedBy?.username }}</td>
              <td class="p-2">{{ new Date(r.recordedAt).toLocaleDateString('pt-BR') }}</td>
              <td class="p-2"><button v-if="r.status === 'RECORDED'" class="bm-admin-chip" type="button" @click="reject(r.id)">Rejeitar</button></td>
            </tr>
          </tbody>
        </table>
        <p v-if="!records.length" class="text-sm text-white/50">Nenhum registro encontrado.</p>
      </div>
    </section>
  </ManagementShell>
</template>
<script setup lang="ts">
import { participationSourceTypes, type GenerationPreview, type GenerationResult, type ParticipationRecord } from '~/composables/useBetaRewardsApi'

const api = useBetaRewardsApi()
const sourceTypes = participationSourceTypes
const sourceLabels: Record<string, string> = {
  OPEN_BETA_PARTICIPATION: 'Participacao no Open Beta', BUG_HUNTER_CONTRIBUTION: 'Contribuicao Bug Hunter',
  EVENT_PARTICIPATION: 'Participacao em evento', MANUAL_STAFF_GRANT: 'Concessao manual da equipe', IMPORTED_REVIEWED_LIST: 'Lista revisada importada'
}

const records = ref<ParticipationRecord[]>([])
const listFilters = reactive({ status: 'RECORDED', betaCycleId: '' })
const recordForm = reactive({ betaCycleId: '', email: '', accountId: '', sourceType: '', sourceId: '', justification: '' })
const recordFeedback = ref(''); const recordFeedbackOk = ref(false)
const genForm = reactive({ rewardType: '', rewardAmount: 1 })
const selectedIds = ref<string[]>([])
const previewResult = ref<GenerationPreview | null>(null)
const commitResult = ref<GenerationResult | null>(null)

const loadRecords = async () => { try { records.value = await api.listParticipation({ status: listFilters.status || undefined, betaCycleId: listFilters.betaCycleId || undefined }) } catch { records.value = [] } }

const recordParticipation = async () => {
  recordFeedback.value = ''
  try {
    await api.recordParticipation({ ...recordForm })
    Object.assign(recordForm, { betaCycleId: recordForm.betaCycleId, email: '', accountId: '', sourceType: '', sourceId: '', justification: '' })
    recordFeedback.value = 'Fato de elegibilidade registrado.'; recordFeedbackOk.value = true
    await loadRecords()
  } catch { recordFeedback.value = 'Nao foi possivel registrar. Revise os campos.'; recordFeedbackOk.value = false }
}

const reject = async (id: string) => {
  const reason = window.prompt('Motivo da rejeicao (min. 5 caracteres):')
  if (!reason) return
  try { await api.rejectParticipation(id, reason); await loadRecords() } catch { /* keep state */ }
}

const preview = async () => {
  previewResult.value = null; commitResult.value = null
  try { previewResult.value = await api.previewGeneration({ participationRecordIds: selectedIds.value, rewardType: genForm.rewardType, rewardAmount: genForm.rewardAmount }) } catch { /* validation shown implicitly by empty result */ }
}

const commit = async () => {
  const reason = window.prompt('Justificativa desta geracao (min. 10 caracteres):')
  if (!reason) return
  try {
    commitResult.value = await api.commitGeneration({ participationRecordIds: selectedIds.value, rewardType: genForm.rewardType, rewardAmount: genForm.rewardAmount, reason })
    selectedIds.value = []; previewResult.value = null
    await loadRecords()
  } catch { /* keep state */ }
}

onMounted(loadRecords)
useSeoMeta({ title: 'Recompensas de Beta' })
</script>

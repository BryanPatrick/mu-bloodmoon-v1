<template>
  <ManagementShell>
    <section class="grid gap-5">
      <header class="border-b border-white/10 pb-5">
        <p class="bm-kicker">Servidor · área administrativa</p>
        <h1 class="mt-2 font-display text-4xl font-black uppercase">Progressão (XP / Drop / Reset / Master Reset)</h1>
        <p class="mt-2 max-w-3xl text-sm font-semibold text-white/60">
          Camada de "estado desejado" do Portal para a configuração real de progressão do GameServer (Fase U).
          <strong class="text-amber-300">PORTAL ONLY — NÃO SINCRONIZADO.</strong>
          NÃO altera a configuração real de XP/Drop/Reset no GameServer — nenhuma sincronização automática existe ainda.
          Unidades não confirmadas nunca são exibidas como "x" ou "%" — ver
          <NuxtLink to="/painel/admin/progressao" class="underline">investigação de stacking de XP</NuxtLink> na documentação técnica.
        </p>
      </header>

      <p v-if="notice" class="border px-4 py-3 text-sm font-bold" :class="noticeError ? 'border-red-400/30 bg-red-500/10 text-red-100' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'">{{ notice }}</p>

      <section class="border border-amber-400/25 bg-amber-500/5 rounded-md p-4">
        <p class="text-[10px] font-black uppercase tracking-[0.14em] text-amber-300">Evidência de drift em produção (OR-023) — apenas leitura</p>
        <p class="mt-2 text-xs font-semibold text-white/70">
          Drift real, pré-existente, encontrado em produção (não causado por este Portal): o
          <strong>ItemDropRate</strong> de mapa foi zerado em <strong>67 de 67 mapas</strong>, e 10
          monstros-chefe nomeados (Hydra, Kundun, Erohim, Medusa e outros) tiveram seu
          <strong>ItemRate</strong> revertido de um valor sentinela (999999999) para 100 — enquanto
          <strong>214 outros monstros permanecem no valor sentinela hoje</strong>. Estes valores de
          drop (mapa/monstro) ainda não são modelados como linhas individuais nesta tela — são
          camadas separadas do <code>ItemDropRate_AL0-3</code> por tier já mostrado abaixo, e seu
          status de política é <strong>efetivo, mas não aprovado</strong>, igual a qualquer outro
          valor "Efetivo, não aprovado" nesta página.
        </p>
        <p class="mt-2 text-[10px] font-bold text-white/45">
          Nenhuma ação de restauração automática existe ou é sugerida aqui — esta seção é somente
          informativa. Investigação completa (linha do tempo, atribuição, classificação de impacto):
          <NuxtLink to="/painel/admin/progressao" class="underline">docs/drop/or-023-forensics.md</NuxtLink>
          (documentação técnica, fora do Portal).
        </p>
      </section>

      <section class="bm-panel grid gap-3 rounded-md p-4 sm:grid-cols-2 lg:grid-cols-4">
        <article v-for="card in summaryCards" :key="card.domain" class="rounded-md bg-black/25 p-3">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{{ card.label }}</p>
          <p class="mt-1 font-display text-xl font-black text-white">{{ card.total }}</p>
          <p class="mt-1 text-[10px] font-bold text-blood-300">{{ card.drift }} divergente(s)</p>
        </article>
        <div class="flex flex-col gap-2 self-end">
          <button class="bm-admin-action" type="button" :disabled="seeding" @click="runSeed">{{ seeding ? 'Semeando...' : 'Semear/atualizar catálogo' }}</button>
          <button class="bm-admin-action" type="button" :disabled="refreshing" @click="runRefreshEffectiveState">{{ refreshing ? 'Lendo snapshot...' : 'Atualizar estado efetivo (snapshot local)' }}</button>
        </div>
      </section>

      <nav class="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        <button class="rounded-md px-4 py-2 text-xs font-black uppercase tracking-[0.1em]" :class="!filters.domain ? 'bg-blood-700 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'" type="button" @click="setDomain('')">Todos</button>
        <button v-for="d in domains" :key="d" class="rounded-md px-4 py-2 text-xs font-black uppercase tracking-[0.1em]" :class="filters.domain === d ? 'bg-blood-700 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'" type="button" @click="setDomain(d)">{{ domainLabel(d) }}</button>
      </nav>

      <section class="bm-panel grid gap-3 rounded-md p-4 lg:grid-cols-4">
        <input v-model="filters.search" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white outline-none focus:border-blood-400" placeholder="Buscar por nome ou chave (ex: reset.cap)" @input="debouncedLoad">
        <select v-model="filters.driftStatus" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white outline-none focus:border-blood-400" @change="loadItems">
          <option value="">Todo estado de sincronização</option>
          <option value="NOT_CHECKED">Nunca verificado</option>
          <option value="IN_SYNC">Em sincronia</option>
          <option value="DRIFT_DETECTED">Divergente (drift)</option>
        </select>
        <select v-model="filters.riskLevel" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white outline-none focus:border-blood-400" @change="loadItems">
          <option value="">Todo nível de risco</option>
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
        <select v-model="filters.policyStatus" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white outline-none focus:border-blood-400" @change="loadItems">
          <option value="">Toda política de negócio</option>
          <option value="NOT_EVALUATED">Não avaliado</option>
          <option value="APPROVED">Aprovado</option>
          <option value="EFFECTIVE_BUT_UNAPPROVED">Efetivo mas não aprovado</option>
          <option value="POLICY_DRIFT">Divergente da política</option>
          <option value="DISABLED">Desativado</option>
        </select>
        <p class="self-center text-xs font-bold text-white/45 lg:col-span-4">{{ total }} configurações encontradas</p>
      </section>

      <section class="bm-panel overflow-hidden rounded-md">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[1200px] text-left text-xs">
            <thead>
              <tr class="border-b border-white/10 text-[10px] font-black uppercase tracking-[0.12em] text-white/45">
                <th class="p-3">Configuração</th>
                <th>Domínio</th>
                <th>Risco</th>
                <th>Efetivo (atual)</th>
                <th>Desejado (política)</th>
                <th>Sincronização</th>
                <th>Política de negócio</th>
                <th class="pr-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.id" class="border-t border-white/10">
                <td class="p-3"><strong>{{ item.friendlyLabel }}</strong><p class="text-[10px] text-white/35">{{ item.key }}</p></td>
                <td>{{ domainLabel(item.domain) }}</td>
                <td><span class="rounded-sm px-2 py-1 text-[10px] font-black uppercase" :class="riskTone(item.riskLevel)">{{ item.riskLevel }}</span></td>
                <td>{{ formatValue(item.effectiveValue, item.unit) }}</td>
                <td>{{ item.desiredValue === null ? '— (sem opinião)' : formatValue(item.desiredValue, item.unit) }}</td>
                <td><span class="rounded-sm px-2 py-1 text-[10px] font-black uppercase" :class="driftTone(item.driftStatus)">{{ driftLabel(item.driftStatus) }}</span></td>
                <td><span class="rounded-sm px-2 py-1 text-[10px] font-black uppercase" :class="policyTone(item.policyStatus)">{{ policyLabel(item.policyStatus) }}</span></td>
                <td class="pr-3 text-right"><button class="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold hover:bg-white/10" type="button" @click="openDetail(item)">Detalhes</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <AdminEmptyState v-if="!loading && !items.length" title="Nenhuma configuração encontrada" description="Semeie o catálogo ou ajuste os filtros." />
      </section>

      <div v-if="detail" class="fixed inset-0 z-40 flex items-center justify-end bg-black/70 p-4" @click.self="detail = null">
        <div class="bm-panel h-full w-full max-w-xl overflow-y-auto rounded-md p-6">
          <p class="bm-kicker">{{ domainLabel(detail.domain) }} · {{ detail.key }} · risco {{ detail.riskLevel }}</p>
          <h2 class="mt-1 font-display text-xl font-black">{{ detail.friendlyLabel }}</h2>
          <p class="mt-2 text-xs font-semibold text-white/60">{{ detail.description }}</p>
          <p v-if="detail.unit" class="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-300">Unidade: {{ detail.unit }}</p>

          <div class="mt-4 grid gap-4">
            <section>
              <p class="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Estado efetivo (último snapshot) vs desejado (Portal)</p>
              <table class="mt-2 w-full text-xs">
                <tbody>
                  <tr class="border-t border-white/10"><td class="py-1 text-white/50">Efetivo</td><td class="py-1"><strong>{{ formatValue(detail.effectiveValue, detail.unit) }}</strong></td></tr>
                  <tr class="border-t border-white/10"><td class="py-1 text-white/50">Desejado</td><td class="py-1"><strong>{{ detail.desiredValue === null ? '— (sem opinião)' : formatValue(detail.desiredValue, detail.unit) }}</strong></td></tr>
                  <tr class="border-t border-white/10"><td class="py-1 text-white/50">Última leitura da fonte</td><td class="py-1">{{ detail.sourceLastReadAt ? formatDate(detail.sourceLastReadAt) : 'nunca' }}</td></tr>
                  <tr class="border-t border-white/10"><td class="py-1 text-white/50">Sincronização</td><td class="py-1"><span class="rounded-sm px-2 py-1 text-[10px] font-black uppercase" :class="driftTone(detail.driftStatus)">{{ driftLabel(detail.driftStatus) }}</span></td></tr>
                  <tr class="border-t border-white/10"><td class="py-1 text-white/50">Política de negócio</td><td class="py-1"><span class="rounded-sm px-2 py-1 text-[10px] font-black uppercase" :class="policyTone(detail.policyStatus)">{{ policyLabel(detail.policyStatus) }}</span></td></tr>
                </tbody>
              </table>
              <p class="mt-2 text-[10px] font-semibold text-white/40">"Efetivo" e "desejado" são uma pergunta técnica (o Portal e o GameServer concordam?). "Política de negócio" é uma pergunta diferente: este valor específico já recebeu aprovação real de produto como benefício VIP intencional? Configuração ativa não implica aprovação.</p>
            </section>

            <section>
              <p class="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Fonte técnica (GameServer)</p>
              <pre class="mt-2 max-h-32 overflow-auto rounded-md bg-black/30 p-2 text-[10px] text-white/60">{{ JSON.stringify(detail.technicalSource, null, 2) }}</pre>
            </section>

            <label class="grid gap-1 text-xs font-black uppercase tracking-[0.1em] text-white/50">Valor desejado (número, ou vazio para "sem opinião")
              <input v-model="editForm.desiredValueText" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white" type="text" placeholder="ex: 20">
            </label>
            <p v-if="editForm.desiredValueComplex" class="-mt-2 text-[10px] font-bold text-amber-300">
              O valor desejado real tem números diferentes por tier (ver "Estado efetivo... vs desejado" acima) — não representável neste campo simples. Deixar em branco e salvar NÃO apaga esse valor; digitar um número aqui substitui todos os tiers pelo mesmo valor.
            </p>
            <label class="grid gap-1 text-xs font-black uppercase tracking-[0.1em] text-white/50">Justificativa {{ isHighRisk(detail) ? '(obrigatória para risco HIGH/CRITICAL)' : '(opcional)' }}
              <input v-model="editForm.desiredReason" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white" type="text">
            </label>
            <label class="grid gap-1 text-xs font-black uppercase tracking-[0.1em] text-white/50">Notas internas
              <textarea v-model="editForm.internalNotes" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white" rows="2" />
            </label>
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <button class="bm-admin-action" type="button" @click="detail = null">Fechar</button>
            <button class="bm-admin-primary" type="button" :disabled="saving || (isHighRisk(detail) && !editForm.desiredReason.trim())" @click="saveEdit">{{ saving ? 'Salvando...' : 'Salvar' }}</button>
          </div>

          <section class="mt-6 border-t border-white/10 pt-4">
            <p class="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Histórico</p>
            <div v-if="!history.length" class="mt-2 text-xs font-bold text-white/40">Sem alterações registradas ainda.</div>
            <div v-for="entry in history" :key="entry.id" class="mt-2 border-t border-white/10 pt-2 text-xs">
              <p class="font-bold text-white/70">{{ entry.action }} <span class="text-white/40">— {{ formatDate(entry.createdAt) }}</span></p>
              <p class="text-white/50">{{ entry.actorUsername }}<span v-if="entry.reason"> · {{ entry.reason }}</span></p>
            </div>
          </section>
        </div>
      </div>
    </section>
  </ManagementShell>
</template>

<script setup lang="ts">
import type { ProgressionConfigItem, ProgressionDomain, ProgressionHistoryEntry, ProgressionSummaryRow, ProgressionUpdatePayload } from '~/composables/useProgressionApi'

useSeoMeta({ title: 'Progressão | Blood Moon' })

const api = useProgressionApi()

const domains: ProgressionDomain[] = ['EXPERIENCE', 'DROP', 'RESET', 'MASTER_RESET']
const domainLabels: Record<ProgressionDomain, string> = { EXPERIENCE: 'Experiência', DROP: 'Drop', RESET: 'Reset', MASTER_RESET: 'Master Reset' }
const domainLabel = (d: ProgressionDomain) => domainLabels[d] || d

const items = ref<ProgressionConfigItem[]>([])
const total = ref(0)
const summary = ref<ProgressionSummaryRow[]>([])
const loading = ref(false)
const seeding = ref(false)
const refreshing = ref(false)
const saving = ref(false)
const notice = ref('')
const noticeError = ref(false)
const filters = reactive({ domain: '' as '' | ProgressionDomain, driftStatus: '', riskLevel: '', policyStatus: '', search: '' })

const detail = ref<ProgressionConfigItem | null>(null)
const editForm = reactive({ desiredValueText: '', desiredValueComplex: false, desiredReason: '', internalNotes: '' })
const history = ref<ProgressionHistoryEntry[]>([])

let debounceTimer: ReturnType<typeof setTimeout> | undefined
const debouncedLoad = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(loadItems, 300)
}

onMounted(async () => {
  await Promise.all([loadItems(), loadSummary()])
})

const setDomain = (domain: '' | ProgressionDomain) => {
  filters.domain = domain
  loadItems()
}

const loadItems = async () => {
  loading.value = true
  try {
    const query: Record<string, string> = {}
    if (filters.domain) query.domain = filters.domain
    if (filters.driftStatus) query.driftStatus = filters.driftStatus
    if (filters.riskLevel) query.riskLevel = filters.riskLevel
    if (filters.policyStatus) query.policyStatus = filters.policyStatus
    if (filters.search.trim()) query.search = filters.search.trim()
    const result = await api.list(query)
    items.value = result.items
    total.value = result.total
  } catch {
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const loadSummary = async () => {
  try {
    summary.value = await api.summary()
  } catch {
    summary.value = []
  }
}

const summaryCards = computed(() =>
  domains.map((d) => {
    const rows = summary.value.filter((s) => s.domain === d)
    const total = rows.reduce((sum, r) => sum + r.count, 0)
    const drift = rows.filter((r) => r.driftStatus === 'DRIFT_DETECTED').reduce((sum, r) => sum + r.count, 0)
    return { domain: d, label: domainLabel(d), total, drift }
  })
)

const riskTone = (risk: string) =>
  risk === 'CRITICAL' ? 'border border-blood-400/30 bg-blood-700/15 text-blood-100'
    : risk === 'HIGH' ? 'border border-amber-400/25 bg-amber-500/10 text-amber-100'
      : risk === 'MEDIUM' ? 'border border-white/15 bg-white/5 text-white/60'
        : 'border border-emerald-400/25 bg-emerald-500/10 text-emerald-100'

const driftTone = (status: string) =>
  status === 'DRIFT_DETECTED' ? 'border border-blood-400/30 bg-blood-700/15 text-blood-100'
    : status === 'IN_SYNC' ? 'border border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
      : 'border border-white/15 bg-white/5 text-white/50'

const driftLabel = (status: string) =>
  status === 'NOT_CHECKED' ? 'Nunca verificado' : status === 'IN_SYNC' ? 'Em sincronia' : status === 'DRIFT_DETECTED' ? 'Divergente' : status === 'NOT_MANAGED' ? 'Não gerenciado' : 'Falha na verificação'

const policyTone = (status: string) =>
  status === 'POLICY_DRIFT' ? 'border border-blood-400/30 bg-blood-700/15 text-blood-100'
    : status === 'APPROVED' ? 'border border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
      : status === 'EFFECTIVE_BUT_UNAPPROVED' ? 'border border-amber-400/25 bg-amber-500/10 text-amber-100'
        : status === 'DISABLED' ? 'border border-white/15 bg-white/5 text-white/40'
          : 'border border-white/15 bg-white/5 text-white/50'

const policyLabel = (status: string) =>
  status === 'NOT_EVALUATED' ? 'Não avaliado' : status === 'APPROVED' ? 'Aprovado' : status === 'EFFECTIVE_BUT_UNAPPROVED' ? 'Efetivo, não aprovado' : status === 'POLICY_DRIFT' ? 'Divergente da política' : status === 'DISABLED' ? 'Desativado' : 'Desconhecido'

const isHighRisk = (item: ProgressionConfigItem | null) => item?.riskLevel === 'HIGH' || item?.riskLevel === 'CRITICAL'

// null = no opinion; a plain number = a uniform value (including a
// per-tier object where all four tiers already agree); undefined = a
// real per-tier object with genuinely different values, which this
// flat-number field cannot represent.
const flatIfUniform = (value: ProgressionConfigItem['desiredValue']): number | null | undefined => {
  if (value === null) return null
  if (typeof value === 'number') return value
  const vals = Object.values(value)
  return vals.every((v) => v === vals[0]) ? vals[0] : undefined
}

const formatValue = (value: ProgressionConfigItem['effectiveValue'], unit: string | null) => {
  if (value === null) return '—'
  const suffix = unit ? ` (${unit})` : ''
  if (typeof value === 'number') return `${value}${suffix}`
  return `Free ${value.AL0} / Bronze ${value.AL1} / Silver ${value.AL2} / Gold ${value.AL3}${suffix}`
}

const runSeed = async () => {
  seeding.value = true
  try {
    const result = await api.seed()
    notice.value = `Semeado: ${result.created} novos/${result.updated} atualizados.`
    noticeError.value = false
    await Promise.all([loadItems(), loadSummary()])
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Falha ao semear a progressao.'
    noticeError.value = true
  } finally {
    seeding.value = false
  }
}

const runRefreshEffectiveState = async () => {
  refreshing.value = true
  try {
    const result = await api.refreshEffectiveState()
    notice.value = `Estado efetivo atualizado a partir do snapshot local (${result.snapshotGeneratedAt}): ${result.updated} linhas, ${result.driftCount} com divergencia.`
    noticeError.value = false
    await Promise.all([loadItems(), loadSummary()])
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Falha ao atualizar o estado efetivo.'
    noticeError.value = true
  } finally {
    refreshing.value = false
  }
}

const openDetail = async (item: ProgressionConfigItem) => {
  detail.value = item
  const flatDesired = flatIfUniform(item.desiredValue)
  editForm.desiredValueText = flatDesired === null ? '' : String(flatDesired)
  // A per-tier desiredValue with genuinely different values per tier can't
  // be represented in this single flat field -- never silently null it out
  // just because the field renders empty (real bug found and fixed during
  // Phase V live QA: saving an untouched, blank-looking field used to wipe
  // a real, already-formalized per-tier policy decision).
  editForm.desiredValueComplex = item.desiredValue !== null && flatDesired === undefined
  editForm.desiredReason = ''
  editForm.internalNotes = item.internalNotes || ''
  history.value = []
  try {
    history.value = await api.history(item.id)
  } catch {
    history.value = []
  }
}

const saveEdit = async () => {
  if (!detail.value) return
  saving.value = true
  try {
    const payload: ProgressionUpdatePayload = { internalNotes: editForm.internalNotes }
    if (editForm.desiredReason.trim()) payload.desiredReason = editForm.desiredReason.trim()
    const trimmed = editForm.desiredValueText.trim()
    if (trimmed === '') {
      // A non-uniform per-tier value can't be shown in this field -- leave
      // it untouched rather than silently wiping it (see openDetail()).
      if (!editForm.desiredValueComplex) payload.desiredValue = null
    } else {
      const parsed = Number(trimmed)
      if (!Number.isFinite(parsed)) throw new Error('Valor desejado precisa ser um numero.')
      payload.desiredValue = parsed
    }
    await api.update(detail.value.id, payload)
    notice.value = `"${detail.value.friendlyLabel}" atualizado.`
    noticeError.value = false
    const updatedId = detail.value.id
    detail.value = null
    await Promise.all([loadItems(), loadSummary()])
    const refreshed = items.value.find((i) => i.id === updatedId)
    if (refreshed) await openDetail(refreshed)
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Falha ao salvar.'
    noticeError.value = true
  } finally {
    saving.value = false
  }
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
</script>

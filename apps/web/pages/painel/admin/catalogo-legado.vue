<template>
  <ManagementShell>
    <section class="grid gap-5">
      <header class="border-b border-white/10 pb-5">
        <p class="bm-kicker">Comércio oficial · área administrativa</p>
        <h1 class="mt-2 font-display text-4xl font-black uppercase">Catálogo legado (X-Shop / CashShop)</h1>
        <p class="mt-2 max-w-3xl text-sm font-semibold text-white/60">
          Camada de "estado desejado" do Portal para o catálogo legado do GameServer (Fase S/T).
          <strong class="text-amber-300">PORTAL ONLY — NÃO SINCRONIZADO.</strong>
          Isto NÃO é a Loja Oficial (produtos reais do jogador ficam em
          <NuxtLink to="/painel/admin/loja" class="underline">Painel → Loja</NuxtLink>) e NÃO altera a
          configuração real do X-Shop/CashShop no GameServer — nenhuma sincronização automática existe ainda.
        </p>
      </header>

      <p v-if="notice" class="border px-4 py-3 text-sm font-bold" :class="noticeError ? 'border-red-400/30 bg-red-500/10 text-red-100' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'">{{ notice }}</p>

      <section class="bm-panel grid gap-3 rounded-md p-4 sm:grid-cols-2 lg:grid-cols-5">
        <article v-for="card in summaryCards" :key="card.label" class="rounded-md bg-black/25 p-3">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{{ card.label }}</p>
          <p class="mt-1 font-display text-xl font-black" :class="card.tone">{{ card.count }}</p>
        </article>
        <div class="flex flex-col gap-2 self-end">
          <button class="bm-admin-action" type="button" :disabled="seeding" @click="runSeed">{{ seeding ? 'Semeando...' : 'Semear/atualizar catálogo' }}</button>
          <button class="bm-admin-action" type="button" :disabled="refreshing" @click="runRefreshEffectiveState">{{ refreshing ? 'Lendo snapshot...' : 'Atualizar estado efetivo (snapshot local)' }}</button>
        </div>
      </section>

      <nav class="flex gap-2 border-b border-white/10 pb-3">
        <button class="rounded-md px-4 py-2 text-xs font-black uppercase tracking-[0.1em]" :class="filters.channel === 'XSHOP' ? 'bg-blood-700 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'" type="button" @click="setChannel('XSHOP')">X-Shop</button>
        <button class="rounded-md px-4 py-2 text-xs font-black uppercase tracking-[0.1em]" :class="filters.channel === 'CASHSHOP' ? 'bg-blood-700 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'" type="button" @click="setChannel('CASHSHOP')">CashShop</button>
        <button class="rounded-md px-4 py-2 text-xs font-black uppercase tracking-[0.1em]" :class="!filters.channel ? 'bg-blood-700 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'" type="button" @click="setChannel('')">Ambos</button>
      </nav>

      <section class="bm-panel grid gap-3 rounded-md p-4 lg:grid-cols-4">
        <input v-model="filters.search" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white outline-none focus:border-blood-400" placeholder="Buscar por nome ou ID técnico (ex: Kris, 1-9)" @input="debouncedLoad">
        <select v-model="filters.bryanDecision" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white outline-none focus:border-blood-400" @change="loadItems">
          <option value="">Todas as decisões</option>
          <option value="NOT_FOR_COMMERCIAL_SALE">Decisão 1 — NOT_FOR_COMMERCIAL_SALE</option>
          <option value="BALANCE_TEST_REQUIRED">Decisão 2 — BALANCE_TEST_REQUIRED</option>
          <option value="DEAD_UNRESOLVABLE_CATALOG_ROW">Decisão 3 — DEAD_UNRESOLVABLE_CATALOG_ROW</option>
          <option value="RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST">Decisão 4 — RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST</option>
          <option value="GREEN_CANDIDATE_NOT_APPROVED">Decisão 7 — GREEN_CANDIDATE_NOT_APPROVED</option>
        </select>
        <select v-model="filters.commercialStatus" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white outline-none focus:border-blood-400" @change="loadItems">
          <option value="">Todos os status</option>
          <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
        </select>
        <select v-model="filters.driftStatus" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white outline-none focus:border-blood-400" @change="loadItems">
          <option value="">Todo estado de sincronização</option>
          <option value="NOT_CHECKED">Nunca verificado</option>
          <option value="IN_SYNC">Em sincronia</option>
          <option value="DRIFT_DETECTED">Divergente (drift)</option>
        </select>
        <p class="self-center text-xs font-bold text-white/45 lg:col-span-4">{{ total }} itens encontrados</p>
      </section>

      <section v-if="selectedIds.length" class="bm-panel flex flex-wrap items-center gap-3 rounded-md p-3">
        <strong class="mr-auto text-xs">{{ selectedIds.length }} selecionados</strong>
        <select v-model="bulkAction" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white">
          <option value="">Escolher ação em lote</option>
          <option value="mark-blocked">Marcar como BLOCKED</option>
          <option value="mark-review-required">Marcar como REVIEW_REQUIRED</option>
          <option value="hide">Ocultar (visible=não)</option>
          <option value="set-open-beta-allowed">Permitir em Open Beta</option>
          <option value="set-open-beta-disallowed">Remover de Open Beta</option>
          <option value="set-full-release-allowed">Permitir em Full Release</option>
          <option value="set-full-release-disallowed">Remover de Full Release</option>
        </select>
        <input v-model="bulkReason" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white outline-none focus:border-blood-400" type="text" placeholder="Justificativa (obrigatoria)">
        <button class="bm-admin-primary" :disabled="!bulkAction || !bulkReason.trim()" type="button" @click="runBulkAction">Aplicar em lote</button>
      </section>

      <section class="bm-panel overflow-hidden rounded-md">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[1300px] text-left text-xs">
            <thead>
              <tr class="border-b border-white/10 text-[10px] font-black uppercase tracking-[0.12em] text-white/45">
                <th class="p-3"><input type="checkbox" :checked="allSelected" aria-label="Selecionar todos" @change="toggleAll"></th>
                <th>Item</th>
                <th>Canal</th>
                <th>Decisão de Bryan</th>
                <th>Status comercial</th>
                <th>Visível / Comprável</th>
                <th>Habilitado desejado</th>
                <th>Efetivo (último snapshot)</th>
                <th>Sincronização</th>
                <th class="pr-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in items" :key="item.id" class="border-t border-white/10">
                <td class="p-3"><input v-model="selectedIds" type="checkbox" :value="item.id" :aria-label="`Selecionar ${item.itemName}`"></td>
                <td><strong>{{ item.itemName || 'Sem nome' }}</strong><p class="text-[10px] text-white/35">{{ item.legacyKey }}</p></td>
                <td>{{ item.channel }}</td>
                <td><span class="rounded-sm px-2 py-1 text-[10px] font-black uppercase tracking-[0.06em]" :class="decisionTone(item.bryanDecision)">{{ item.bryanDecision }}</span></td>
                <td><span class="rounded-sm border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em]">{{ item.commercialStatus }}</span></td>
                <td>{{ item.visible ? 'Sim' : 'Não' }} / {{ item.purchasable ? 'Sim' : 'Não' }}</td>
                <td>{{ item.desiredEnabled ? 'Sim' : 'Não' }}</td>
                <td>{{ item.effectiveEnabled === null ? '—' : (item.effectiveEnabled ? 'Habilitado' : 'Desabilitado') }} <span v-if="item.effectivePrice !== null" class="text-white/40">({{ item.effectivePrice }})</span></td>
                <td><span class="rounded-sm px-2 py-1 text-[10px] font-black uppercase" :class="driftTone(item.driftStatus)">{{ driftLabel(item.driftStatus) }}</span></td>
                <td class="pr-3 text-right"><button class="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold hover:bg-white/10" type="button" @click="openDetail(item)">Detalhes</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <AdminEmptyState v-if="!loading && !items.length" title="Nenhum item encontrado" description="Semeie o catálogo ou ajuste os filtros." />
      </section>

      <div v-if="detail" class="fixed inset-0 z-40 flex items-center justify-end bg-black/70 p-4" @click.self="detail = null">
        <div class="bm-panel h-full w-full max-w-xl overflow-y-auto rounded-md p-6">
          <p class="bm-kicker">{{ detail.channel }} · {{ detail.legacyKey }} · LEGACY {{ detail.channel }} (não é a Loja Oficial)</p>
          <h2 class="mt-1 font-display text-xl font-black">{{ detail.itemName || 'Sem nome' }}</h2>
          <p class="mt-2 rounded-md border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-100">{{ detail.blockReason }}</p>

          <div class="mt-4 grid gap-4">
            <section>
              <p class="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Estado desejado (Portal) vs efetivo (último snapshot local)</p>
              <table class="mt-2 w-full text-xs">
                <tbody>
                  <tr class="border-t border-white/10"><td class="py-1 text-white/50">Habilitado</td><td class="py-1">desejado: <strong>{{ detail.desiredEnabled ? 'sim' : 'não' }}</strong> / efetivo: <strong>{{ detail.effectiveEnabled === null ? 'desconhecido' : (detail.effectiveEnabled ? 'sim' : 'não') }}</strong></td></tr>
                  <tr class="border-t border-white/10"><td class="py-1 text-white/50">Preço</td><td class="py-1">desejado: <strong>{{ detail.priceDesired ?? '—' }}</strong> / efetivo: <strong>{{ detail.effectivePrice ?? '—' }}</strong></td></tr>
                  <tr class="border-t border-white/10"><td class="py-1 text-white/50">Moeda efetiva</td><td class="py-1">{{ detail.effectiveCurrency || '—' }}</td></tr>
                  <tr class="border-t border-white/10"><td class="py-1 text-white/50">Última leitura da fonte</td><td class="py-1">{{ detail.sourceLastReadAt ? formatDate(detail.sourceLastReadAt) : 'nunca' }}</td></tr>
                  <tr class="border-t border-white/10"><td class="py-1 text-white/50">Sincronização</td><td class="py-1"><span class="rounded-sm px-2 py-1 text-[10px] font-black uppercase" :class="driftTone(detail.driftStatus)">{{ driftLabel(detail.driftStatus) }}</span></td></tr>
                </tbody>
              </table>
            </section>

            <section>
              <p class="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Atributos técnicos completos (fonte legada)</p>
              <pre class="mt-2 max-h-32 overflow-auto rounded-md bg-black/30 p-2 text-[10px] text-white/60">{{ JSON.stringify(detail.technicalIdentifiers, null, 2) }}</pre>
            </section>

            <label class="grid gap-1 text-xs font-black uppercase tracking-[0.1em] text-white/50">Status comercial
              <select v-model="editForm.commercialStatus" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white"><option v-for="status in statuses" :key="status" :value="status">{{ status }}</option></select>
            </label>
            <div class="grid grid-cols-3 gap-3">
              <label class="flex items-center gap-2 text-xs font-bold"><input v-model="editForm.visible" type="checkbox"> Visível</label>
              <label class="flex items-center gap-2 text-xs font-bold"><input v-model="editForm.purchasable" type="checkbox"> Comprável</label>
              <label class="flex items-center gap-2 text-xs font-bold"><input v-model="editForm.desiredEnabled" type="checkbox"> Habilitado desejado</label>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <label class="flex items-center gap-2 text-xs font-bold"><input v-model="editForm.openBetaAllowed" type="checkbox"> Elegível Open Beta</label>
              <label class="flex items-center gap-2 text-xs font-bold"><input v-model="editForm.fullReleaseAllowed" type="checkbox"> Elegível Full Release</label>
            </div>
            <label class="grid gap-1 text-xs font-black uppercase tracking-[0.1em] text-white/50">Notas internas
              <textarea v-model="editForm.internalNotes" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white" rows="2" />
            </label>
            <label class="grid gap-1 text-xs font-black uppercase tracking-[0.1em] text-white/50">Motivo desta alteração
              <input v-model="editForm.reason" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white" type="text">
            </label>
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <button class="bm-admin-action" type="button" @click="detail = null">Fechar</button>
            <button class="bm-admin-primary" type="button" :disabled="saving" @click="saveEdit">{{ saving ? 'Salvando...' : 'Salvar' }}</button>
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
import type { LegacyCatalogBulkAction, LegacyCatalogHistoryEntry, LegacyCatalogItem, LegacyCatalogSummaryRow, LegacyCatalogUpdatePayload } from '~/composables/useLegacyCatalogApi'

useSeoMeta({ title: 'Catálogo Legado | Blood Moon' })

const api = useLegacyCatalogApi()

const statuses = ['REVIEW_REQUIRED', 'BLOCKED', 'APPROVED', 'PUBLISHED', 'DISABLED', 'RETIRED']

const items = ref<LegacyCatalogItem[]>([])
const total = ref(0)
const summary = ref<LegacyCatalogSummaryRow[]>([])
const loading = ref(false)
const seeding = ref(false)
const refreshing = ref(false)
const saving = ref(false)
const notice = ref('')
const noticeError = ref(false)
const filters = reactive({ channel: '' as '' | 'XSHOP' | 'CASHSHOP', bryanDecision: '', commercialStatus: '', driftStatus: '', search: '' })
const selectedIds = ref<string[]>([])
const bulkAction = ref<LegacyCatalogBulkAction | ''>('')
const bulkReason = ref('')

const detail = ref<LegacyCatalogItem | null>(null)
const editForm = reactive<LegacyCatalogUpdatePayload>({})
const history = ref<LegacyCatalogHistoryEntry[]>([])

let debounceTimer: ReturnType<typeof setTimeout> | undefined
const debouncedLoad = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(loadItems, 300)
}

onMounted(async () => {
  await Promise.all([loadItems(), loadSummary()])
})

const setChannel = (channel: '' | 'XSHOP' | 'CASHSHOP') => {
  filters.channel = channel
  loadItems()
}

const loadItems = async () => {
  loading.value = true
  try {
    const query: Record<string, string> = {}
    if (filters.channel) query.channel = filters.channel
    if (filters.bryanDecision) query.bryanDecision = filters.bryanDecision
    if (filters.commercialStatus) query.commercialStatus = filters.commercialStatus
    if (filters.driftStatus) query.driftStatus = filters.driftStatus
    if (filters.search.trim()) query.search = filters.search.trim()
    const result = await api.list({ ...query, pageSize: 200 })
    items.value = result.items
    total.value = result.total
    selectedIds.value = []
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

const summaryCards = computed(() => {
  const countFor = (decision: string) => summary.value.filter((s) => s.bryanDecision === decision).reduce((sum, s) => sum + s.count, 0)
  return [
    { label: 'X-Shop: NOT_FOR_SALE', count: countFor('NOT_FOR_COMMERCIAL_SALE'), tone: 'text-blood-300' },
    { label: 'X-Shop: BALANCE_TEST', count: countFor('BALANCE_TEST_REQUIRED'), tone: 'text-amber-300' },
    { label: 'X-Shop: DEAD_ROW', count: countFor('DEAD_UNRESOLVABLE_CATALOG_ROW'), tone: 'text-white/50' },
    { label: 'CashShop: RENTAL_PENDING', count: countFor('RENTAL_CANDIDATE_PENDING_EMPIRICAL_TEST'), tone: 'text-amber-300' },
    { label: 'CashShop: GREEN_CANDIDATE', count: countFor('GREEN_CANDIDATE_NOT_APPROVED'), tone: 'text-emerald-300' }
  ]
})

const decisionTone = (decision: string) =>
  decision === 'NOT_FOR_COMMERCIAL_SALE' ? 'border border-blood-400/30 bg-blood-700/15 text-blood-100'
    : decision === 'GREEN_CANDIDATE_NOT_APPROVED' ? 'border border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
      : decision === 'DEAD_UNRESOLVABLE_CATALOG_ROW' ? 'border border-white/15 bg-white/5 text-white/60'
        : 'border border-amber-400/25 bg-amber-500/10 text-amber-100'

const driftTone = (status: string) =>
  status === 'DRIFT_DETECTED' ? 'border border-blood-400/30 bg-blood-700/15 text-blood-100'
    : status === 'IN_SYNC' ? 'border border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
      : 'border border-white/15 bg-white/5 text-white/50'

const driftLabel = (status: string) =>
  status === 'NOT_CHECKED' ? 'Nunca verificado' : status === 'IN_SYNC' ? 'Em sincronia' : status === 'DRIFT_DETECTED' ? 'Divergente' : status === 'NOT_MANAGED' ? 'Não gerenciado' : 'Falha na verificação'

const allSelected = computed(() => items.value.length > 0 && selectedIds.value.length === items.value.length)
const toggleAll = () => {
  selectedIds.value = allSelected.value ? [] : items.value.map((i) => i.id)
}

const runSeed = async () => {
  seeding.value = true
  try {
    const result = await api.seed()
    notice.value = `Semeado: X-Shop ${result.xshop.created} novos/${result.xshop.updated} atualizados; CashShop ${result.cashshop.created} novos/${result.cashshop.updated} atualizados.`
    noticeError.value = false
    await Promise.all([loadItems(), loadSummary()])
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Falha ao semear o catalogo legado.'
    noticeError.value = true
  } finally {
    seeding.value = false
  }
}

const runRefreshEffectiveState = async () => {
  refreshing.value = true
  try {
    const result = await api.refreshEffectiveState()
    notice.value = `Estado efetivo atualizado a partir do snapshot local (${result.snapshotGeneratedAt}): ${result.updated} linhas, ${result.driftCount} com divergencia, ${result.inSyncCount} em sincronia.`
    noticeError.value = false
    await loadItems()
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Falha ao atualizar o estado efetivo.'
    noticeError.value = true
  } finally {
    refreshing.value = false
  }
}

const runBulkAction = async () => {
  const action = bulkAction.value
  const reason = bulkReason.value.trim()
  if (!action || !reason || !selectedIds.value.length) return
  try {
    const result = await api.bulkUpdate(selectedIds.value, action, reason)
    notice.value = `Acao em lote aplicada a ${result.affected} itens.`
    noticeError.value = false
    bulkAction.value = ''
    bulkReason.value = ''
    await Promise.all([loadItems(), loadSummary()])
  } catch (error) {
    notice.value = error instanceof Error ? error.message : 'Falha na acao em lote.'
    noticeError.value = true
  }
}

const openDetail = async (item: LegacyCatalogItem) => {
  detail.value = item
  Object.assign(editForm, {
    commercialStatus: item.commercialStatus,
    visible: item.visible,
    purchasable: item.purchasable,
    desiredEnabled: item.desiredEnabled,
    openBetaAllowed: item.openBetaAllowed,
    fullReleaseAllowed: item.fullReleaseAllowed,
    internalNotes: item.internalNotes,
    reason: ''
  })
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
    await api.update(detail.value.id, editForm)
    notice.value = `"${detail.value.itemName}" atualizado.`
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

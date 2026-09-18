<template>
  <ManagementShell>
    <div v-if="visibleTabs.length > 0" class="grid gap-6">
      <div class="flex flex-col gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p class="bm-kicker">Administracao</p>
          <h1 class="mt-3 font-display text-4xl font-black uppercase sm:text-5xl">Financeiro</h1>
          <p class="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/70">
            Acompanhe compras e recargas, aprove pagamentos, audite reconciliacao, risco e chargebacks.
          </p>
        </div>

        <div v-if="activeTab === 'filas'" class="bm-glass grid gap-3 rounded-md p-3 sm:grid-cols-3 xl:min-w-[680px]">
          <input
            v-model="query"
            class="h-11 min-w-0 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-blood-400/70"
            placeholder="Buscar usuario ou item"
            type="search"
          >
          <select v-model="activeStatus" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
            <option class="bg-zinc-950 text-white" value="Todos">Todos status</option>
            <option v-for="status in statuses" :key="status" class="bg-zinc-950 text-white" :value="status">{{ status }}</option>
          </select>
          <select v-model="activeType" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
            <option class="bg-zinc-950 text-white" value="Todos">Tudo</option>
            <option class="bg-zinc-950 text-white" value="Compras">Compras</option>
            <option class="bg-zinc-950 text-white" value="Recargas">Recargas</option>
          </select>
        </div>
      </div>

      <section v-if="activeTab === 'filas'" class="grid gap-3 sm:grid-cols-4">
        <article v-for="card in summaryCards" :key="card.label" class="bm-panel rounded-md p-4">
          <p class="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">{{ card.label }}</p>
          <p class="mt-3 font-display text-3xl font-black text-white">{{ card.value }}</p>
        </article>
      </section>

      <nav class="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        <button
          v-for="tab in visibleTabs"
          :key="tab.key"
          type="button"
          class="rounded-md px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition"
          :class="activeTab === tab.key ? 'bg-blood-600 text-white' : 'bg-white/5 text-white/55 hover:bg-white/10'"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </nav>

      <p v-if="message" class="rounded-md border px-4 py-3 text-sm font-bold" :class="messageClass">
        {{ message }}
      </p>

      <!-- ============ FILAS (Compras/Recargas) -- pre-existing ============ -->
      <div v-if="activeTab === 'filas'" class="grid gap-6">
      <section v-if="activeType !== 'Recargas'" class="grid gap-4">
        <div class="flex items-end justify-between gap-4 border-b border-white/10 pb-3">
          <div>
            <p class="text-[11px] font-black uppercase tracking-[0.28em] text-ember">Fila</p>
            <h2 class="mt-1 font-display text-2xl font-black uppercase text-white">Compras</h2>
          </div>
          <span class="text-xs font-black uppercase tracking-[0.2em] text-white/45">{{ filteredPurchases.length }} registros</span>
        </div>

        <article v-for="purchase in filteredPurchases" :key="purchase.id" class="bm-panel rounded-md p-5">
          <div class="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
            <div>
              <div class="flex flex-wrap gap-2">
                <span class="rounded-sm px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em]" :class="statusClass(purchase.status)">
                  {{ purchase.status }}
                </span>
                <span class="rounded-sm bg-white/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/65">
                  Compra
                </span>
              </div>
              <h3 class="mt-3 font-display text-2xl font-black">{{ purchase.productName }}</h3>
              <p class="mt-1 text-sm font-bold text-white/58">
                {{ purchase.username }} - {{ purchase.price.toLocaleString('pt-BR') }} {{ purchase.currency }} - {{ formatDate(purchase.createdAt) }}
              </p>
            </div>

            <div class="grid gap-2 sm:grid-cols-2 xl:w-72">
              <button class="bm-button-glass rounded-md px-4 py-3 text-sm font-black" type="button" @click="setPurchaseStatus(purchase.id, 'Concluida')">
                Concluir
              </button>
              <button class="rounded-md border border-blood-500/40 bg-blood-900/30 px-4 py-3 text-sm font-black text-blood-100" type="button" @click="setPurchaseStatus(purchase.id, 'Cancelada')">
                Cancelar
              </button>
            </div>
          </div>
        </article>
      </section>

      <section v-if="activeType !== 'Compras'" class="grid gap-4">
        <div class="flex items-end justify-between gap-4 border-b border-white/10 pb-3">
          <div>
            <p class="text-[11px] font-black uppercase tracking-[0.28em] text-ember">Fila</p>
            <h2 class="mt-1 font-display text-2xl font-black uppercase text-white">Recargas</h2>
          </div>
          <span class="text-xs font-black uppercase tracking-[0.2em] text-white/45">{{ filteredRecharges.length }} registros</span>
        </div>

        <article v-for="recharge in filteredRecharges" :key="recharge.id" class="bm-panel rounded-md p-5">
          <div class="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
            <div>
              <div class="flex flex-wrap gap-2">
                <span class="rounded-sm px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em]" :class="statusClass(recharge.status)">
                  {{ recharge.status }}
                </span>
                <span class="rounded-sm bg-white/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/65">
                  Recarga
                </span>
              </div>
              <h3 class="mt-3 font-display text-2xl font-black">{{ recharge.amount.toLocaleString('pt-BR') }} {{ recharge.currency }}</h3>
              <p class="mt-1 text-sm font-bold text-white/58">
                {{ recharge.username }} - Bonus {{ recharge.bonus.toLocaleString('pt-BR') }} - R$ {{ recharge.price }} - {{ formatDate(recharge.createdAt) }}
              </p>
            </div>

            <div class="grid gap-2 sm:grid-cols-2 xl:w-72">
              <button class="bm-button-glass rounded-md px-4 py-3 text-sm font-black" type="button" @click="setRechargeStatus(recharge.id, 'Paga')">
                Aprovar
              </button>
              <button class="rounded-md border border-blood-500/40 bg-blood-900/30 px-4 py-3 text-sm font-black text-blood-100" type="button" @click="cancelRecharge(recharge.id)">
                Cancelar
              </button>
              <button class="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/75 sm:col-span-2" type="button" @click="toggleRechargeDetail(recharge.id)">
                {{ expandedRechargeId === recharge.id ? 'Ocultar detalhes' : 'Detalhes do provedor' }}
              </button>
            </div>
          </div>

          <div v-if="expandedRechargeId === recharge.id" class="mt-4 border-t border-white/10 pt-4">
            <p v-if="rechargeDetailLoading" class="text-sm font-bold text-white/55">Carregando detalhes...</p>
            <div v-else-if="rechargeDetail" class="grid gap-3">
              <div class="grid gap-2 text-xs font-bold text-white/70 sm:grid-cols-2">
                <span>Provider: <strong class="text-white">{{ rechargeDetail.provider }}</strong></span>
                <span>ID no provedor: <strong class="text-white">{{ rechargeDetail.externalOrderId || '-' }}</strong></span>
                <span>Correlation ID: <strong class="text-white">{{ rechargeDetail.correlationId || '-' }}</strong></span>
                <span>Metodo: <strong class="text-white">{{ rechargeDetail.paymentMethod || '-' }}</strong></span>
                <span>Status provider: <strong class="text-white">{{ rechargeDetail.externalStatus || '-' }} / {{ rechargeDetail.externalStatusDetail || '-' }}</strong></span>
                <span>Ultimo webhook: <strong class="text-white">{{ rechargeDetail.lastWebhookAt ? formatDate(rechargeDetail.lastWebhookAt) : '-' }}</strong></span>
                <span v-if="rechargeDetail.failureReason">Motivo da falha: <strong class="text-white">{{ rechargeDetail.failureReason }}</strong></span>
                <span v-if="rechargeDetail.manualReviewReason">Motivo (analise): <strong class="text-white">{{ rechargeDetail.manualReviewReason }}</strong></span>
                <span v-if="rechargeDetail.refundReason">Motivo (estorno): <strong class="text-white">{{ rechargeDetail.refundReason }}</strong></span>
              </div>

              <div class="flex flex-wrap gap-2">
                <button class="w-fit rounded-md border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-white/75" type="button" :disabled="resyncing" @click="resyncRecharge(recharge.id)">
                  {{ resyncing ? 'Ressincronizando...' : 'Ressincronizar com provedor' }}
                </button>
                <button
                  v-if="hasPermission(permissions.adminChargebackView)"
                  class="w-fit rounded-md border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-white/75"
                  type="button"
                  @click="viewChargebackTrace(recharge.id)"
                >
                  Rastrear dispersao (chargeback)
                </button>
              </div>

              <div v-if="chargebackTraceFor === recharge.id" class="rounded-md bg-black/25 p-3">
                <p v-if="!chargebackTrace" class="text-xs font-bold text-white/45">Nenhuma dispersao rastreavel (sem credito de recarga encontrado).</p>
                <div v-else class="grid gap-2 text-xs font-bold text-white/65">
                  <span>Contas envolvidas: <strong class="text-white">{{ chargebackTrace.involvedAccountIds.length }}</strong></span>
                  <span v-if="chargebackTrace.truncated" class="text-amber-200">Rastreamento truncado no limite de saltos configurado.</span>
                  <div v-for="hop in chargebackTrace.dispersalChain" :key="hop.ledgerEntryId" class="rounded-sm bg-white/5 px-2 py-1">
                    Salto {{ hop.hop }}: {{ hop.fromAccountId.slice(0, 8) }}... → {{ hop.toAccountId.slice(0, 8) }}... ({{ hop.amount }} {{ recharge.currency }}, {{ hop.type }})
                  </div>
                </div>
              </div>

              <div v-if="rechargeDetail.timeline.length" class="grid gap-2">
                <p class="text-[11px] font-black uppercase tracking-[0.2em] text-white/45">Timeline de webhooks</p>
                <div v-for="event in rechargeDetail.timeline" :key="event.id" class="flex flex-wrap items-center gap-2 rounded-md bg-black/25 px-3 py-2 text-xs font-bold text-white/65">
                  <span class="text-white">{{ event.topic }}</span>
                  <span>{{ event.status }}</span>
                  <span>{{ event.signatureValid ? 'assinatura valida' : 'assinatura invalida' }}</span>
                  <span>{{ formatDate(event.receivedAt) }}</span>
                  <span v-if="event.processingError" class="text-blood-100">{{ event.processingError }}</span>
                </div>
              </div>
              <p v-else class="text-xs font-bold text-white/45">Nenhum webhook recebido ainda.</p>
            </div>
          </div>
        </article>
      </section>
      </div>

      <!-- ============ RECONCILIACAO ============ -->
      <div v-else-if="activeTab === 'reconciliacao'" class="grid gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <h2 class="font-display text-2xl font-black uppercase text-white">Reconciliacao</h2>
          <div class="flex flex-wrap gap-2">
            <button class="bm-button-glass rounded-md px-4 py-2 text-xs font-black" type="button" :disabled="reconciliationLoading" @click="loadReconciliation">
              {{ reconciliationLoading ? 'Verificando...' : 'Verificar agora' }}
            </button>
            <button
              v-if="hasPermission(permissions.adminOrdersOperate)"
              class="rounded-md border border-sky-500/40 bg-sky-900/20 px-4 py-2 text-xs font-black text-sky-100"
              type="button"
              :disabled="providerPollLoading"
              @click="triggerProviderPoll"
            >
              {{ providerPollLoading ? 'Consultando...' : 'Consultar provedor agora' }}
            </button>
          </div>
        </div>

        <p v-if="providerPollResult && !providerPollResult.enabled" class="rounded-md border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-100">
          Reconciliacao com o provedor nao esta habilitada nesta implantacao (SANDBOX_VALIDATION_REQUIRED) -- verificacao externa pendente.
        </p>
        <p v-else-if="providerPollResult" class="rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/70">
          Ultima consulta: {{ providerPollResult.candidates }} candidatas, {{ providerPollResult.polled }} consultadas, {{ providerPollResult.failed }} falharam.
        </p>

        <p v-if="!reconciliationLoading && reconciliationRows.length === 0" class="text-sm font-bold text-white/45">Nenhuma anomalia encontrada.</p>
        <article v-for="row in reconciliationRows" :key="row.rechargeIntentId + row.issue" class="bm-panel rounded-md p-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-sm bg-blood-700/25 px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-blood-100">{{ row.issue }}</span>
            <span class="text-xs font-bold text-white/45">{{ formatDate(row.createdAt) }}</span>
          </div>
          <p class="mt-2 text-sm font-bold text-white/70">{{ row.detail }}</p>
        </article>
      </div>

      <!-- ============ RISCO ============ -->
      <div v-else-if="activeTab === 'risco'" class="grid gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <h2 class="font-display text-2xl font-black uppercase text-white">Casos de risco</h2>
          <select v-model="riskStatusFilter" class="h-10 rounded-md border border-white/10 bg-white/10 px-3 text-xs font-bold text-white outline-none" @change="loadRiskCases">
            <option class="bg-zinc-950" value="">Todos status</option>
            <option v-for="s in ['OPEN', 'UNDER_REVIEW', 'CLEARED', 'CONFIRMED_FRAUD', 'CLOSED']" :key="s" class="bg-zinc-950" :value="s">{{ s }}</option>
          </select>
        </div>

        <p v-if="!riskLoading && riskCases.length === 0" class="text-sm font-bold text-white/45">Nenhum caso de risco encontrado.</p>
        <article v-for="riskCase in riskCases" :key="riskCase.id" class="bm-panel rounded-md p-5">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-sm px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em]" :class="severityClass(riskCase.highestSeverity)">{{ riskCase.highestSeverity }}</span>
            <span class="rounded-sm bg-white/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/65">{{ riskCase.status }}</span>
            <span class="text-xs font-bold text-white/45">{{ riskCase.username || 'conta removida' }} - aberto {{ formatDate(riskCase.openedAt) }}</span>
          </div>
          <p class="mt-2 text-sm font-bold text-white/75">{{ riskCase.summary }}</p>

          <div class="mt-3 grid gap-2">
            <p class="text-[11px] font-black uppercase tracking-[0.2em] text-white/45">Sinais ({{ riskCase.signals.length }})</p>
            <div v-for="signal in riskCase.signals" :key="signal.id" class="rounded-md bg-black/25 px-3 py-2 text-xs font-bold text-white/65">
              <span class="text-white">{{ signal.signalType }}</span> ({{ signal.severity }}) — {{ signal.reason }}
            </div>
          </div>

          <div v-if="riskCase.actions.length" class="mt-3 grid gap-2">
            <p class="text-[11px] font-black uppercase tracking-[0.2em] text-white/45">Acoes aplicadas</p>
            <div v-for="action in riskCase.actions" :key="action.id" class="flex flex-wrap items-center gap-2 rounded-md bg-black/25 px-3 py-2 text-xs font-bold text-white/65">
              <span class="text-white">{{ action.action }}</span>
              <span>{{ action.reason }}</span>
              <span>{{ action.performedByUsername }}</span>
              <span v-if="action.liftedAt" class="text-emerald-200">levantada em {{ formatDate(action.liftedAt) }}</span>
              <button
                v-else-if="hasPermission(permissions.adminRiskManage)"
                class="rounded-sm border border-white/10 px-2 py-1 text-[11px] font-black text-white/75"
                type="button"
                @click="liftRiskAction(riskCase, action.id)"
              >
                Levantar
              </button>
            </div>
          </div>

          <div v-if="hasPermission(permissions.adminRiskManage) && riskCase.status !== 'CLOSED'" class="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
            <select :ref="(el) => setRiskActionSelect(riskCase.id, el)" class="h-9 rounded-md border border-white/10 bg-white/10 px-2 text-xs font-bold text-white">
              <option class="bg-zinc-950" value="MANUAL_REVIEW">Revisao manual</option>
              <option class="bg-zinc-950" value="PAYMENT_RESTRICTION">Restringir pagamento</option>
              <option class="bg-zinc-950" value="TRANSFER_RESTRICTION">Restringir transferencia</option>
              <option class="bg-zinc-950" value="ACCOUNT_RESTRICTION">Restringir conta</option>
            </select>
            <button class="rounded-md border border-amber-500/40 bg-amber-900/20 px-3 py-2 text-xs font-black text-amber-100" type="button" @click="applyRiskAction(riskCase)">
              Aplicar acao
            </button>
            <button class="rounded-md border border-emerald-500/40 bg-emerald-900/20 px-3 py-2 text-xs font-black text-emerald-100" type="button" @click="resolveRiskCase(riskCase, 'CLEARED')">
              Marcar como falso positivo
            </button>
            <button class="rounded-md border border-blood-500/40 bg-blood-900/30 px-3 py-2 text-xs font-black text-blood-100" type="button" @click="resolveRiskCase(riskCase, 'CONFIRMED_FRAUD')">
              Confirmar fraude
            </button>
            <button class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/75" type="button" @click="resolveRiskCase(riskCase, 'CLOSED')">
              Encerrar
            </button>
          </div>
        </article>
      </div>

      <!-- ============ CHARGEBACKS ============ -->
      <div v-else-if="activeTab === 'chargebacks'" class="grid gap-4">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <h2 class="font-display text-2xl font-black uppercase text-white">Casos de chargeback</h2>
          <select v-model="chargebackStatusFilter" class="h-10 rounded-md border border-white/10 bg-white/10 px-3 text-xs font-bold text-white outline-none" @change="loadChargebackCases">
            <option class="bg-zinc-950" value="">Todos status</option>
            <option v-for="s in ['OPEN', 'UNDER_REVIEW', 'CLEARED', 'CONFIRMED_FRAUD', 'CLOSED']" :key="s" class="bg-zinc-950" :value="s">{{ s }}</option>
          </select>
        </div>

        <p v-if="!chargebackCasesLoading && chargebackCases.length === 0" class="text-sm font-bold text-white/45">Nenhum caso de chargeback encontrado.</p>
        <article v-for="cbCase in chargebackCases" :key="cbCase.id" class="bm-panel rounded-md p-5">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-sm bg-blood-700/25 px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-blood-100">{{ cbCase.status }}</span>
            <span class="text-xs font-bold text-white/45">{{ cbCase.username || 'conta removida' }} - {{ formatDate(cbCase.createdAt) }}</span>
          </div>
          <p class="mt-2 text-sm font-bold text-white/75">
            {{ cbCase.originalAmountCredited }} {{ cbCase.currency }} creditados originalmente - saldo da conta na abertura do caso: {{ cbCase.accountBalanceAtCaseOpen ?? '-' }}
          </p>
          <p v-if="cbCase.providerChargebackReason" class="mt-1 text-xs font-bold text-white/55">Motivo do provedor: {{ cbCase.providerChargebackReason }}</p>
          <p class="mt-1 text-xs font-bold text-white/45">
            Rastreamento de dispersao: {{ cbCase.dispersalTraceSnapshot?.involvedAccountIds.length || 0 }} contas envolvidas
            <span v-if="cbCase.dispersalTraceSnapshot?.truncated" class="text-amber-200">(truncado)</span>.
            Responsabilidade primaria permanece com a conta originadora -- contas receptoras nunca sao restringidas automaticamente.
          </p>
          <p v-if="cbCase.reviewNotes" class="mt-2 text-xs font-bold text-white/60">Notas: {{ cbCase.reviewNotes }}</p>
          <p v-if="cbCase.resolution" class="mt-1 text-xs font-bold text-emerald-200">Resolucao: {{ cbCase.resolution }}</p>

          <div v-if="hasPermission(permissions.adminChargebackManage) && cbCase.status !== 'CLOSED'" class="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
            <button class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/75" type="button" @click="addChargebackNote(cbCase)">
              Anotar
            </button>
            <button class="rounded-md border border-emerald-500/40 bg-emerald-900/20 px-3 py-2 text-xs font-black text-emerald-100" type="button" @click="resolveChargeback(cbCase, 'CLEARED')">
              Encerrar sem fraude
            </button>
            <button class="rounded-md border border-blood-500/40 bg-blood-900/30 px-3 py-2 text-xs font-black text-blood-100" type="button" @click="resolveChargeback(cbCase, 'CONFIRMED_FRAUD')">
              Confirmar fraude
            </button>
            <button class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/75" type="button" @click="resolveChargeback(cbCase, 'CLOSED')">
              Encerrar
            </button>
          </div>
        </article>
      </div>
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import { permissions } from '~/data/security'
import type {
  ChargebackCase,
  ChargebackDispersalTrace,
  CommercePurchase,
  CommerceRecharge,
  PaymentRiskAction,
  PaymentRiskCase,
  ReconciliationRow,
  RechargeDetail
} from '~/composables/useCommerceApi'

type FinancialStatus = CommercePurchase['status'] | CommerceRecharge['status']

const expandedRechargeId = ref('')
const rechargeDetail = ref<RechargeDetail | null>(null)
const rechargeDetailLoading = ref(false)
const resyncing = ref(false)
const chargebackTraceFor = ref('')
const chargebackTrace = ref<ChargebackDispersalTrace | null>(null)

const { hasPermission, loadSession, recordAudit } = useAuth()
const commerceApi = useCommerceApi()

useSeoMeta({ title: 'Financeiro' })

const query = ref('')
const activeStatus = ref('Todos')
const activeType = ref('Todos')
const message = ref('')
const isSuccess = ref(true)
const purchases = ref<CommercePurchase[]>([])
const recharges = ref<CommerceRecharge[]>([])

// Tab keys deliberately limited to filas/reconciliacao/risco/chargebacks
// for this release -- an unrelated "Pacotes" (RechargePackage admin) tab
// exists in the broader uncommitted work this was isolated from and is
// out of scope for Payment Risk / Chargeback.
const tabs = [
  { key: 'filas' as const, label: 'Filas', permission: permissions.adminFinancialReportsView },
  { key: 'reconciliacao' as const, label: 'Reconciliacao', permission: permissions.adminFinancialReportsView },
  { key: 'risco' as const, label: 'Risco', permission: permissions.adminRiskView },
  { key: 'chargebacks' as const, label: 'Chargebacks', permission: permissions.adminChargebackView }
]
const visibleTabs = computed(() => tabs.filter((tab) => hasPermission(tab.permission)))
const activeTab = ref<'filas' | 'reconciliacao' | 'risco' | 'chargebacks'>('filas')

onMounted(async () => {
  loadSession()
  if (visibleTabs.value.length && !visibleTabs.value.some((tab) => tab.key === activeTab.value)) {
    activeTab.value = visibleTabs.value[0]!.key
  }
  if (hasPermission(permissions.adminFinancialReportsView)) {
    await loadFinancialQueues()
  }
})

const statuses = [
  'Preparada',
  'Concluida',
  'Cancelada',
  'Paga',
  'Aguardando pagamento',
  'Processando',
  'Falhou',
  'Em analise',
  'Estorno em andamento',
  'Estornada'
]

const loadFinancialQueues = async () => {
  try {
    const [purchaseRows, rechargeRows] = await Promise.all([
      commerceApi.listPurchases(),
      commerceApi.listRecharges()
    ])
    purchases.value = purchaseRows
    recharges.value = rechargeRows
  } catch {
    purchases.value = []
    recharges.value = []
    isSuccess.value = false
    message.value = 'API indisponivel. Fila financeira local nao sera usada como fallback.'
  }
}

const filteredPurchases = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase()

  return purchases.value.filter((purchase) => {
    const matchesStatus = activeStatus.value === 'Todos' || purchase.status === activeStatus.value
    const matchesQuery = !normalizedQuery || [purchase.username, purchase.productName, purchase.currency, purchase.status]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)

    return matchesStatus && matchesQuery
  })
})

const filteredRecharges = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase()

  return recharges.value.filter((recharge) => {
    const matchesStatus = activeStatus.value === 'Todos' || recharge.status === activeStatus.value
    const matchesQuery = !normalizedQuery || [recharge.username, recharge.currency, recharge.status]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)

    return matchesStatus && matchesQuery
  })
})

const summaryCards = computed(() => [
  { label: 'Compras', value: purchases.value.length.toString() },
  { label: 'Recargas', value: recharges.value.length.toString() },
  { label: 'Pendentes', value: (purchases.value.filter((item) => item.status === 'Preparada').length + recharges.value.filter((item) => item.status === 'Preparada').length).toString() },
  { label: 'Filtrados', value: (filteredPurchases.value.length + filteredRecharges.value.length).toString() }
])

const setPurchaseStatus = async (purchaseId: string, status: CommercePurchase['status']) => {
  try {
    await commerceApi.updatePurchaseStatus(purchaseId, status)
    await loadFinancialQueues()
    isSuccess.value = true
    message.value = `Compra marcada como ${status}.`

    const purchase = purchases.value.find((item) => item.id === purchaseId)
    recordAudit({
      type: 'admin.finance.purchase',
      message: `Compra ${purchase?.productName || purchaseId} marcada como ${status}.`,
      meta: { username: purchase?.username || 'desconhecido', status }
    })
  } catch (error) {
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Nao foi possivel atualizar a compra.'
  }
}

const setRechargeStatus = async (rechargeId: string, status: CommerceRecharge['status'], reason?: string) => {
  try {
    await commerceApi.updateRechargeStatus(rechargeId, status, reason)
    await loadFinancialQueues()
    isSuccess.value = true
    message.value = `Recarga marcada como ${status}.`

    const recharge = recharges.value.find((item) => item.id === rechargeId)
    recordAudit({
      type: 'admin.finance.recharge',
      message: `Recarga de ${recharge?.amount || 0} ${recharge?.currency || ''} marcada como ${status}.`,
      meta: { username: recharge?.username || 'desconhecido', status }
    })
  } catch (error) {
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Nao foi possivel atualizar a recarga.'
  }
}

const cancelRecharge = (rechargeId: string) => {
  const reason = window.prompt('Motivo do cancelamento:')
  if (!reason?.trim()) return
  return setRechargeStatus(rechargeId, 'Cancelada', reason.trim())
}

const toggleRechargeDetail = async (rechargeId: string) => {
  if (expandedRechargeId.value === rechargeId) {
    expandedRechargeId.value = ''
    rechargeDetail.value = null
    chargebackTraceFor.value = ''
    return
  }
  expandedRechargeId.value = rechargeId
  rechargeDetail.value = null
  rechargeDetailLoading.value = true
  try {
    rechargeDetail.value = await commerceApi.getRechargeDetail(rechargeId)
  } catch (error) {
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Nao foi possivel carregar os detalhes da recarga.'
  } finally {
    rechargeDetailLoading.value = false
  }
}

const resyncRecharge = async (rechargeId: string) => {
  resyncing.value = true
  try {
    await commerceApi.resyncRecharge(rechargeId)
    await loadFinancialQueues()
    rechargeDetail.value = await commerceApi.getRechargeDetail(rechargeId)
    isSuccess.value = true
    message.value = 'Recarga ressincronizada com o provedor.'
  } catch (error) {
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Nao foi possivel ressincronizar com o provedor.'
  } finally {
    resyncing.value = false
  }
}

const viewChargebackTrace = async (rechargeId: string) => {
  if (chargebackTraceFor.value === rechargeId) {
    chargebackTraceFor.value = ''
    chargebackTrace.value = null
    return
  }
  chargebackTraceFor.value = rechargeId
  try {
    const trace = await commerceApi.getChargebackTrace(rechargeId)
    chargebackTrace.value = trace.originAccountId ? trace : null
  } catch (error) {
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Nao foi possivel carregar o rastreamento de dispersao.'
  }
}

// ============ Reconciliacao ============
const reconciliationRows = ref<ReconciliationRow[]>([])
const reconciliationLoading = ref(false)
const providerPollLoading = ref(false)
const providerPollResult = ref<{ enabled: boolean, candidates: number, polled: number, failed: number } | null>(null)

const loadReconciliation = async () => {
  reconciliationLoading.value = true
  try {
    reconciliationRows.value = await commerceApi.getReconciliationReport()
  } catch (error) {
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Nao foi possivel carregar a reconciliacao.'
  } finally {
    reconciliationLoading.value = false
  }
}

const triggerProviderPoll = async () => {
  providerPollLoading.value = true
  try {
    providerPollResult.value = await commerceApi.triggerProviderPoll()
    await loadReconciliation()
  } catch (error) {
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Nao foi possivel consultar o provedor.'
  } finally {
    providerPollLoading.value = false
  }
}

// ============ Risco ============
const riskCases = ref<PaymentRiskCase[]>([])
const riskLoading = ref(false)
const riskStatusFilter = ref('')
const riskActionSelects = new Map<string, HTMLSelectElement>()
const setRiskActionSelect = (caseId: string, el: unknown) => {
  if (el) riskActionSelects.set(caseId, el as HTMLSelectElement)
}

const loadRiskCases = async () => {
  riskLoading.value = true
  try {
    const result = await commerceApi.listRiskCases({ status: riskStatusFilter.value || undefined })
    riskCases.value = result.data
  } catch (error) {
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Nao foi possivel carregar os casos de risco.'
  } finally {
    riskLoading.value = false
  }
}

const applyRiskAction = async (riskCase: PaymentRiskCase) => {
  const select = riskActionSelects.get(riskCase.id)
  const action = (select?.value || 'MANUAL_REVIEW') as PaymentRiskAction
  const reason = window.prompt(`Motivo para aplicar ${action}:`)
  if (!reason?.trim()) return
  try {
    await commerceApi.applyRiskAction(riskCase.id, action, reason.trim())
    await loadRiskCases()
    isSuccess.value = true
    message.value = `Acao ${action} aplicada ao caso.`
  } catch (error) {
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Nao foi possivel aplicar a acao.'
  }
}

const liftRiskAction = async (riskCase: PaymentRiskCase, actionId: string) => {
  try {
    await commerceApi.liftRiskAction(actionId)
    await loadRiskCases()
    isSuccess.value = true
    message.value = 'Acao de risco levantada.'
  } catch (error) {
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Nao foi possivel levantar a acao.'
  }
}

const resolveRiskCase = async (riskCase: PaymentRiskCase, status: 'CLEARED' | 'CONFIRMED_FRAUD' | 'CLOSED') => {
  const resolution = window.prompt(`Resolucao (${status}):`)
  if (!resolution?.trim()) return
  try {
    await commerceApi.resolveRiskCase(riskCase.id, status, resolution.trim())
    await loadRiskCases()
    isSuccess.value = true
    message.value = 'Caso de risco resolvido.'
  } catch (error) {
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Nao foi possivel resolver o caso.'
  }
}

// ============ Chargebacks ============
const chargebackCases = ref<ChargebackCase[]>([])
const chargebackCasesLoading = ref(false)
const chargebackStatusFilter = ref('')

const loadChargebackCases = async () => {
  chargebackCasesLoading.value = true
  try {
    const result = await commerceApi.listChargebackCases({ status: chargebackStatusFilter.value || undefined })
    chargebackCases.value = result.data
  } catch (error) {
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Nao foi possivel carregar os casos de chargeback.'
  } finally {
    chargebackCasesLoading.value = false
  }
}

const addChargebackNote = async (cbCase: ChargebackCase) => {
  const note = window.prompt('Nota de revisao:')
  if (!note?.trim()) return
  try {
    await commerceApi.updateChargebackCaseNotes(cbCase.id, note.trim())
    await loadChargebackCases()
    isSuccess.value = true
    message.value = 'Nota adicionada ao caso de chargeback.'
  } catch (error) {
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Nao foi possivel adicionar a nota.'
  }
}

const resolveChargeback = async (cbCase: ChargebackCase, status: 'CLEARED' | 'CONFIRMED_FRAUD' | 'CLOSED') => {
  const resolution = window.prompt(`Resolucao (${status}):`)
  if (!resolution?.trim()) return
  try {
    await commerceApi.resolveChargebackCase(cbCase.id, status, resolution.trim())
    await loadChargebackCases()
    isSuccess.value = true
    message.value = 'Caso de chargeback resolvido.'
  } catch (error) {
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Nao foi possivel resolver o caso.'
  }
}

watch(activeTab, (tab) => {
  if (tab === 'reconciliacao' && reconciliationRows.value.length === 0) void loadReconciliation()
  if (tab === 'risco' && riskCases.value.length === 0) void loadRiskCases()
  if (tab === 'chargebacks' && chargebackCases.value.length === 0) void loadChargebackCases()
})

const statusClass = (status: FinancialStatus) => ({
  'bg-ember/15 text-ember': status === 'Preparada' || status === 'Aguardando pagamento' || status === 'Processando',
  'bg-emerald-500/15 text-emerald-100': status === 'Concluida' || status === 'Paga',
  'bg-blood-700/25 text-blood-100': status === 'Cancelada' || status === 'Falhou',
  'bg-amber-500/15 text-amber-100': status === 'Em analise' || status === 'Estorno em andamento',
  'bg-white/10 text-white/70': status === 'Estornada'
})

const severityClass = (severity: string) => ({
  'bg-white/10 text-white/60': severity === 'INFO',
  'bg-sky-500/15 text-sky-100': severity === 'LOW',
  'bg-amber-500/15 text-amber-100': severity === 'MEDIUM',
  'bg-blood-700/25 text-blood-100': severity === 'HIGH' || severity === 'CRITICAL'
})

const messageClass = computed(() =>
  isSuccess.value
    ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
    : 'border-blood-400/25 bg-blood-700/10 text-blood-100'
)

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
</script>

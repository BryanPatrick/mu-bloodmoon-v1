<template>
  <ManagementShell>
    <section class="grid gap-6">
      <header>
        <p class="bm-kicker">Minha conta</p>
        <h1 class="mt-2 font-display text-3xl font-black uppercase">Transferir WC</h1>
        <p class="mt-2 max-w-2xl text-sm font-semibold text-white/60">
          Envie WCoin diretamente para outro jogador. Uma taxa economica e aplicada em toda transferencia direta
          (a mesma taxa que sustenta o Marketplace) e o valor minimo por transferencia e de {{ minimumAmount }} WC.
        </p>
      </header>

      <section v-if="balances.length" class="grid gap-3 sm:grid-cols-3">
        <article v-for="balance in balances" :key="balance.label" class="bm-panel rounded-md p-4">
          <p class="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">{{ balance.label }}</p>
          <p class="mt-2 font-display text-2xl font-black text-white">{{ balance.value.toLocaleString('pt-BR') }}</p>
        </article>
      </section>

      <article class="bm-panel rounded-md p-6">
        <p class="text-xs font-black uppercase tracking-[0.28em] text-ember">Nova transferencia</p>

        <p class="mt-3 rounded-md border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-white/60">
          Confira o <strong class="text-white/85">nome de usuario</strong> (login da conta) do destinatario, nao o nome do
          personagem -- contas com nomes de personagem parecidos sao uma causa comum de transferencias enviadas por engano.
          Apos confirmado, um WC transferido nao pode ser revertido pelo jogador.
        </p>

        <form class="mt-5 grid gap-4 sm:grid-cols-2" @submit.prevent="submitTransfer">
          <label class="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/50">
            Usuario do destinatario
            <input
              v-model="recipientUsername"
              class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm font-bold normal-case text-white outline-none focus:border-blood-400"
              type="text"
              placeholder="usuario_da_conta"
              autocomplete="off"
            >
          </label>
          <label class="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/50">
            Quantidade (WC)
            <input
              v-model="amountInput"
              class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm font-bold text-white outline-none focus:border-blood-400"
              type="number"
              :min="minimumAmount"
              step="1"
              placeholder="20"
            >
          </label>
        </form>

        <div v-if="amount > 0" class="mt-4 grid gap-1 rounded-md border border-white/10 bg-black/25 p-4 text-sm font-bold text-white/70">
          <p>Transferir: <span class="text-white">{{ amount.toLocaleString('pt-BR') }} WC</span></p>
          <p>Taxa economica ({{ feeInfo?.taxPercent ?? 0 }}%): <span class="text-white">{{ estimatedFee.toLocaleString('pt-BR') }} WC</span></p>
          <p>Destinatario recebe: <span class="text-emerald-300">{{ estimatedNet.toLocaleString('pt-BR') }} WC</span></p>
        </div>
        <p v-else-if="amountInput" class="mt-4 text-xs font-bold text-white/45">Informe uma quantidade valida para ver a estimativa.</p>

        <p v-if="amount > 0 && amount < minimumAmount" class="mt-3 text-xs font-bold text-amber-300">
          O minimo por transferencia direta e de {{ minimumAmount }} WC.
        </p>

        <p v-if="message" class="mt-4 rounded-md border px-4 py-3 text-sm font-bold" :class="messageClass">{{ message }}</p>

        <button
          class="bm-button-glass mt-5 w-fit rounded-md px-6 py-3 text-sm font-black disabled:opacity-40"
          type="button"
          :disabled="!canSubmit || submitting"
          @click="submitTransfer"
        >
          {{ submitting ? 'Enviando...' : 'Revisar e confirmar' }}
        </button>
      </article>

      <article class="bm-panel rounded-md p-6">
        <p class="text-xs font-black uppercase tracking-[0.28em] text-ember">Historico</p>
        <h2 class="mt-2 font-display text-2xl font-black">Minhas transferencias</h2>

        <div v-if="loadingHistory" class="mt-4 text-sm font-bold text-white/45">Carregando historico...</div>
        <p v-else-if="!history.length" class="mt-4 text-sm font-bold text-white/45">Voce ainda nao enviou nem recebeu nenhuma transferencia direta.</p>

        <div v-else class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr class="text-[11px] font-black uppercase tracking-[0.14em] text-white/45">
                <th class="pb-2">Data</th>
                <th class="pb-2">Direcao</th>
                <th class="pb-2">Contraparte</th>
                <th class="pb-2 text-right">Bruto</th>
                <th class="pb-2 text-right">Taxa</th>
                <th class="pb-2 text-right">Liquido</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in history" :key="row.id" class="border-t border-white/10">
                <td class="py-2 text-white/60">{{ formatDate(row.occurredAt) }}</td>
                <td class="py-2">
                  <span
                    class="rounded-sm px-2 py-1 text-[11px] font-black uppercase tracking-[0.1em]"
                    :class="row.direction === 'SENT' ? 'bg-blood-700/15 text-blood-100' : 'bg-emerald-500/10 text-emerald-100'"
                  >
                    {{ row.direction === 'SENT' ? 'Enviado' : 'Recebido' }}
                  </span>
                </td>
                <td class="py-2 font-bold text-white">{{ row.counterpartyUsername }}</td>
                <td class="py-2 text-right font-bold text-white/70">{{ row.grossAmount.toLocaleString('pt-BR') }}</td>
                <td class="py-2 text-right font-bold text-white/45">{{ row.feeAmount.toLocaleString('pt-BR') }}</td>
                <td class="py-2 text-right font-black" :class="row.direction === 'SENT' ? 'text-white' : 'text-emerald-300'">
                  {{ row.netAmount.toLocaleString('pt-BR') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>
  </ManagementShell>
</template>

<script setup lang="ts">
import type { WalletTransferFeeInfo, WalletTransferHistoryRow } from '~/composables/useWalletTransferApi'

useSeoMeta({ title: 'Transferir WC' })

const walletTransferApi = useWalletTransferApi()
const { user, loadSession, refreshSession } = useAuth()

const recipientUsername = ref('')
const amountInput = ref('')
const feeInfo = ref<WalletTransferFeeInfo | null>(null)
const history = ref<WalletTransferHistoryRow[]>([])
const loadingHistory = ref(true)
const submitting = ref(false)
const message = ref('')
const isSuccess = ref(true)

onMounted(async () => {
  loadSession()
  await Promise.all([loadFeeInfo(), loadHistory()])
})

const loadFeeInfo = async () => {
  try {
    feeInfo.value = await walletTransferApi.getFeeInfo()
  } catch {
    feeInfo.value = null
  }
}

const loadHistory = async () => {
  loadingHistory.value = true
  try {
    history.value = await walletTransferApi.listMyHistory()
  } catch {
    history.value = []
  } finally {
    loadingHistory.value = false
  }
}

const balances = computed(() => user.value?.currencies || [])
const minimumAmount = computed(() => feeInfo.value?.minimumAmount ?? 20)
const amount = computed(() => Math.trunc(Number(amountInput.value)) || 0)

// PHASE Q DECISION CLOSURE (2026-08-31), Decision 2 -- display-only
// estimate mirroring settleTaxedCredit()'s own whole-unit floor exactly
// (Math.floor(amount * taxPercent / 100)) so what the player sees before
// confirming matches what the server will actually charge for a SINGLE
// transaction. The accumulator's sub-unit carry-over (for amounts whose
// exact obligation isn't a whole number) is not reproduced here -- it
// only ever nudges the real fee up by at most 1 WC on any single
// transfer, and the confirmed result screen always shows the real,
// authoritative number.
const estimatedFee = computed(() => Math.floor((amount.value * (feeInfo.value?.taxPercent ?? 0)) / 100))
const estimatedNet = computed(() => Math.max(0, amount.value - estimatedFee.value))

const canSubmit = computed(() => recipientUsername.value.trim().length > 0 && amount.value >= minimumAmount.value)

const submitTransfer = async () => {
  if (!canSubmit.value) return
  const confirmed = window.confirm(
    `Confirmar envio de ${amount.value.toLocaleString('pt-BR')} WC para "${recipientUsername.value.trim()}"? ` +
    `O destinatario recebera aproximadamente ${estimatedNet.value.toLocaleString('pt-BR')} WC apos a taxa economica. Esta acao nao pode ser desfeita.`
  )
  if (!confirmed) return

  submitting.value = true
  try {
    const result = await walletTransferApi.transfer(recipientUsername.value.trim(), amount.value)
    isSuccess.value = true
    message.value = `Transferencia enviada: ${result.transferred.toLocaleString('pt-BR')} WC para ${result.recipientUsername} (${result.netAmount.toLocaleString('pt-BR')} WC liquido recebido).`
    recipientUsername.value = ''
    amountInput.value = ''
    await Promise.all([refreshSession(), loadHistory()])
  } catch (error) {
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Nao foi possivel concluir a transferencia.'
  } finally {
    submitting.value = false
  }
}

const messageClass = computed(() =>
  isSuccess.value ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100' : 'border-blood-400/25 bg-blood-700/10 text-blood-100'
)

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
</script>

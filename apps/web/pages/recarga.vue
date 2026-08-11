<template>
  <main class="min-h-screen bg-void text-white">
    <section class="bm-container pt-28">
      <div class="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div class="bm-panel rounded-md p-6">
          <p class="bm-kicker">Moedas</p>
          <h1 class="mt-2 font-display text-4xl font-black uppercase">Recarga de moedas</h1>
          <p class="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/68">
            Escolha uma moeda e um pacote. O pagamento e feito via Pix (Mercado Pago, ambiente de teste).
          </p>

          <div class="mt-8 grid gap-4 sm:grid-cols-3">
            <button
              v-for="currency in currencies"
              :key="currency"
              class="bm-button-glass rounded-md px-4 py-4 text-left transition hover:scale-[1.02]"
              :class="{ 'bm-nav-link-active': selectedCurrency === currency }"
              type="button"
              @click="selectedCurrency = currency"
            >
              <span class="text-xs font-black uppercase tracking-[0.22em] text-white/45">Moeda</span>
              <strong class="mt-2 block font-display text-xl">{{ currency }}</strong>
            </button>
          </div>

          <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <button
              v-for="pack in visiblePacks"
              :key="pack.id"
              class="rounded-md border border-white/10 bg-black/25 p-4 text-left transition hover:border-blood-400/50 hover:bg-white/10"
              :class="{ 'border-ember/60 bg-ember/10': selectedPack.id === pack.id }"
              type="button"
              @click="selectedPack = pack"
            >
              <span v-if="pack.highlight" class="mb-3 inline-flex rounded-sm bg-ember/15 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-ember">Popular</span>
              <span class="block font-display text-3xl font-black">{{ pack.amount.toLocaleString('pt-BR') }}</span>
              <span class="mt-2 block text-sm font-bold text-white/62">{{ pack.currency }}</span>
              <span v-if="pack.bonus" class="mt-2 block text-xs font-black text-emerald-100">+ {{ pack.bonus.toLocaleString('pt-BR') }} bonus</span>
              <span class="mt-4 block text-sm font-black text-ember">R$ {{ pack.price }}</span>
            </button>
          </div>
        </div>

        <aside class="bm-glass h-fit rounded-md p-5">
          <template v-if="!checkout">
            <p class="text-xs font-black uppercase tracking-[0.28em] text-ember">Resumo</p>
            <div class="mt-5 grid gap-3 text-sm font-bold">
              <div class="flex justify-between rounded-md bg-black/25 p-3">
                <span class="text-white/55">Moeda</span>
                <span>{{ selectedPack.currency }}</span>
              </div>
              <div class="flex justify-between rounded-md bg-black/25 p-3">
                <span class="text-white/55">Quantidade</span>
                <span>{{ selectedPack.amount.toLocaleString('pt-BR') }}</span>
              </div>
              <div class="flex justify-between rounded-md bg-black/25 p-3">
                <span class="text-white/55">Bonus</span>
                <span>{{ selectedPack.bonus.toLocaleString('pt-BR') }}</span>
              </div>
              <div class="flex justify-between rounded-md bg-black/25 p-3">
                <span class="text-white/55">Valor</span>
                <span>R$ {{ selectedPack.price }}</span>
              </div>
            </div>
            <button class="mt-5 w-full rounded-md bg-blood-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blood-500 disabled:cursor-not-allowed disabled:opacity-50" type="button" :disabled="!selectedPack || creatingCheckout" @click="continuePayment">
              {{ creatingCheckout ? 'Gerando pagamento...' : 'Pagar com Pix' }}
            </button>
          </template>

          <template v-else>
            <p class="text-xs font-black uppercase tracking-[0.28em] text-ember">Pagamento Pix</p>

            <template v-if="isPending">
              <img v-if="checkout.qrCodeBase64" :src="`data:image/png;base64,${checkout.qrCodeBase64}`" alt="QR Code Pix" class="mx-auto mt-4 w-full max-w-[220px] rounded-md bg-white p-2">
              <div v-if="checkout.qrCode" class="mt-4">
                <p class="text-[11px] font-black uppercase tracking-[0.2em] text-white/45">Pix copia e cola</p>
                <div class="mt-2 flex items-center gap-2 rounded-md bg-black/25 p-3">
                  <code class="min-w-0 flex-1 truncate text-xs text-white/70">{{ checkout.qrCode }}</code>
                  <button class="shrink-0 rounded-md bg-white/10 px-3 py-2 text-xs font-black" type="button" @click="copyPixCode">Copiar</button>
                </div>
              </div>
              <a v-if="checkout.ticketUrl" :href="checkout.ticketUrl" target="_blank" rel="noopener" class="mt-4 block w-full rounded-md border border-white/15 px-5 py-3 text-center text-sm font-bold text-white">
                Abrir pagamento
              </a>
              <p class="mt-4 text-sm font-bold text-white/60">Aguardando confirmacao do pagamento...</p>
            </template>

            <template v-else>
              <p class="mt-4 rounded-md border px-4 py-3 text-sm font-bold" :class="terminalMessageClass">
                {{ terminalMessage }}
              </p>
              <button class="mt-4 w-full rounded-md border border-white/15 px-5 py-3 text-sm font-bold text-white" type="button" @click="resetCheckout">
                Tentar novamente
              </button>
            </template>
          </template>

          <p v-if="message" class="mt-4 rounded-md border border-blood-400/25 bg-blood-700/10 px-4 py-3 text-sm font-bold text-blood-100">
            {{ message }}
          </p>
        </aside>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { rechargePacks, type RechargePack } from '~/data/management'
import type { RechargeCheckout } from '~/composables/useCommerceApi'

useSeoMeta({ title: 'Recarga de moedas' })

const { loadSession, recordAudit, user } = useAuth()
const commerceApi = useCommerceApi()
const packs = ref<RechargePack[]>([])
const currencies = computed(() => Array.from(new Set(packs.value.map((pack) => pack.currency))))
const selectedCurrency = ref(rechargePacks[0].currency)
const selectedPack = ref<RechargePack>(rechargePacks[0])
const message = ref('')
const creatingCheckout = ref(false)
const checkout = ref<RechargeCheckout | null>(null)
let pollTimer: ReturnType<typeof setInterval> | undefined

const pendingStatuses = new Set(['Preparada', 'Aguardando pagamento', 'Processando'])
const isPending = computed(() => !!checkout.value && pendingStatuses.has(checkout.value.status))
const terminalMessage = computed(() => {
  switch (checkout.value?.status) {
    case 'Paga':
      return 'Pagamento aprovado! Seu saldo ja foi atualizado.'
    case 'Falhou':
      return 'O pagamento nao foi aprovado.'
    case 'Cancelada':
      return 'Este pagamento foi cancelado.'
    case 'Em analise':
      return 'Este pagamento esta em analise manual.'
    default:
      return 'Nao foi possivel confirmar o pagamento.'
  }
})
const terminalMessageClass = computed(() =>
  checkout.value?.status === 'Paga'
    ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
    : 'border-blood-400/25 bg-blood-700/10 text-blood-100'
)

onMounted(async () => {
  loadSession()
  await loadPacks()
})

onBeforeUnmount(() => stopPolling())

const loadPacks = async () => {
  try {
    const response = await commerceApi.listRechargePackages(false)
    packs.value = response.data
  } catch {
    packs.value = []
    message.value = 'API indisponivel. Pacotes locais nao serao usados como fallback.'
  }

  selectedCurrency.value = currencies.value[0] || rechargePacks[0].currency
  selectedPack.value = visiblePacks.value.find((pack) => pack.highlight) || visiblePacks.value[0] || rechargePacks[0]
}

const visiblePacks = computed(() => packs.value.filter((pack) => pack.currency === selectedCurrency.value))

watch(selectedCurrency, () => {
  selectedPack.value = visiblePacks.value.find((pack) => pack.highlight) || visiblePacks.value[0]
})

const continuePayment = async () => {
  if (!selectedPack.value) {
    return
  }
  if (!user.value) {
    message.value = 'Entre na sua conta para continuar.'
    return
  }

  creatingCheckout.value = true
  message.value = ''
  try {
    const intent = await commerceApi.createRechargeIntent(selectedPack.value.id)
    checkout.value = await commerceApi.createRechargeCheckout(intent.id)

    recordAudit({
      type: 'recharge.payment.intent',
      message: `Recarga preparada: ${selectedPack.value.amount} ${selectedPack.value.currency}.`,
      meta: {
        currency: selectedPack.value.currency,
        amount: selectedPack.value.amount,
        bonus: selectedPack.value.bonus,
        price: selectedPack.value.price
      }
    })

    startPolling(intent.id)
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Nao foi possivel gerar o pagamento.'
  } finally {
    creatingCheckout.value = false
  }
}

const startPolling = (id: string) => {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const status = await commerceApi.getRechargeStatus(id)
      if (checkout.value) {
        checkout.value = { ...checkout.value, status: status.status }
      }
      if (!pendingStatuses.has(status.status)) {
        stopPolling()
      }
    } catch {
      // Transient polling failure -- keep trying on the next tick.
    }
  }, 4000)
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = undefined
  }
}

const resetCheckout = () => {
  stopPolling()
  checkout.value = null
  message.value = ''
}

const copyPixCode = async () => {
  if (!checkout.value?.qrCode) return
  try {
    await navigator.clipboard.writeText(checkout.value.qrCode)
    message.value = 'Codigo Pix copiado.'
  } catch {
    message.value = 'Nao foi possivel copiar o codigo automaticamente.'
  }
}
</script>

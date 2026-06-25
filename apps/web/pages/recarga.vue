<template>
  <main class="min-h-screen bg-void text-white">
    <section class="bm-container pt-28">
      <div class="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div class="bm-panel rounded-md p-6">
          <p class="bm-kicker">Moedas</p>
          <h1 class="mt-2 font-display text-4xl font-black uppercase">Recarga de moedas</h1>
          <p class="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/68">
            Escolha uma moeda e um pacote para preparar a compra. A integracao real de pagamento entra na etapa de backend.
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
          <button class="mt-5 w-full rounded-md bg-blood-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blood-500" type="button" @click="continuePayment">
            Continuar pagamento
          </button>

          <p v-if="message" class="mt-4 rounded-md border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100">
            {{ message }}
          </p>
        </aside>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { rechargePacks, type RechargePack } from '~/data/management'

useSeoMeta({ title: 'Recarga de moedas' })

const { loadSession, recordAudit, user } = useAuth()
const { createRechargeIntent, loadManagement, state } = useManagement()
const currencies = Array.from(new Set(rechargePacks.map((pack) => pack.currency)))
const selectedCurrency = ref(currencies[0])
const selectedPack = ref<RechargePack>(rechargePacks.find((pack) => pack.currency === selectedCurrency.value && pack.highlight) || rechargePacks[0])
const message = ref('')

onMounted(() => {
  loadSession()
  loadManagement()
})

const visiblePacks = computed(() => state.value.rechargePacks.filter((pack) => pack.currency === selectedCurrency.value))

watch(selectedCurrency, () => {
  selectedPack.value = visiblePacks.value.find((pack) => pack.highlight) || visiblePacks.value[0]
})

const continuePayment = () => {
  if (user.value) {
    createRechargeIntent(user.value.username, selectedPack.value)
  }

  message.value = `Pagamento de ${selectedPack.value.amount.toLocaleString('pt-BR')} ${selectedPack.value.currency} preparado em modo teste.`
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
}
</script>

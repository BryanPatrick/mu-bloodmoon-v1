<template>
  <ManagementShell>
    <div class="flex flex-col gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p class="bm-kicker">Loja</p>
        <h1 class="mt-2 font-display text-4xl font-black uppercase">Loja Blood Moon</h1>
        <p class="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/68">
          Itens e servicos comprados com moedas da conta. A entrega real entra na etapa de backend.
        </p>
      </div>

      <div class="bm-glass grid gap-3 rounded-md p-3 sm:grid-cols-3 xl:min-w-[620px]">
        <input
          v-model="query"
          class="h-11 min-w-0 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-blood-400/70"
          placeholder="Buscar produto"
          type="search"
        >
        <select v-model="activeCategory" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
          <option class="bg-zinc-950 text-white" value="Todas">Todas categorias</option>
          <option v-for="category in categories" :key="category" class="bg-zinc-950 text-white" :value="category">{{ category }}</option>
        </select>
        <select v-model="activeCurrency" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
          <option class="bg-zinc-950 text-white" value="Todas">Todas moedas</option>
          <option v-for="currency in currencies" :key="currency" class="bg-zinc-950 text-white" :value="currency">{{ currency }}</option>
        </select>
      </div>
    </div>

    <div class="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <article v-for="product in filteredProducts" :key="product.id" class="bm-panel rounded-md p-5">
        <div class="grid aspect-square place-items-center rounded-md bg-black/30">
          <span class="font-display text-5xl font-black text-white/25">{{ product.short }}</span>
        </div>
        <div class="mt-4 flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-black uppercase tracking-[0.18em] text-ember">{{ product.category }}</p>
            <h2 class="mt-2 font-display text-xl font-black">{{ product.name }}</h2>
          </div>
          <span class="rounded-sm px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em]" :class="product.status === 'Ativo' ? 'bg-emerald-500/15 text-emerald-100' : 'bg-white/10 text-white/55'">
            {{ product.status }}
          </span>
        </div>
        <p class="mt-2 text-sm font-semibold leading-6 text-white/62">{{ product.description }}</p>
        <div class="mt-4 flex items-center justify-between gap-3">
          <span class="font-display text-xl font-black text-ember">{{ product.price.toLocaleString('pt-BR') }} {{ product.currency }}</span>
          <button
            class="rounded-md bg-blood-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-blood-500 disabled:cursor-not-allowed disabled:opacity-45"
            type="button"
            :disabled="product.status !== 'Ativo'"
            @click="buyProduct(product.name)"
          >
            Comprar
          </button>
        </div>
        <p class="mt-3 text-xs font-bold text-white/45">Estoque: {{ product.stock }}</p>
      </article>
    </div>

    <p v-if="message" class="mt-6 rounded-md border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100">
      {{ message }}
    </p>
  </ManagementShell>
</template>

<script setup lang="ts">
useSeoMeta({ title: 'Loja Blood Moon' })

const { loadSession, recordAudit, user } = useAuth()
const { createPurchaseIntent, loadManagement, state } = useManagement()
const query = ref('')
const activeCategory = ref('Todas')
const activeCurrency = ref('Todas')
const message = ref('')

onMounted(() => {
  loadSession()
  loadManagement()
})

const categories = computed(() => Array.from(new Set(state.value.products.map((product) => product.category))).sort())
const currencies = computed(() => Array.from(new Set(state.value.products.map((product) => product.currency))).sort())

const filteredProducts = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase()

  return state.value.products.filter((product) => {
    const matchesCategory = activeCategory.value === 'Todas' || product.category === activeCategory.value
    const matchesCurrency = activeCurrency.value === 'Todas' || product.currency === activeCurrency.value
    const matchesQuery = !normalizedQuery || [product.name, product.category, product.description, product.currency]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)

    return matchesCategory && matchesCurrency && matchesQuery
  })
})

const buyProduct = (name: string) => {
  const product = state.value.products.find((item) => item.name === name)
  if (!product || !user.value) {
    return
  }

  createPurchaseIntent(user.value.username, product)
  message.value = `Compra de ${name} preparada em modo teste.`
  recordAudit({
    type: 'shop.purchase.intent',
    message: `Intencao de compra registrada: ${name}.`,
    meta: { product: name }
  })
}
</script>

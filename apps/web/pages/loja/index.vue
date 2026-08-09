<template>
  <main class="bm-page-shell pb-16">
    <PageHero
      eyebrow="Loja oficial"
      title="Loja Blood Moon"
      description="Produtos oficiais, serviços e conveniências com entrega rastreável para sua conta."
    />

    <section class="bm-page-content py-6">
      <div class="bm-glass grid gap-3 rounded-md p-3 md:grid-cols-[1fr_220px]">
        <input v-model="search" class="store-field" type="search" placeholder="Buscar na loja">
        <select v-model="category" class="store-field">
          <option value="">Todas as categorias</option>
          <option v-for="item in categories" :key="item.id" :value="item.name">{{ item.name }}</option>
        </select>
      </div>

      <div v-if="pending" class="grid min-h-56 place-items-center text-sm font-bold text-white/55">Carregando produtos...</div>
      <div v-else-if="errorMessage" class="mt-5 rounded-md border border-red-400/30 bg-red-500/10 p-4 text-sm font-bold text-red-100">{{ errorMessage }}</div>
      <div v-else-if="!filteredProducts.length" class="mt-5 grid min-h-56 place-items-center rounded-md border border-dashed border-white/15 text-center">
        <div><p class="bm-kicker">Catálogo</p><h2 class="mt-2 font-display text-2xl font-black uppercase">Nenhum produto disponível</h2><p class="mt-2 text-sm text-white/55">A loja só exibe produtos revisados, aprovados e publicados.</p></div>
      </div>

      <div v-else class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <article v-for="product in filteredProducts" :key="product.id" class="bm-panel group flex min-h-[360px] flex-col overflow-hidden rounded-md">
          <NuxtLink :to="`/loja/${product.slug}`" class="relative block aspect-[4/3] overflow-hidden bg-black/35">
            <img v-if="product.images?.[0]" :src="product.images[0]" :alt="product.name" class="h-full w-full object-contain p-5 transition duration-300 group-hover:scale-[1.03]">
            <div v-else class="grid h-full place-items-center font-display text-4xl font-black text-white/15">{{ product.short }}</div>
            <span v-if="product.featured" class="absolute left-3 top-3 rounded-sm bg-ember px-2 py-1 text-[10px] font-black uppercase text-black">Destaque</span>
          </NuxtLink>
          <div class="flex flex-1 flex-col p-4">
            <p class="bm-kicker">{{ product.category }}</p>
            <h2 class="mt-2 font-display text-xl font-black uppercase">{{ product.name }}</h2>
            <p class="mt-2 line-clamp-3 text-xs font-semibold leading-5 text-white/60">{{ product.summary || product.description }}</p>
            <div class="mt-auto flex items-end justify-between gap-3 pt-5">
              <div><p class="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">A partir de</p><strong class="font-display text-xl text-ember">{{ minimumPrice(product).toLocaleString('pt-BR') }} {{ minimumCurrency(product) }}</strong></div>
              <NuxtLink :to="`/loja/${product.slug}`" class="bm-admin-primary">Ver</NuxtLink>
            </div>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { StoreProduct } from '~/composables/useStoreApi'

useSeoMeta({ title: 'Loja oficial | Blood Moon', description: 'Produtos e serviços oficiais do servidor Blood Moon.' })

const api = useStoreApi()
const products = ref<StoreProduct[]>([])
const categories = ref<Array<{ id: string, name: string }>>([])
const search = ref('')
const category = ref('')
const pending = ref(true)
const errorMessage = ref('')

onMounted(async () => {
  try {
    const [productResult, categoryResult] = await Promise.all([
      api.publicProducts({ pageSize: 100 }),
      api.publicCategories()
    ])
    products.value = productResult.data
    categories.value = categoryResult
  } catch {
    errorMessage.value = 'A loja está temporariamente indisponível.'
  } finally {
    pending.value = false
  }
})

const filteredProducts = computed(() => {
  const term = search.value.trim().toLowerCase()
  return products.value.filter((product) => {
    const matchesCategory = !category.value || product.category === category.value
    const matchesSearch = !term || [product.name, product.category, product.summary, product.description].join(' ').toLowerCase().includes(term)
    return matchesCategory && matchesSearch
  })
})

const minimumVariant = (product: StoreProduct) => [...(product.variants || [])].filter(item => item.available).sort((a, b) => a.price - b.price)[0]
const minimumPrice = (product: StoreProduct) => minimumVariant(product)?.price ?? product.price
const minimumCurrency = (product: StoreProduct) => minimumVariant(product)?.currency ?? product.currency
</script>

<style scoped>
.store-field {
  min-height: 2.65rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.375rem;
  background: rgba(0, 0, 0, 0.24);
  padding: 0.65rem 0.85rem;
  color: white;
  font-size: 0.78rem;
  font-weight: 700;
  outline: none;
}
</style>

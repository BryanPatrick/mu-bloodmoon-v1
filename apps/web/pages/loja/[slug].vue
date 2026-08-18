<template>
  <main class="bm-page-shell pb-16">
    <section v-if="product" class="bm-page-content py-8">
      <NuxtLink to="/loja" class="text-xs font-black uppercase tracking-[0.16em] text-ember">Voltar à loja</NuxtLink>
      <div class="mt-5 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div class="bm-panel grid min-h-[420px] place-items-center rounded-md p-5">
          <img v-if="product.images?.[0]" :src="product.images[0]" :alt="product.name" class="max-h-[520px] w-full object-contain">
          <span v-else class="font-display text-7xl font-black text-white/12">{{ product.short }}</span>
        </div>
        <div class="bm-panel rounded-md p-6">
          <p class="bm-kicker">{{ product.category }}</p>
          <h1 class="mt-3 font-display text-4xl font-black uppercase">{{ product.name }}</h1>
          <p class="mt-4 text-sm font-semibold leading-7 text-white/68">{{ product.description }}</p>

          <div v-if="product.variants?.length" class="mt-6 grid gap-2">
            <button
              v-for="variant in product.variants"
              :key="variant.id"
              type="button"
              class="flex items-center justify-between rounded-md border p-3 text-left transition"
              :class="selectedVariant?.id === variant.id ? 'border-ember bg-ember/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25'"
              @click="selectedVariant = variant"
            >
              <span><strong class="block text-sm">{{ variant.name }}</strong><small class="text-white/48">{{ variant.stock === null ? 'Disponível' : `${variant.stock} em estoque` }}</small></span>
              <strong class="font-display text-lg text-ember">{{ variant.price.toLocaleString('pt-BR') }} {{ variant.currency }}</strong>
            </button>
          </div>

          <div class="mt-6 flex flex-wrap items-end gap-3 border-t border-white/10 pt-5">
            <label v-if="requiresCharacter" class="grid min-w-52 flex-1 gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
              Personagem de destino
              <select v-model="destinationCharacterId" class="detail-field">
                <option value="">Selecione um personagem</option>
                <option v-for="character in characters" :key="character.id" :value="character.id">{{ character.name }} · {{ character.class }}</option>
              </select>
            </label>
            <label class="grid gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Quantidade<input v-model.number="quantity" type="number" min="1" class="detail-field w-24"></label>
            <button class="bm-admin-primary min-h-11 flex-1" type="button" :disabled="buying" @click="purchase">{{ buying ? 'Processando...' : 'Comprar' }}</button>
          </div>
          <p v-if="message" class="mt-4 rounded-md border border-white/10 bg-white/[0.04] p-3 text-xs font-bold">{{ message }}</p>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { StoreProduct, StoreVariant } from '~/composables/useStoreApi'

const route = useRoute()
const api = useStoreApi()
const charactersApi = useCharactersApi()
const { loadSession, user } = useAuth()
const product = ref<StoreProduct | null>(null)
const selectedVariant = ref<StoreVariant | null>(null)
const quantity = ref(1)
const buying = ref(false)
const message = ref('')
const characters = ref<Array<{ id: string, name: string, class: string }>>([])
const destinationCharacterId = ref('')

onMounted(async () => {
  loadSession()
  try {
    product.value = await api.publicProduct(String(route.params.slug))
    selectedVariant.value = product.value.variants?.[0] || null
    if (user.value) characters.value = (await charactersApi.list()).data
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Produto não encontrado' })
  }
})

useSeoMeta({ title: () => product.value ? `${product.value.name} | Loja Blood Moon` : 'Loja Blood Moon' })

const requiresCharacter = computed(() => {
  const target = selectedVariant.value?.deliveryTarget || product.value?.deliveryTarget
  return Boolean(target && target !== 'ACCOUNT')
})

const purchase = async () => {
  if (!user.value) {
    await navigateTo('/login')
    return
  }
  if (!product.value) return
  buying.value = true
  try {
    if (requiresCharacter.value && !destinationCharacterId.value) {
      message.value = 'Selecione o personagem que receberá o produto.'
      return
    }
    await api.purchase({
      productId: product.value.id,
      variantId: selectedVariant.value?.id,
      quantity: quantity.value,
      destinationCharacterId: destinationCharacterId.value || undefined
    })
    message.value = 'Pedido criado. Acompanhe pagamento e entrega em suas compras.'
  } catch (error: any) {
    message.value = error?.data?.message || 'Não foi possível criar o pedido.'
  } finally {
    buying.value = false
  }
}
</script>

<style scoped>
.detail-field {
  min-height: 2.65rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.375rem;
  background: rgba(0, 0, 0, 0.28);
  padding: 0.6rem;
  color: white;
}
</style>

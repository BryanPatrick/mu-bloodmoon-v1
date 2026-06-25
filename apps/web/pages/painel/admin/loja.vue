<template>
  <ManagementShell>
    <div v-if="hasPermission(permissions.adminShopManage)" class="grid gap-6">
      <div class="flex flex-col gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p class="bm-kicker">Administracao</p>
          <h1 class="mt-3 font-display text-4xl font-black uppercase sm:text-5xl">Loja Admin</h1>
          <p class="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/70">
            Cadastre, edite e controle produtos exibidos na loja do jogador.
          </p>
        </div>

        <div class="bm-glass grid gap-3 rounded-md p-3 sm:grid-cols-[1fr_auto] xl:min-w-[520px]">
          <input
            v-model="query"
            class="h-11 min-w-0 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-blood-400/70"
            placeholder="Buscar produto"
            type="search"
          >
          <button class="rounded-md bg-blood-700 px-4 py-3 text-sm font-black text-white transition hover:bg-blood-600" type="button" @click="openCreate">
            Novo produto
          </button>
        </div>
      </div>

      <section class="grid gap-3 sm:grid-cols-4">
        <article v-for="card in summaryCards" :key="card.label" class="bm-panel rounded-md p-4">
          <p class="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">{{ card.label }}</p>
          <p class="mt-3 font-display text-3xl font-black text-white">{{ card.value }}</p>
        </article>
      </section>

      <section v-if="isEditorOpen" class="bm-panel rounded-md p-5">
        <div class="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p class="text-xs font-black uppercase tracking-[0.28em] text-ember">Produto</p>
            <h2 class="mt-2 font-display text-2xl font-black">{{ editingId ? 'Editar produto' : 'Novo produto' }}</h2>
          </div>
          <button class="bm-button-glass rounded-md px-3 py-2 text-sm font-black" type="button" @click="closeEditor">
            Fechar
          </button>
        </div>

        <form class="mt-5 grid gap-4 xl:grid-cols-4" @submit.prevent="saveProduct">
          <input v-model="form.name" class="field xl:col-span-2" placeholder="Nome" required>
          <input v-model="form.short" class="field" maxlength="4" placeholder="Sigla" required>
          <input v-model="form.category" class="field" placeholder="Categoria" required>
          <textarea v-model="form.description" class="field min-h-28 xl:col-span-4" placeholder="Descricao" required />
          <input v-model.number="form.price" class="field" min="0" placeholder="Preco" required type="number">
          <select v-model="form.currency" class="field">
            <option class="bg-zinc-950 text-white" value="WCoin">WCoin</option>
            <option class="bg-zinc-950 text-white" value="Goblin Point">Goblin Point</option>
            <option class="bg-zinc-950 text-white" value="Hunt Point">Hunt Point</option>
          </select>
          <select v-model="form.status" class="field">
            <option class="bg-zinc-950 text-white" value="Ativo">Ativo</option>
            <option class="bg-zinc-950 text-white" value="Rascunho">Rascunho</option>
          </select>
          <input v-model="form.stock" class="field" placeholder="Estoque ou Ilimitado">

          <div class="xl:col-span-4">
            <button class="rounded-md bg-blood-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blood-600" type="submit">
              Salvar produto
            </button>
          </div>
        </form>
      </section>

      <section class="grid gap-4">
        <article v-for="product in filteredProducts" :key="product.id" class="bm-panel rounded-md p-5">
          <div class="grid gap-5 xl:grid-cols-[120px_1fr_auto] xl:items-center">
            <div class="grid aspect-square place-items-center rounded-md bg-black/30">
              <span class="font-display text-3xl font-black text-white/25">{{ product.short }}</span>
            </div>

            <div>
              <div class="flex flex-wrap gap-2">
                <span class="rounded-sm px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em]" :class="product.status === 'Ativo' ? 'bg-emerald-500/15 text-emerald-100' : 'bg-white/10 text-white/55'">
                  {{ product.status }}
                </span>
                <span class="rounded-sm bg-ember/15 px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-ember">{{ product.category }}</span>
              </div>
              <h3 class="mt-3 font-display text-2xl font-black">{{ product.name }}</h3>
              <p class="mt-2 text-sm font-semibold leading-6 text-white/65">{{ product.description }}</p>
              <p class="mt-3 text-sm font-black text-ember">{{ product.price.toLocaleString('pt-BR') }} {{ product.currency }}</p>
            </div>

            <div class="grid gap-2 sm:grid-cols-3 xl:w-52 xl:grid-cols-1">
              <button class="bm-button-glass rounded-md px-4 py-3 text-sm font-black" type="button" @click="openEdit(product)">
                Editar
              </button>
              <button class="bm-button-glass rounded-md px-4 py-3 text-sm font-black" type="button" @click="toggleStatus(product)">
                {{ product.status === 'Ativo' ? 'Desativar' : 'Ativar' }}
              </button>
              <button class="rounded-md border border-blood-500/40 bg-blood-900/30 px-4 py-3 text-sm font-black text-blood-100" type="button" @click="removeProduct(product.id)">
                Excluir
              </button>
            </div>
          </div>
        </article>
      </section>

      <p v-if="message" class="rounded-md border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100">
        {{ message }}
      </p>
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import { permissions } from '~/data/security'
import type { CurrencyCode, ShopProduct } from '~/data/management'

const { hasPermission, loadSession, recordAudit } = useAuth()
const { deleteProduct, loadManagement, state, upsertProduct } = useManagement()

useSeoMeta({ title: 'Loja Admin' })

const query = ref('')
const isEditorOpen = ref(false)
const editingId = ref('')
const message = ref('')

const form = reactive({
  name: '',
  short: '',
  category: '',
  description: '',
  price: 0,
  currency: 'WCoin' as CurrencyCode,
  status: 'Ativo' as ShopProduct['status'],
  stock: 'Ilimitado'
})

onMounted(() => {
  loadSession()
  loadManagement()
})

const filteredProducts = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase()
  return state.value.products.filter((product) =>
    !normalizedQuery || [product.name, product.category, product.description, product.currency, product.status]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  )
})

const summaryCards = computed(() => [
  { label: 'Produtos', value: state.value.products.length.toString() },
  { label: 'Ativos', value: state.value.products.filter((product) => product.status === 'Ativo').length.toString() },
  { label: 'Rascunhos', value: state.value.products.filter((product) => product.status === 'Rascunho').length.toString() },
  { label: 'Filtrados', value: filteredProducts.value.length.toString() }
])

const resetForm = () => {
  form.name = ''
  form.short = ''
  form.category = ''
  form.description = ''
  form.price = 0
  form.currency = 'WCoin'
  form.status = 'Ativo'
  form.stock = 'Ilimitado'
}

const openCreate = () => {
  editingId.value = ''
  resetForm()
  isEditorOpen.value = true
}

const openEdit = (product: ShopProduct) => {
  editingId.value = product.id
  form.name = product.name
  form.short = product.short
  form.category = product.category
  form.description = product.description
  form.price = product.price
  form.currency = product.currency
  form.status = product.status
  form.stock = String(product.stock)
  isEditorOpen.value = true
}

const closeEditor = () => {
  isEditorOpen.value = false
  editingId.value = ''
}

const normalizeId = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const parsedStock = computed(() => {
  const normalizedStock = String(form.stock).trim()
  const numericStock = Number(normalizedStock)
  return Number.isFinite(numericStock) && normalizedStock !== '' ? numericStock : 'Ilimitado'
})

const saveProduct = () => {
  const product: ShopProduct = {
    id: editingId.value || normalizeId(form.name),
    name: form.name.trim(),
    short: form.short.trim().toUpperCase(),
    category: form.category.trim(),
    description: form.description.trim(),
    price: Number(form.price) || 0,
    currency: form.currency,
    status: form.status,
    stock: parsedStock.value
  }

  upsertProduct(product)
  recordAudit({
    type: editingId.value ? 'admin.shop.product.updated' : 'admin.shop.product.created',
    message: `Produto ${product.name} ${editingId.value ? 'editado' : 'criado'}.`,
    meta: {
      product: product.name,
      status: product.status,
      currency: product.currency
    }
  })
  message.value = `Produto ${product.name} salvo.`
  closeEditor()
}

const toggleStatus = (product: ShopProduct) => {
  const nextProduct = {
    ...product,
    status: product.status === 'Ativo' ? 'Rascunho' : 'Ativo'
  } satisfies ShopProduct

  upsertProduct(nextProduct)
  recordAudit({
    type: 'admin.shop.product.status',
    message: `Produto ${nextProduct.name} marcado como ${nextProduct.status}.`,
    meta: {
      product: nextProduct.name,
      status: nextProduct.status
    }
  })
  message.value = `Produto ${nextProduct.name} marcado como ${nextProduct.status}.`
}

const removeProduct = (productId: string) => {
  const product = deleteProduct(productId)
  if (!product) {
    return
  }

  recordAudit({
    type: 'admin.shop.product.deleted',
    message: `Produto ${product.name} excluido.`,
    meta: { product: product.name }
  })
  message.value = `Produto ${product.name} excluido.`
}
</script>

<style scoped>
.field {
  min-height: 2.75rem;
  border-radius: 0.375rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.1);
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: white;
  outline: none;
}

.field:focus {
  border-color: rgba(220, 38, 38, 0.7);
}

.field::placeholder {
  color: rgba(255, 255, 255, 0.45);
}
</style>

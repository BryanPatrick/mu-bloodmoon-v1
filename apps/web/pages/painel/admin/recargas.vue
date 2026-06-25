<template>
  <ManagementShell>
    <div v-if="hasPermission(permissions.adminRechargeManage)" class="grid gap-6">
      <div class="flex flex-col gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p class="bm-kicker">Administracao</p>
          <h1 class="mt-3 font-display text-4xl font-black uppercase sm:text-5xl">Recargas Admin</h1>
          <p class="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/70">
            Cadastre e ajuste os pacotes de moedas exibidos na pagina de recarga.
          </p>
        </div>

        <div class="bm-glass grid gap-3 rounded-md p-3 sm:grid-cols-[1fr_auto] xl:min-w-[520px]">
          <select v-model="activeCurrency" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
            <option class="bg-zinc-950 text-white" value="Todas">Todas moedas</option>
            <option class="bg-zinc-950 text-white" value="WCoin">WCoin</option>
            <option class="bg-zinc-950 text-white" value="Goblin Point">Goblin Point</option>
            <option class="bg-zinc-950 text-white" value="Hunt Point">Hunt Point</option>
          </select>
          <button class="rounded-md bg-blood-700 px-4 py-3 text-sm font-black text-white transition hover:bg-blood-600" type="button" @click="openCreate">
            Novo pacote
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
            <p class="text-xs font-black uppercase tracking-[0.28em] text-ember">Pacote</p>
            <h2 class="mt-2 font-display text-2xl font-black">{{ editingId ? 'Editar pacote' : 'Novo pacote' }}</h2>
          </div>
          <button class="bm-button-glass rounded-md px-3 py-2 text-sm font-black" type="button" @click="closeEditor">
            Fechar
          </button>
        </div>

        <form class="mt-5 grid gap-4 md:grid-cols-5" @submit.prevent="savePack">
          <select v-model="form.currency" class="field">
            <option class="bg-zinc-950 text-white" value="WCoin">WCoin</option>
            <option class="bg-zinc-950 text-white" value="Goblin Point">Goblin Point</option>
            <option class="bg-zinc-950 text-white" value="Hunt Point">Hunt Point</option>
          </select>
          <input v-model.number="form.amount" class="field" min="1" placeholder="Quantidade" required type="number">
          <input v-model.number="form.bonus" class="field" min="0" placeholder="Bonus" required type="number">
          <input v-model="form.price" class="field" placeholder="Valor R$" required>
          <label class="flex min-h-11 items-center gap-3 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold">
            <input v-model="form.highlight" type="checkbox">
            Popular
          </label>

          <div class="md:col-span-5">
            <button class="rounded-md bg-blood-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blood-600" type="submit">
              Salvar pacote
            </button>
          </div>
        </form>
      </section>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article v-for="pack in filteredPacks" :key="pack.id" class="bm-panel rounded-md p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-black uppercase tracking-[0.18em] text-ember">{{ pack.currency }}</p>
              <h3 class="mt-3 font-display text-3xl font-black">{{ pack.amount.toLocaleString('pt-BR') }}</h3>
            </div>
            <span v-if="pack.highlight" class="rounded-sm bg-ember/15 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-ember">Popular</span>
          </div>
          <div class="mt-5 grid gap-2 text-sm font-bold">
            <div class="flex justify-between rounded-md bg-black/25 px-3 py-2">
              <span class="text-white/55">Bonus</span>
              <span>{{ pack.bonus.toLocaleString('pt-BR') }}</span>
            </div>
            <div class="flex justify-between rounded-md bg-black/25 px-3 py-2">
              <span class="text-white/55">Valor</span>
              <span>R$ {{ pack.price }}</span>
            </div>
          </div>

          <div class="mt-5 grid grid-cols-2 gap-2">
            <button class="bm-button-glass rounded-md px-3 py-2 text-sm font-black" type="button" @click="openEdit(pack)">
              Editar
            </button>
            <button class="rounded-md border border-blood-500/40 bg-blood-900/30 px-3 py-2 text-sm font-black text-blood-100" type="button" @click="removePack(pack.id)">
              Excluir
            </button>
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
import type { CurrencyCode, RechargePack } from '~/data/management'

const { hasPermission, loadSession, recordAudit } = useAuth()
const { deleteRechargePack, loadManagement, state, upsertRechargePack } = useManagement()

useSeoMeta({ title: 'Recargas Admin' })

const activeCurrency = ref('Todas')
const isEditorOpen = ref(false)
const editingId = ref('')
const message = ref('')

const form = reactive({
  currency: 'WCoin' as CurrencyCode,
  amount: 0,
  bonus: 0,
  price: '',
  highlight: false
})

onMounted(() => {
  loadSession()
  loadManagement()
})

const filteredPacks = computed(() =>
  state.value.rechargePacks.filter((pack) => activeCurrency.value === 'Todas' || pack.currency === activeCurrency.value)
)

const summaryCards = computed(() => [
  { label: 'Pacotes', value: state.value.rechargePacks.length.toString() },
  { label: 'WCoin', value: state.value.rechargePacks.filter((pack) => pack.currency === 'WCoin').length.toString() },
  { label: 'Goblin Point', value: state.value.rechargePacks.filter((pack) => pack.currency === 'Goblin Point').length.toString() },
  { label: 'Hunt Point', value: state.value.rechargePacks.filter((pack) => pack.currency === 'Hunt Point').length.toString() }
])

const resetForm = () => {
  form.currency = 'WCoin'
  form.amount = 0
  form.bonus = 0
  form.price = ''
  form.highlight = false
}

const openCreate = () => {
  editingId.value = ''
  resetForm()
  isEditorOpen.value = true
}

const openEdit = (pack: RechargePack) => {
  editingId.value = pack.id
  form.currency = pack.currency
  form.amount = pack.amount
  form.bonus = pack.bonus
  form.price = pack.price
  form.highlight = Boolean(pack.highlight)
  isEditorOpen.value = true
}

const closeEditor = () => {
  isEditorOpen.value = false
  editingId.value = ''
}

const savePack = () => {
  const pack: RechargePack = {
    id: editingId.value || `${form.currency.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${form.amount}`,
    currency: form.currency,
    amount: Number(form.amount) || 0,
    bonus: Number(form.bonus) || 0,
    price: form.price.trim(),
    highlight: form.highlight
  }

  upsertRechargePack(pack)
  recordAudit({
    type: editingId.value ? 'admin.recharge.pack.updated' : 'admin.recharge.pack.created',
    message: `Pacote de ${pack.amount} ${pack.currency} ${editingId.value ? 'editado' : 'criado'}.`,
    meta: {
      currency: pack.currency,
      amount: pack.amount,
      bonus: pack.bonus
    }
  })
  message.value = `Pacote de ${pack.amount.toLocaleString('pt-BR')} ${pack.currency} salvo.`
  closeEditor()
}

const removePack = (packId: string) => {
  const pack = deleteRechargePack(packId)
  if (!pack) {
    return
  }

  recordAudit({
    type: 'admin.recharge.pack.deleted',
    message: `Pacote de ${pack.amount} ${pack.currency} excluido.`,
    meta: {
      currency: pack.currency,
      amount: pack.amount
    }
  })
  message.value = `Pacote de ${pack.amount.toLocaleString('pt-BR')} ${pack.currency} excluido.`
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

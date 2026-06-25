<template>
  <ManagementShell>
    <div class="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <div class="bm-panel rounded-md p-6">
        <p class="bm-kicker">Conta</p>
        <h1 class="mt-2 font-display text-4xl font-black uppercase">Gerenciar conta</h1>
        <div class="mt-6 grid gap-3 text-sm font-bold">
          <div class="flex justify-between rounded-md bg-black/25 p-3">
            <span class="text-white/55">Usuario</span>
            <span>{{ user?.username || 'admin' }}</span>
          </div>
          <div class="flex justify-between rounded-md bg-black/25 p-3">
            <span class="text-white/55">Perfil</span>
            <span>{{ account?.role || user?.role || 'player' }}</span>
          </div>
          <div class="flex justify-between rounded-md bg-black/25 p-3">
            <span class="text-white/55">E-mail</span>
            <span>{{ account?.email || 'conta@bloodmoon.local' }}</span>
          </div>
          <div class="flex justify-between rounded-md bg-black/25 p-3">
            <span class="text-white/55">Status</span>
            <span>{{ account?.status || 'Ativa' }}</span>
          </div>
          <div class="flex justify-between rounded-md bg-black/25 p-3">
            <span class="text-white/55">Personal ID</span>
            <span>{{ account?.personalIdMask || '***-**-0000' }}</span>
          </div>
        </div>
      </div>

      <div class="bm-panel rounded-md p-6">
        <p class="text-xs font-black uppercase tracking-[0.28em] text-ember">Seguranca</p>
        <h2 class="mt-2 font-display text-2xl font-black">Trocar senha</h2>

        <form class="mt-5 grid gap-4" @submit.prevent="submitPasswordChange">
          <input v-model="form.currentPassword" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Senha atual" type="password">
          <input v-model="form.personalId" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Personal ID" type="text">
          <div class="grid gap-4 sm:grid-cols-2">
            <input v-model="form.newPassword" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Nova senha" type="password">
            <input v-model="form.repeatPassword" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Repetir nova senha" type="password">
          </div>

          <p v-if="message" class="rounded-md border px-4 py-3 text-sm font-bold" :class="messageClass">{{ message }}</p>

          <button class="w-fit rounded-md bg-blood-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blood-500" type="submit">
            Alterar senha
          </button>
        </form>
      </div>
    </div>

    <div class="mt-6 grid gap-6 xl:grid-cols-2">
      <section class="bm-panel rounded-md p-6">
        <p class="text-xs font-black uppercase tracking-[0.28em] text-ember">Historico</p>
        <h2 class="mt-2 font-display text-2xl font-black">Compras preparadas</h2>
        <div v-if="recentPurchases.length" class="mt-5 grid gap-3">
          <div v-for="purchase in recentPurchases" :key="purchase.id" class="rounded-md bg-black/25 p-3 text-sm font-bold">
            <div class="flex items-center justify-between gap-3">
              <span>{{ purchase.productName }}</span>
              <span class="text-ember">{{ purchase.price.toLocaleString('pt-BR') }} {{ purchase.currency }}</span>
            </div>
            <p class="mt-1 text-xs text-white/45">{{ purchase.status }} - {{ formatDate(purchase.createdAt) }}</p>
          </div>
        </div>
        <p v-else class="mt-5 rounded-md border border-white/10 bg-black/20 p-4 text-sm font-bold text-white/55">
          Nenhuma compra preparada ainda.
        </p>
      </section>

      <section class="bm-panel rounded-md p-6">
        <p class="text-xs font-black uppercase tracking-[0.28em] text-ember">Historico</p>
        <h2 class="mt-2 font-display text-2xl font-black">Recargas preparadas</h2>
        <div v-if="recentRecharges.length" class="mt-5 grid gap-3">
          <div v-for="recharge in recentRecharges" :key="recharge.id" class="rounded-md bg-black/25 p-3 text-sm font-bold">
            <div class="flex items-center justify-between gap-3">
              <span>{{ recharge.amount.toLocaleString('pt-BR') }} {{ recharge.currency }}</span>
              <span class="text-ember">R$ {{ recharge.price }}</span>
            </div>
            <p class="mt-1 text-xs text-white/45">{{ recharge.status }} - {{ formatDate(recharge.createdAt) }}</p>
          </div>
        </div>
        <p v-else class="mt-5 rounded-md border border-white/10 bg-black/20 p-4 text-sm font-bold text-white/55">
          Nenhuma recarga preparada ainda.
        </p>
      </section>
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
const { loadSession, recordAudit, user } = useAuth()
const { getAccountByUsername, loadManagement, purchasesFor, rechargesFor } = useManagement()

useSeoMeta({ title: 'Gerenciar conta' })

onMounted(() => {
  loadSession()
  loadManagement()
})

const account = computed(() => getAccountByUsername(user.value?.username))
const recentPurchases = computed(() => purchasesFor(user.value?.username).slice(0, 3))
const recentRecharges = computed(() => rechargesFor(user.value?.username).slice(0, 3))

const form = reactive({
  currentPassword: '',
  personalId: '',
  newPassword: '',
  repeatPassword: ''
})

const message = ref('')
const isSuccess = ref(false)

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

const submitPasswordChange = () => {
  if (!form.currentPassword || !form.personalId || !form.newPassword || !form.repeatPassword) {
    isSuccess.value = false
    message.value = 'Preencha todos os campos para alterar a senha.'
    return
  }

  if (form.newPassword !== form.repeatPassword) {
    isSuccess.value = false
    message.value = 'As novas senhas nao conferem.'
    return
  }

  isSuccess.value = true
  message.value = 'Senha validada para teste. A alteracao real entra na etapa de backend.'
  recordAudit({
    type: 'account.password.change.validated',
    message: 'Troca de senha validada em modo teste.',
    meta: {
      username: user.value?.username || 'guest'
    }
  })
}
</script>

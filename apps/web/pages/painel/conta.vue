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
    <div class="mt-6 grid gap-6 xl:grid-cols-2">
      <section class="bm-panel rounded-md p-6">
        <p class="bm-kicker">Protecao adicional</p>
        <div class="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h2 class="font-display text-2xl font-black">Autenticacao em duas etapas</h2>
          <span class="rounded-md border px-3 py-1 text-xs font-black" :class="account?.twoFactorEnabled ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-200' : 'border-amber-300/25 bg-amber-400/10 text-amber-100'">
            {{ account?.twoFactorEnabled ? 'ATIVA' : 'DESATIVADA' }}
          </span>
        </div>
        <p class="mt-3 text-sm font-semibold text-white/55">Use Google Authenticator, Microsoft Authenticator ou outro aplicativo TOTP.</p>
        <p v-if="twoFactorMandatory" class="mt-3 rounded-md border border-amber-300/25 bg-amber-400/10 p-3 text-xs font-bold text-amber-100">
          2FA obrigatorio para contas administrativas (GM, ADM e Super ADM). {{ account?.twoFactorEnabled ? 'Sua conta ja esta protegida.' : 'Ative agora para continuar acessando areas administrativas.' }}
        </p>

        <div v-if="!account?.twoFactorEnabled" class="mt-5 grid gap-3">
          <input v-model="twoFactorPassword" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Senha atual" type="password">
          <button v-if="!twoFactorSetup" class="bm-liquid-primary w-fit px-5 py-3 text-sm font-black" type="button" @click="startTwoFactor">Gerar QR code</button>
          <div v-else class="grid gap-4 rounded-md border border-white/10 bg-black/20 p-4 sm:grid-cols-[10rem_1fr]">
            <img :src="twoFactorSetup.qrCode" alt="QR code para configurar autenticacao em duas etapas" class="aspect-square w-40 rounded-md bg-white p-2">
            <div class="grid content-start gap-3">
              <p class="text-xs font-bold text-white/55">Escaneie o QR code ou use esta chave:</p>
              <code class="break-all rounded-md bg-black/35 p-3 text-xs text-cyan-100">{{ twoFactorSetup.secret }}</code>
              <input v-model="twoFactorCode" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Codigo de 6 digitos" inputmode="numeric" maxlength="6">
              <button class="bm-liquid-primary w-fit px-5 py-3 text-sm font-black" type="button" @click="confirmTwoFactor">Confirmar e ativar</button>
            </div>
          </div>
        </div>
        <div v-else-if="!twoFactorMandatoryBlocked" class="mt-5 grid gap-3 sm:grid-cols-2">
          <input v-model="twoFactorPassword" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Senha atual" type="password">
          <input v-model="twoFactorCode" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Codigo de 6 digitos" inputmode="numeric" maxlength="6">
          <button class="bm-admin-danger w-fit" type="button" @click="disableTwoFactor">Desativar 2FA</button>
          <button class="bm-liquid-primary w-fit" type="button" @click="regenerateRecoveryCodes">Gerar novos codigos de recuperacao</button>
        </div>
        <div v-else class="mt-5 grid gap-3">
          <input v-model="twoFactorPassword" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Senha atual" type="password">
          <input v-model="twoFactorCode" class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Codigo de 6 digitos" inputmode="numeric" maxlength="6">
          <button class="bm-liquid-primary w-fit" type="button" @click="regenerateRecoveryCodes">Gerar novos codigos de recuperacao</button>
          <p class="rounded-md border border-white/10 bg-black/20 p-3 text-xs font-bold text-white/55">
            Contas GM, ADM e Super ADM nao podem desativar o proprio 2FA. Se voce perdeu o acesso, peca a um Super ADM o reset administrativo.
          </p>
        </div>

        <div v-if="recoveryCodes" class="mt-5 grid gap-3 rounded-md border border-cyan-300/25 bg-cyan-400/5 p-4">
          <p class="text-sm font-black text-cyan-100">Guarde estes codigos de recuperacao agora</p>
          <p class="text-xs font-bold text-white/55">Cada codigo funciona uma unica vez no lugar do codigo do aplicativo, caso voce perca o acesso. Eles nao serao mostrados novamente.</p>
          <div class="grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-5">
            <code v-for="recoveryCode in recoveryCodes" :key="recoveryCode" class="rounded-md bg-black/40 p-2 text-center text-cyan-100">{{ recoveryCode }}</code>
          </div>
          <button class="bm-button-glass w-fit rounded-md px-4 py-2 text-xs font-black" type="button" @click="recoveryCodes = null">Ja guardei, fechar</button>
        </div>

        <p v-if="twoFactorMessage" class="mt-4 rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm font-bold">{{ twoFactorMessage }}</p>
      </section>

      <section class="bm-panel rounded-md p-6">
        <div class="flex flex-wrap items-center justify-between gap-3"><div><p class="bm-kicker">Seguranca</p><h2 class="mt-2 font-display text-2xl font-black">Historico de sessoes</h2></div><button class="bm-admin-danger" type="button" @click="revokeAllSessions">Encerrar todas</button></div>
        <div class="mt-4 grid gap-2">
          <article v-for="item in sessions" :key="item.id" class="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3">
            <div><strong>{{ item.label }}</strong><p class="mt-1 text-xs text-white/45">{{ item.ipAddress || 'IP nao identificado' }} · atividade {{ formatDate(item.lastSeenAt) }}</p><p v-if="item.revokeReason" class="mt-1 text-xs text-amber-200/70">{{ item.revokeReason }}</p></div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-black" :class="item.active ? 'text-emerald-200' : 'text-white/35'">{{ item.current ? 'ATUAL' : item.active ? 'ATIVA' : 'ENCERRADA' }}</span>
              <button v-if="item.active && !item.current" class="bm-admin-action" type="button" @click="revokeOneSession(item.id)">Encerrar</button>
            </div>
          </article>
          <p v-if="!sessions.length" class="rounded-md border border-white/10 p-4 text-sm text-white/45">Nenhuma sessao registrada.</p>
        </div>
        <p v-if="sessionsMessage" class="mt-3 text-xs font-bold text-white/55">{{ sessionsMessage }}</p>
      </section>
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import type { CommercePurchase, CommerceRecharge } from '~/composables/useCommerceApi'
import type { AccountProfile, AccountSession } from '~/composables/useAccountSecurityApi'
import { isTwoFactorMandatory, type UserRole } from '~/data/security'

const { loadSession, user } = useAuth()
const accountSecurityApi = useAccountSecurityApi()
const commerceApi = useCommerceApi()

useSeoMeta({ title: 'Gerenciar conta' })

const purchases = ref<CommercePurchase[]>([])
const recharges = ref<CommerceRecharge[]>([])
const account = ref<AccountProfile | null>(null)
const sessions = ref<AccountSession[]>([])
const twoFactorPassword = ref('')
const twoFactorCode = ref('')
const twoFactorMessage = ref('')
const twoFactorSetup = ref<{ secret: string, uri: string, qrCode: string } | null>(null)
const recoveryCodes = ref<string[] | null>(null)
const twoFactorMandatory = computed(() => isTwoFactorMandatory(user.value?.role as UserRole | undefined))
const twoFactorMandatoryBlocked = computed(() => twoFactorMandatory.value)

onMounted(async () => {
  loadSession()
  await Promise.all([loadProfile(), loadHistory(), loadSessions()])
})

const sessionsMessage = ref('')
const loadSessions = async () => { try { sessions.value = await accountSecurityApi.sessions() } catch { sessions.value = [] } }

const requestStepUpToken = async () => {
  if (!import.meta.client) return null
  const currentPassword = window.prompt('Confirme sua senha atual para continuar:') || ''
  if (!currentPassword) return null
  const code = window.prompt('Codigo do autenticador (ou codigo de recuperacao):') || ''
  if (!code) return null
  const isRecoveryFormat = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code.trim())
  try {
    const result = await accountSecurityApi.stepUp(currentPassword, isRecoveryFormat ? undefined : code, isRecoveryFormat ? code : undefined)
    return result.stepUpToken
  } catch {
    sessionsMessage.value = 'Nao foi possivel confirmar sua identidade. Verifique a senha e o codigo.'
    return null
  }
}

const revokeAllSessions = async () => {
  if (!confirm('Encerrar todas as sessões, inclusive esta?')) return
  sessionsMessage.value = ''
  // GM/ADMIN/SUPER_ADMIN sessions are higher-value -- the backend requires a
  // fresh step-up to end all of them at once (see accounts.service.ts).
  let stepUpToken: string | null | undefined
  if (twoFactorMandatory.value) {
    stepUpToken = await requestStepUpToken()
    if (!stepUpToken) return
  }
  try { await accountSecurityApi.revokeSessions('Revogação solicitada pelo titular da conta', stepUpToken || undefined); await navigateTo('/login') }
  catch { sessionsMessage.value = 'Não foi possível encerrar as sessões.' }
}

const revokeOneSession = async (sessionId: string) => {
  if (!confirm('Encerrar esta sessão?')) return
  sessionsMessage.value = ''
  try { await accountSecurityApi.revokeSession(sessionId, 'Revogação solicitada pelo titular da conta'); await loadSessions() }
  catch { sessionsMessage.value = 'Não foi possível encerrar esta sessão.' }
}

const startTwoFactor = async () => {
  twoFactorMessage.value = ''
  try { twoFactorSetup.value = await accountSecurityApi.setupTwoFactor(twoFactorPassword.value) }
  catch { twoFactorMessage.value = 'Nao foi possivel iniciar o 2FA. Confira sua senha.' }
}

const confirmTwoFactor = async () => {
  try {
    const result = await accountSecurityApi.verifyTwoFactor(twoFactorCode.value)
    recoveryCodes.value = result.recoveryCodes
    twoFactorMessage.value = 'Autenticacao em duas etapas ativada.'
    twoFactorSetup.value = null
    twoFactorPassword.value = ''
    twoFactorCode.value = ''
    await loadProfile()
  } catch { twoFactorMessage.value = 'Codigo invalido ou expirado. Tente novamente.' }
}

const disableTwoFactor = async () => {
  if (!confirm('Desativar a autenticacao em duas etapas e encerrar a sessao atual?')) return
  try { await accountSecurityApi.disableTwoFactor(twoFactorPassword.value, twoFactorCode.value); await navigateTo('/login') }
  catch { twoFactorMessage.value = 'Nao foi possivel desativar. Confira a senha e o codigo.' }
}

const regenerateRecoveryCodes = async () => {
  if (!confirm('Gerar novos codigos de recuperacao invalida todos os codigos antigos. Continuar?')) return
  try {
    const result = await accountSecurityApi.regenerateRecoveryCodes(twoFactorPassword.value, twoFactorCode.value)
    recoveryCodes.value = result.recoveryCodes
    twoFactorMessage.value = 'Novos codigos de recuperacao gerados.'
    twoFactorPassword.value = ''
    twoFactorCode.value = ''
  } catch { twoFactorMessage.value = 'Nao foi possivel gerar novos codigos. Confira a senha e o codigo.' }
}

const recentPurchases = computed(() => purchases.value.slice(0, 3))
const recentRecharges = computed(() => recharges.value.slice(0, 3))

const loadProfile = async () => {
  try {
    account.value = await accountSecurityApi.profile()
  } catch {
    account.value = null
    message.value = 'Nao foi possivel carregar o perfil pela API.'
  }
}

const loadHistory = async () => {
  try {
    const [purchaseRows, rechargeRows] = await Promise.all([
      commerceApi.listAccountPurchases(),
      commerceApi.listAccountRecharges()
    ])
    purchases.value = purchaseRows
    recharges.value = rechargeRows
  } catch {
    purchases.value = []
    recharges.value = []
  }
}

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

const resetPasswordForm = () => {
  form.currentPassword = ''
  form.personalId = ''
  form.newPassword = ''
  form.repeatPassword = ''
}

const submitPasswordChange = async () => {
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

  try {
    await accountSecurityApi.changePassword({
      currentPassword: form.currentPassword,
      personalId: form.personalId,
      newPassword: form.newPassword
    })
    isSuccess.value = true
    message.value = 'Senha alterada com sucesso.'
    resetPasswordForm()
  } catch {
    isSuccess.value = false
    message.value = 'Nao foi possivel alterar a senha. Confira a senha atual e o Personal ID.'
  }
}
</script>

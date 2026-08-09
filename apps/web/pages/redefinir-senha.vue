<template>
  <section class="bm-container grid min-h-[calc(100vh-5rem)] place-items-center py-14">
    <div class="bm-liquid-shell w-full max-w-md p-6 sm:p-8">
      <p class="bm-kicker">Seguranca</p>
      <h1 class="bm-heading mt-2 font-display text-3xl font-bold">Redefinir senha</h1>

      <form
        v-if="status !== 'success' && tokenPresent"
        class="mt-6 grid gap-4"
        @submit.prevent="submitReset"
      >
        <input
          v-model="newPassword"
          class="bm-liquid-field px-4 py-3 text-sm outline-none transition focus:border-cyan-200/80"
          placeholder="Nova senha"
          type="password"
          autocomplete="new-password"
        />
        <input
          v-model="confirmPassword"
          class="bm-liquid-field px-4 py-3 text-sm outline-none transition focus:border-cyan-200/80"
          placeholder="Confirme a nova senha"
          type="password"
          autocomplete="new-password"
        />

        <p
          v-if="message"
          class="rounded-md border px-4 py-3 text-sm font-bold"
          :class="messageClass"
        >
          {{ message }}
        </p>

        <button
          class="bm-liquid-primary px-5 py-3 text-sm font-bold transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-60"
          :disabled="status === 'loading' || isBlockedError"
          type="submit"
        >
          {{ status === 'loading' ? 'Salvando...' : 'Redefinir senha' }}
        </button>

        <NuxtLink
          v-if="isBlockedError"
          class="bm-button-glass w-fit rounded-md px-5 py-3 text-center text-sm font-bold"
          to="/recuperar-conta"
        >
          Solicitar novo link
        </NuxtLink>
      </form>

      <div v-else-if="status === 'success'" class="mt-6 grid gap-5">
        <p
          class="rounded-md border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100"
        >
          {{ message }}
        </p>
        <NuxtLink
          class="bm-button-glass w-fit rounded-md px-5 py-3 text-center text-sm font-bold"
          to="/login"
        >
          Ir para o login
        </NuxtLink>
      </div>

      <div v-else class="mt-6 grid gap-5">
        <p
          class="rounded-md border border-blood-400/25 bg-blood-700/10 px-4 py-3 text-sm font-bold text-blood-100"
        >
          Este link de redefinicao e invalido.
        </p>
        <NuxtLink
          class="bm-button-glass w-fit rounded-md px-5 py-3 text-center text-sm font-bold"
          to="/recuperar-conta"
        >
          Solicitar novo link
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { resetPassword } = useAuth()
useSeoMeta({ title: 'Redefinir senha' })

type Status = 'idle' | 'loading' | 'success' | 'error'

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const tokenPresent = computed(() => token.value.length > 0)

const newPassword = ref('')
const confirmPassword = ref('')
const status = ref<Status>('idle')
const message = ref('')
const errorCode = ref<string | undefined>(undefined)

const blockedCodes = new Set(['TOKEN_EXPIRED', 'TOKEN_USED', 'TOKEN_INVALID'])
const isBlockedError = computed(
  () => status.value === 'error' && blockedCodes.has(errorCode.value || '')
)

const messageClass = computed(() =>
  status.value === 'error'
    ? 'border-blood-400/25 bg-blood-700/10 text-blood-100'
    : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
)

const submitReset = async () => {
  if (status.value === 'loading') return

  if (newPassword.value.length < 8 || newPassword.value.length > 72) {
    status.value = 'error'
    errorCode.value = 'PASSWORD_INVALID'
    message.value = 'A nova senha deve ter entre 8 e 72 caracteres.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    status.value = 'error'
    errorCode.value = undefined
    message.value = 'As senhas nao coincidem.'
    return
  }

  status.value = 'loading'
  try {
    const result = await resetPassword(token.value, newPassword.value)
    message.value = result.message
    errorCode.value = result.code
    status.value = result.ok ? 'success' : 'error'
    if (result.ok) {
      setTimeout(() => router.push('/login'), 2500)
    }
  } finally {
    if (status.value === 'loading') status.value = 'idle'
  }
}
</script>

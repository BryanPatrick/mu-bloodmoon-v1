<template>
  <section class="bm-container grid min-h-[calc(100vh-5rem)] place-items-center py-14">
    <div class="bm-liquid-shell w-full max-w-md p-6 sm:p-8">
      <p class="bm-kicker">{{ t('access') }}</p>
      <h1 class="bm-heading mt-2 font-display text-3xl font-bold">{{ t('login') }}</h1>
      <form class="mt-6 grid gap-4" @submit.prevent="submitLogin">
        <input
          v-model="username"
          class="bm-liquid-field px-4 py-3 text-sm outline-none transition focus:border-cyan-200/80"
          :placeholder="t('emailOrUser')"
          autocomplete="username"
        />
        <input
          v-model="password"
          class="bm-liquid-field px-4 py-3 text-sm outline-none transition focus:border-cyan-200/80"
          :placeholder="t('password')"
          autocomplete="current-password"
          type="password"
        />
        <template v-if="requiresTwoFactor">
          <input
            v-if="!useRecoveryCode"
            v-model="totpCode"
            class="bm-liquid-field px-4 py-3 text-sm outline-none transition focus:border-cyan-200/80"
            placeholder="Codigo de autenticacao (6 digitos)"
            autocomplete="one-time-code"
            inputmode="numeric"
            maxlength="6"
          />
          <input
            v-else
            v-model="recoveryCode"
            class="bm-liquid-field px-4 py-3 text-sm outline-none transition focus:border-cyan-200/80"
            placeholder="Codigo de recuperacao (XXXX-XXXX)"
            autocomplete="off"
          />
          <button
            class="w-fit text-xs font-bold text-white/55 transition hover:text-white"
            type="button"
            @click="useRecoveryCode = !useRecoveryCode"
          >
            {{ useRecoveryCode ? 'Usar codigo do aplicativo' : 'Perdeu o acesso? Usar codigo de recuperacao' }}
          </button>
        </template>

        <TurnstileWidget ref="captchaWidget" action="login" @token="captchaToken = $event" />

        <p
          v-if="message"
          class="rounded-md border px-4 py-3 text-sm font-bold"
          :class="messageClass"
        >
          {{ message }}
        </p>

        <button
          class="bm-liquid-primary px-5 py-3 text-sm font-bold transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-60"
          :disabled="isSubmitting"
          type="submit"
        >
          {{ isSubmitting ? 'Entrando...' : t('enter') }}
        </button>

        <div
          class="flex flex-col gap-2 text-sm font-bold sm:flex-row sm:items-center sm:justify-between"
        >
          <NuxtLink class="text-white/65 transition hover:text-white" to="/recuperar-conta"
            >Recuperar conta</NuxtLink
          >
          <NuxtLink class="text-blood-200 transition hover:text-white" to="/registrar"
            >Criar conta</NuxtLink
          >
        </div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
const { t } = useLocale()
const router = useRouter()
const route = useRoute()
const { loginWithCredentials } = useAuth()
useSeoMeta({ title: () => t('login') })

const username = ref('')
const password = ref('')
const totpCode = ref('')
const recoveryCode = ref('')
const useRecoveryCode = ref(false)
const requiresTwoFactor = ref(false)
const message = ref('')
const isSuccess = ref(false)
const isSubmitting = ref(false)
const captchaToken = ref('')
const captchaWidget = ref<{ reset(): void } | null>(null)

const messageClass = computed(() =>
  isSuccess.value
    ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
    : 'border-blood-400/25 bg-blood-700/10 text-blood-100'
)

const submitLogin = async () => {
  if (isSubmitting.value) {
    return
  }

  if (!captchaToken.value) {
    isSuccess.value = false
    message.value = 'Conclua a verificacao de seguranca.'
    return
  }

  isSubmitting.value = true
  try {
    const result = await loginWithCredentials(
      username.value,
      password.value,
      useRecoveryCode.value ? undefined : totpCode.value,
      captchaToken.value,
      useRecoveryCode.value ? recoveryCode.value : undefined
    )
    isSuccess.value = result.ok
    message.value = result.message
    requiresTwoFactor.value = Boolean(result.requiresTwoFactor)

    if (result.ok) {
      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
      await router.push(redirect)
    } else {
      captchaWidget.value?.reset()
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

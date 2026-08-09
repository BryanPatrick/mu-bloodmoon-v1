<template>
  <section class="bm-container grid min-h-[calc(100vh-5rem)] place-items-center py-14">
    <div class="bm-liquid-shell w-full max-w-md p-6 sm:p-8">
      <p class="bm-kicker">Seguranca</p>
      <h1 class="bm-heading mt-2 font-display text-3xl font-bold">Recuperar conta</h1>

      <form v-if="status !== 'success'" class="mt-6 grid gap-4" @submit.prevent="submitRequest">
        <p class="text-sm text-white/65">
          Informe o e-mail da sua conta. Se ele estiver cadastrado, enviaremos um link para
          redefinir sua senha.
        </p>
        <input
          v-model="email"
          class="bm-liquid-field px-4 py-3 text-sm outline-none transition focus:border-cyan-200/80"
          placeholder="Seu e-mail"
          type="email"
          autocomplete="email"
        />

        <TurnstileWidget ref="captchaWidget" action="recovery" @token="captchaToken = $event" />

        <p
          v-if="message"
          class="rounded-md border px-4 py-3 text-sm font-bold"
          :class="messageClass"
        >
          {{ message }}
        </p>

        <button
          class="bm-liquid-primary px-5 py-3 text-sm font-bold transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-60"
          :disabled="status === 'loading'"
          type="submit"
        >
          {{ status === 'loading' ? 'Enviando...' : 'Enviar link de recuperacao' }}
        </button>

        <NuxtLink
          class="w-fit text-sm font-bold text-white/65 transition hover:text-white"
          to="/login"
        >
          Voltar ao login
        </NuxtLink>
      </form>

      <div v-else class="mt-6 grid gap-5">
        <p
          class="rounded-md border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100"
        >
          {{ message }}
        </p>
        <NuxtLink
          class="bm-button-glass w-fit rounded-md px-5 py-3 text-center text-sm font-bold"
          to="/login"
        >
          Voltar ao login
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const { requestPasswordRecovery } = useAuth()
useSeoMeta({ title: 'Recuperar conta' })

type Status = 'idle' | 'loading' | 'success' | 'error'

const email = ref('')
const captchaToken = ref('')
const captchaWidget = ref<{ reset(): void } | null>(null)
const status = ref<Status>('idle')
const message = ref('')

const messageClass = computed(() =>
  status.value === 'error'
    ? 'border-blood-400/25 bg-blood-700/10 text-blood-100'
    : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
)

const submitRequest = async () => {
  if (status.value === 'loading') return

  if (!captchaToken.value) {
    status.value = 'error'
    message.value = 'Conclua a verificacao de seguranca.'
    return
  }

  status.value = 'loading'
  try {
    const result = await requestPasswordRecovery(email.value.trim(), captchaToken.value)
    message.value = result.message
    status.value = result.ok ? 'success' : 'error'
    if (!result.ok) captchaWidget.value?.reset()
  } finally {
    if (status.value === 'loading') status.value = 'idle'
  }
}
</script>

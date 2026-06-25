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
        >
        <input
          v-model="password"
          class="bm-liquid-field px-4 py-3 text-sm outline-none transition focus:border-cyan-200/80"
          :placeholder="t('password')"
          autocomplete="current-password"
          type="password"
        >

        <p v-if="message" class="rounded-md border px-4 py-3 text-sm font-bold" :class="messageClass">
          {{ message }}
        </p>

        <button class="bm-liquid-primary px-5 py-3 text-sm font-bold transition hover:scale-[1.01]" type="submit">{{ t('enter') }}</button>

        <div class="flex flex-col gap-2 text-sm font-bold sm:flex-row sm:items-center sm:justify-between">
          <NuxtLink class="text-white/65 transition hover:text-white" to="/recuperar-conta">Recuperar conta</NuxtLink>
          <NuxtLink class="text-blood-200 transition hover:text-white" to="/registrar">Criar conta</NuxtLink>
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
const message = ref('')
const isSuccess = ref(false)

const messageClass = computed(() =>
  isSuccess.value
    ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
    : 'border-blood-400/25 bg-blood-700/10 text-blood-100'
)

const submitLogin = () => {
  const result = loginWithCredentials(username.value, password.value)
  isSuccess.value = result.ok
  message.value = result.message

  if (result.ok) {
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.push(redirect)
  }
}
</script>

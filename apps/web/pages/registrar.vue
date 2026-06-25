<template>
  <section class="bm-container grid min-h-[calc(100vh-5rem)] place-items-center py-14">
    <div class="bm-liquid-shell w-full max-w-5xl p-6 sm:p-8">
      <p class="bm-kicker">{{ t('newAccount') }}</p>
      <h1 class="bm-heading mt-2 font-display text-3xl font-bold">{{ t('register') }}</h1>
      <form class="mt-6 grid gap-5" @submit.prevent="submitRegistration">
        <div class="grid gap-4 md:grid-cols-2">
          <label v-for="field in registrationFields" :key="field.model" class="grid gap-2 text-sm font-bold text-white/75">
            <span>{{ field.label }} <strong v-if="field.required" class="text-blood-300">*</strong></span>
            <input
              v-model="form[field.model]"
              class="bm-liquid-field px-4 py-3 text-sm outline-none transition focus:border-cyan-200/80"
              :autocomplete="field.autocomplete"
              :type="field.type"
            >
          </label>
        </div>

        <div class="grid gap-3 md:max-w-xs">
          <div class="flex items-center gap-4">
            <div class="select-none rounded-3xl border border-white/40 bg-white/75 px-5 py-2 font-display text-2xl font-black italic tracking-widest text-blue-800 shadow-soft -rotate-6">
              {{ captchaCode }}
            </div>
            <button class="bm-button-glass grid size-10 place-items-center text-lg font-black" type="button" aria-label="Atualizar captcha" @click="refreshCaptcha">
              C
            </button>
          </div>
          <input
            v-model="form.captcha"
            class="bm-liquid-field px-4 py-3 text-sm outline-none transition focus:border-cyan-200/80"
            placeholder="Digite o codigo acima"
          >
        </div>

        <label class="flex items-start gap-3 text-sm font-semibold text-white/72">
          <input v-model="form.terms" class="mt-1 size-4 accent-blood-600" type="checkbox">
          <span>Eu concordo com os termos de uso <strong class="text-blood-300">*</strong></span>
        </label>

        <p v-if="message" class="rounded-md border px-4 py-3 text-sm font-bold" :class="messageClass">
          {{ message }}
        </p>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button class="bm-liquid-primary px-5 py-3 text-sm font-bold transition hover:scale-[1.01]" type="submit">
            {{ t('createAccount') }}
          </button>
          <NuxtLink class="bm-button-glass px-5 py-3 text-center text-sm font-bold" to="/login">
            Ja tenho conta
          </NuxtLink>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
const { t } = useLocale()
useSeoMeta({ title: () => t('register') })

type RegistrationField = {
  label: string
  model: 'name' | 'username' | 'password' | 'repeatPassword' | 'personalId' | 'email' | 'repeatEmail' | 'reference'
  type: string
  autocomplete: string
  required?: boolean
}

const captchaOptions = ['A9K2M', 'BM7Q4', 'N0RIA', 'DL6X8']
const captchaCode = ref(captchaOptions[0])
const message = ref('')
const isSuccess = ref(false)

const form = reactive({
  name: '',
  username: '',
  password: '',
  repeatPassword: '',
  personalId: '',
  email: '',
  repeatEmail: '',
  reference: '',
  captcha: '',
  terms: false
})

const registrationFields: RegistrationField[] = [
  { label: 'Nome', model: 'name', type: 'text', autocomplete: 'name', required: true },
  { label: 'Usuario', model: 'username', type: 'text', autocomplete: 'username', required: true },
  { label: 'Senha', model: 'password', type: 'password', autocomplete: 'new-password', required: true },
  { label: 'Repetir senha', model: 'repeatPassword', type: 'password', autocomplete: 'new-password', required: true },
  { label: 'Personal ID', model: 'personalId', type: 'text', autocomplete: 'off', required: true },
  { label: 'E-mail', model: 'email', type: 'email', autocomplete: 'email', required: true },
  { label: 'Repetir o e-mail', model: 'repeatEmail', type: 'email', autocomplete: 'email', required: true },
  { label: 'Referencia / Indicacao', model: 'reference', type: 'text', autocomplete: 'off' }
]

const messageClass = computed(() =>
  isSuccess.value
    ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
    : 'border-blood-400/25 bg-blood-700/10 text-blood-100'
)

const refreshCaptcha = () => {
  const currentIndex = captchaOptions.indexOf(captchaCode.value)
  captchaCode.value = captchaOptions[(currentIndex + 1) % captchaOptions.length]
  form.captcha = ''
}

const submitRegistration = () => {
  const requiredFields = registrationFields.some((field) => field.required && !form[field.model].trim())

  if (requiredFields || !form.captcha.trim() || !form.terms) {
    isSuccess.value = false
    message.value = 'Preencha todos os campos obrigatorios e aceite os termos de uso.'
    return
  }

  if (form.password !== form.repeatPassword) {
    isSuccess.value = false
    message.value = 'As senhas informadas nao conferem.'
    return
  }

  if (form.email !== form.repeatEmail) {
    isSuccess.value = false
    message.value = 'Os e-mails informados nao conferem.'
    return
  }

  if (form.captcha.trim().toUpperCase() !== captchaCode.value.toUpperCase()) {
    isSuccess.value = false
    message.value = 'Codigo de seguranca incorreto.'
    return
  }

  isSuccess.value = true
  message.value = 'Cadastro validado para teste. A integracao real com banco de dados entra na etapa de backend.'
}
</script>

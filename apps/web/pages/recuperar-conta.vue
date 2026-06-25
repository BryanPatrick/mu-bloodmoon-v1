<template>
  <section class="bm-container grid min-h-[calc(100vh-5rem)] place-items-center py-14">
    <div class="bm-panel w-full max-w-2xl rounded-md p-6">
      <p class="bm-kicker">Seguranca</p>
      <h1 class="bm-heading mt-2 font-display text-3xl font-bold">Recuperar conta</h1>

      <form class="mt-6 grid gap-5" @submit.prevent="submitRecovery">
        <label class="grid gap-2 text-sm font-bold text-white/75">
          <span>E-mail cadastrado <strong class="text-blood-300">*</strong></span>
          <input
            v-model="form.email"
            class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm text-white outline-none transition focus:border-blood-400"
            autocomplete="email"
            type="email"
          >
        </label>

        <label class="grid gap-2 text-sm font-bold text-white/75">
          <span>Tipo de recuperacao</span>
          <select
            v-model="form.recoveryType"
            class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm text-white outline-none transition focus:border-blood-400"
          >
            <option value="password">Recuperar senha</option>
            <option value="personal-id">Recuperar Personal ID</option>
          </select>
        </label>

        <p v-if="message" class="rounded-md border px-4 py-3 text-sm font-bold" :class="messageClass">
          {{ message }}
        </p>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button class="rounded-md bg-blood-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blood-500" type="submit">
            Enviar recuperacao
          </button>
          <NuxtLink class="bm-button-glass rounded-md px-5 py-3 text-center text-sm font-bold" to="/login">
            Voltar ao login
          </NuxtLink>
        </div>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
useSeoMeta({ title: 'Recuperar conta' })

const form = reactive({
  email: '',
  recoveryType: 'password'
})

const message = ref('')
const isSuccess = ref(false)

const messageClass = computed(() =>
  isSuccess.value
    ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
    : 'border-blood-400/25 bg-blood-700/10 text-blood-100'
)

const submitRecovery = () => {
  if (!form.email.trim()) {
    isSuccess.value = false
    message.value = 'Informe o e-mail cadastrado para continuar.'
    return
  }

  isSuccess.value = true
  message.value = 'Solicitacao registrada para teste. As instrucoes seriam enviadas para o e-mail cadastrado.'
}
</script>

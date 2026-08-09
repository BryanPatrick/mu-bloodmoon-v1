<template>
  <div class="grid min-h-16 gap-2">
    <div ref="container" />
    <p v-if="loadError" class="text-sm font-semibold text-blood-200">
      A verificacao de seguranca nao carregou. Atualize a pagina e tente novamente.
    </p>
  </div>
</template>

<script setup lang="ts">
type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string
  reset(widgetId?: string): void
  remove(widgetId: string): void
}

const props = defineProps<{
  action: 'login' | 'register' | 'recovery'
}>()
const emit = defineEmits<{
  token: [value: string]
}>()
const config = useRuntimeConfig()
const container = ref<HTMLElement | null>(null)
const loadError = ref(false)
let widgetId = ''

useHead({
  script: [
    {
      key: 'cloudflare-turnstile',
      src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
      async: true,
      defer: true
    }
  ]
})

const api = () => (window as typeof window & { turnstile?: TurnstileApi }).turnstile

const waitForApi = async () => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (api()) return api()
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  return undefined
}

const renderWidget = async () => {
  const sitekey = String(config.public.turnstileSiteKey || '').trim()
  if (!sitekey || !container.value) {
    loadError.value = true
    return
  }
  const turnstile = await waitForApi()
  if (!turnstile || !container.value) {
    loadError.value = true
    return
  }
  widgetId = turnstile.render(container.value, {
    sitekey,
    action: props.action,
    theme: 'dark',
    callback: (token: string) => emit('token', token),
    'expired-callback': () => emit('token', ''),
    'error-callback': () => {
      emit('token', '')
      loadError.value = true
    }
  })
}

const reset = () => {
  emit('token', '')
  if (widgetId) api()?.reset(widgetId)
}

onMounted(() => void renderWidget())
onBeforeUnmount(() => {
  if (widgetId) api()?.remove(widgetId)
})

defineExpose({ reset })
</script>

<script setup lang="ts">
const props = defineProps<{ open: boolean; targetType: 'post' | 'comment'; targetId: string }>()
const emit = defineEmits<{ 'update:open': [boolean] }>()
const api = useCommunityApi()
const toast = useToast()

// The backend (CommunityReportPayload / community.service.ts's report())
// has no reason enum at all -- `reason` is free text, only validated as
// >=3 chars trimmed. This list is a frontend-only convenience selection,
// not a shared contract: submitting sends the selected label itself as
// `reason`. "Outro" has no fixed label, so it requires the details field
// to be filled in and sends that text as `reason` instead.
const reasonOptions = [
  { label: 'Conteúdo ofensivo ou discurso de ódio', value: 'offensive' },
  { label: 'Assédio ou bullying', value: 'harassment' },
  { label: 'Spam ou golpe', value: 'spam' },
  { label: 'Nudez ou conteúdo sexual', value: 'nudity' },
  { label: 'Violência', value: 'violence' },
  { label: 'Informação falsa', value: 'misinformation' },
  { label: 'Outro', value: 'other' }
]
const reasonValue = ref(reasonOptions[0]!.value)
const details = ref('')
const submitting = ref(false)
const error = ref<string | null>(null)
const done = ref(false)

const targetLabel = computed(() => (props.targetType === 'post' ? 'publicação' : 'comentário'))
const isOther = computed(() => reasonValue.value === 'other')

const reset = () => {
  reasonValue.value = reasonOptions[0]!.value
  details.value = ''
  error.value = null
  done.value = false
}
watch(() => props.open, (isOpen) => { if (isOpen) reset() })

const close = () => emit('update:open', false)

const submit = async () => {
  if (submitting.value) return
  const selected = reasonOptions.find((option) => option.value === reasonValue.value)
  const reason = isOther.value ? details.value.trim() : selected?.label || ''
  if (!reason || reason.length < 3) {
    error.value = 'Informe o motivo da denúncia.'
    return
  }
  submitting.value = true
  error.value = null
  try {
    await api.report({
      [props.targetType === 'post' ? 'postId' : 'commentId']: props.targetId,
      reason,
      ...(!isOther.value && details.value.trim() ? { description: details.value.trim() } : {})
    })
    done.value = true
  } catch (err: any) {
    // Same status-reading pattern as pages/comunidade/[username].vue --
    // err?.data?.message is the exact, already-safe message
    // SafeExceptionFilter sends (e.g. "Você já possui uma denúncia aberta
    // para este conteúdo.", "Você não pode denunciar seu próprio
    // conteúdo.") -- shown as-is, never a stack trace or internal detail.
    const status = err?.response?.status || err?.statusCode || err?.status
    const message = err?.data?.message || err?.message
    error.value = status === 401
      ? 'Você precisa estar autenticado para denunciar.'
      : status === 403
        ? 'Você não tem permissão para realizar esta ação.'
        : status === 404
          ? 'Este conteúdo não existe mais.'
          : status === 429
            ? 'Muitas tentativas. Aguarde um momento e tente novamente.'
            : message || 'Não foi possível enviar a denúncia agora. Tente novamente.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal :open="open" :title="`Denunciar ${targetLabel}`" description="A denúncia será enviada para análise da equipe de moderação." :ui="{ content: 'max-w-md' }" @update:open="(value) => emit('update:open', value)">
    <template #body>
      <div v-if="done" class="community-report-done">
        <p>Denúncia enviada. Nossa equipe irá analisá-la.</p>
        <UButton color="neutral" variant="soft" @click="close">Fechar</UButton>
      </div>
      <form v-else class="community-report-form" @submit.prevent="submit">
        <label>Motivo
          <USelect v-model="reasonValue" :items="reasonOptions" value-key="value" :disabled="submitting" />
        </label>
        <label>{{ isOther ? 'Descreva o motivo' : 'Detalhes adicionais (opcional)' }}
          <UTextarea v-model="details" :rows="3" maxlength="2000" :disabled="submitting" :placeholder="isOther ? 'Explique o motivo da denúncia' : 'Detalhes adicionais, se necessário'" />
        </label>
        <p v-if="error" class="community-report-error" role="alert">{{ error }}</p>
        <div class="community-report-actions">
          <UButton type="button" color="neutral" variant="soft" :disabled="submitting" @click="close">Cancelar</UButton>
          <UButton type="submit" color="error" :loading="submitting" :disabled="submitting">Enviar denúncia</UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>

<style scoped>
.community-report-form{display:grid;gap:12px}
.community-report-form label{display:grid;gap:5px;color:var(--bm-muted);font-size:.62rem;font-weight:800}
.community-report-error{margin:0;border:1px solid var(--bm-red);border-radius:6px;background:rgb(191 2 2/.08);padding:9px 12px;color:var(--bm-red);font-size:.68rem;font-weight:700}
.community-report-actions{display:flex;justify-content:flex-end;gap:8px}
.community-report-done{display:grid;justify-items:start;gap:12px;padding:6px 0}
.community-report-done p{color:var(--bm-text);font-size:.76rem}
</style>

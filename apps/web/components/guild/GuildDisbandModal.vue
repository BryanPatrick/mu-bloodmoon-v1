<script setup lang="ts">
import { ShieldAlert, X } from 'lucide-vue-next'

const props = defineProps<{ guild: Record<string, any>; slug: string }>()
const emit = defineEmits<{ close: []; disbanded: [] }>()
const api = useGuildsApi()
const accountSecurityApi = useAccountSecurityApi()
const { user } = useAuth()

// Step-up is required by the backend (StepUpGuard) regardless of whether
// this account has 2FA enabled -- authService.stepUp() itself only demands
// a TOTP/recovery code when twoFactorEnabled is true, falling back to
// password-only otherwise, so this never locks a leader out. Same
// composable/flow already used by painel/conta.vue's revoke-all-sessions.
const twoFactorEnabled = computed(() => Boolean(user.value?.twoFactorEnabled))

const currentPassword = ref('')
const code = ref('')
const confirmText = ref('')
const submitting = ref(false)
const error = ref('')

const confirmMatches = computed(() => {
  const value = confirmText.value.trim().toUpperCase()
  if (!value) return false
  return value === props.guild.name?.toUpperCase() || value === props.guild.tag?.toUpperCase()
})
const formValid = computed(() => confirmMatches.value && currentPassword.value.length > 0)

const submit = async () => {
  if (submitting.value || !formValid.value) return
  submitting.value = true
  error.value = ''
  try {
    const isRecoveryFormat = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code.value.trim())
    const stepUpResult = await accountSecurityApi.stepUp(
      currentPassword.value,
      isRecoveryFormat ? undefined : (code.value.trim() || undefined),
      isRecoveryFormat ? code.value.trim() : undefined
    )
    await api.disband(props.slug, confirmText.value.trim(), stepUpResult.stepUpToken)
    emit('disbanded')
    emit('close')
  } catch (err: any) {
    error.value = err?.data?.message || 'Não foi possível encerrar a guilda. Verifique sua senha e tente novamente.'
  } finally {
    submitting.value = false
  }
}

const requestClose = () => {
  if (submitting.value) return
  emit('close')
}
const onKeydown = (event: KeyboardEvent) => { if (event.key === 'Escape') requestClose() }
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div class="disband-backdrop" @click.self="requestClose">
      <form class="disband-modal" role="alertdialog" aria-labelledby="disband-modal-title" @submit.prevent="submit">
        <header>
          <ShieldAlert class="size-5" />
          <h2 id="disband-modal-title">Encerrar guilda</h2>
          <UButton color="neutral" variant="ghost" square aria-label="Fechar" :disabled="submitting" @click="requestClose"><X class="size-4" /></UButton>
        </header>

        <div class="disband-modal__body">
          <p>
            Você está prestes a encerrar permanentemente <strong>{{ guild.name }}</strong> [{{ guild.tag }}].
          </p>
          <ul>
            <li>A guilda deixa de aparecer no diretório e não pode mais receber novos membros.</li>
            <li>Todos os convites e solicitações de entrada pendentes são cancelados imediatamente.</li>
            <li>Membros, tesouraria e histórico são preservados -- nada é apagado.</li>
            <li>Esta ação não pode ser desfeita por você.</li>
          </ul>

          <label>
            Senha atual
            <input v-model="currentPassword" type="password" autocomplete="current-password" required>
          </label>
          <label v-if="twoFactorEnabled">
            Código do autenticador ou recuperação
            <input v-model="code" autocomplete="one-time-code" required>
          </label>
          <label>
            Digite <strong>{{ guild.name }}</strong> ou <strong>{{ guild.tag }}</strong> para confirmar
            <input v-model="confirmText" placeholder="Nome ou tag da guilda">
          </label>

          <p v-if="error" class="disband-modal__error" role="alert">{{ error }}</p>
        </div>

        <footer>
          <UButton color="neutral" variant="soft" :disabled="submitting" @click="requestClose">Cancelar</UButton>
          <UButton color="error" type="submit" :loading="submitting" :disabled="submitting || !formValid">
            {{ submitting ? 'Encerrando...' : 'Encerrar guilda' }}
          </UButton>
        </footer>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.disband-backdrop { position: fixed; z-index: 120; inset: 0; display: grid; place-items: center; background: rgb(16 16 16 / 0.6); padding: 18px; backdrop-filter: blur(3px); }
.disband-modal { width: min(460px, 100%); max-height: min(700px, 92vh); overflow-y: auto; border: 1px solid var(--bm-red); border-radius: 10px; background: var(--bm-surface-strong); box-shadow: 0 24px 70px rgb(0 0 0 / 0.4); color: var(--bm-text); }
.disband-modal > header { display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--bm-border); padding: 14px 18px; color: var(--bm-red); }
.disband-modal > header h2 { flex: 1; font-family: Cinzel, serif; font-size: 1rem; }
.disband-modal__body { display: grid; gap: 12px; padding: 16px 18px; font-size: 0.78rem; color: var(--bm-text); line-height: 1.55; }
.disband-modal__body ul { display: grid; gap: 6px; padding-left: 18px; color: var(--bm-muted); font-size: 0.72rem; }
.disband-modal__body li { list-style: disc; }
.disband-modal__body label { display: grid; gap: 5px; color: var(--bm-muted); font-size: 0.62rem; font-weight: 800; }
.disband-modal__body input { min-height: 38px; border: 1px solid var(--bm-border); border-radius: 6px; background: var(--bm-surface); padding: 8px 10px; outline: none; color: var(--bm-text); font-size: 0.76rem; }
.disband-modal__body input:focus { border-color: var(--bm-red); }
.disband-modal__error { border: 1px solid var(--bm-red); border-radius: 6px; background: rgb(191 2 2 / 0.08); padding: 8px 10px; color: var(--bm-red); font-size: 0.7rem; font-weight: 700; }
.disband-modal > footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--bm-border); padding: 12px 18px; }
@media (max-width: 480px) {
  .disband-backdrop { padding: 10px; }
  .disband-modal > footer { flex-direction: column-reverse; }
  .disband-modal > footer > * { width: 100%; }
}
</style>

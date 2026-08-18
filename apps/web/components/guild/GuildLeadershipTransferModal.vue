<script setup lang="ts">
import { ShieldAlert, X } from 'lucide-vue-next'

const props = defineProps<{ guild: Record<string, any>; slug: string; member: Record<string, any> }>()
const emit = defineEmits<{ close: []; transferred: [] }>()
const api = useGuildsApi()

const submitting = ref(false)
const error = ref('')

// No "type the guild name to confirm" pattern exists anywhere else in the
// portal for critical actions (admin panels use a plain confirm() dialog) --
// this modal's explicit, informational confirm step is already the
// strongest existing precedent, reused here rather than inventing a new
// confirmation mechanic for just this one action.
const confirmTransfer = async () => {
  if (submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    // Reuses the existing atomic transfer endpoint (updateMemberRole with
    // roleKey: 'LEADER') -- no new backend contract. The backend remains the
    // final authority: if the target was removed or the acting user is no
    // longer LEADER by the time this lands, it rejects cleanly and nothing
    // here treats that as a success.
    await api.updateMemberRole(props.slug, props.member.id, { roleKey: 'LEADER' })
    emit('transferred')
    emit('close')
  } catch (err: any) {
    error.value = err?.data?.message || 'Não foi possível transferir a liderança. Tente novamente.'
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
    <div class="transfer-backdrop" @click.self="requestClose">
      <div class="transfer-modal" role="alertdialog" aria-labelledby="transfer-modal-title">
        <header>
          <ShieldAlert class="size-5" />
          <h2 id="transfer-modal-title">Transferir liderança</h2>
          <UButton color="neutral" variant="ghost" square aria-label="Fechar" :disabled="submitting" @click="requestClose"><X class="size-4" /></UButton>
        </header>

        <div class="transfer-modal__body">
          <p>
            Você está prestes a transferir a liderança de <strong>{{ guild.name }}</strong> para
            <strong>{{ member.character?.name }}</strong>.
          </p>
          <ul>
            <li><strong>{{ member.character?.name }}</strong> passa a ser o novo LÍDER da guilda.</li>
            <li>Você será rebaixado para OFFICER imediatamente.</li>
            <li>Esta ação altera a autoridade máxima da guilda e não pode ser desfeita por você sozinho -- apenas o novo líder poderá transferir de volta.</li>
          </ul>
          <p v-if="error" class="transfer-modal__error" role="alert">{{ error }}</p>
        </div>

        <footer>
          <UButton color="neutral" variant="soft" :disabled="submitting" @click="requestClose">Cancelar</UButton>
          <UButton color="error" :loading="submitting" :disabled="submitting" @click="confirmTransfer">
            {{ submitting ? 'Transferindo...' : 'Confirmar transferência' }}
          </UButton>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.transfer-backdrop { position: fixed; z-index: 110; inset: 0; display: grid; place-items: center; background: rgb(16 16 16 / 0.6); padding: 18px; backdrop-filter: blur(3px); }
.transfer-modal { width: min(440px, 100%); border: 1px solid var(--bm-red); border-radius: 10px; background: var(--bm-surface-strong); box-shadow: 0 24px 70px rgb(0 0 0 / 0.4); color: var(--bm-text); }
.transfer-modal > header { display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--bm-border); padding: 14px 18px; color: var(--bm-red); }
.transfer-modal > header h2 { flex: 1; font-family: Cinzel, serif; font-size: 1rem; }
.transfer-modal__body { display: grid; gap: 10px; padding: 16px 18px; font-size: 0.78rem; color: var(--bm-text); line-height: 1.55; }
.transfer-modal__body ul { display: grid; gap: 6px; padding-left: 18px; color: var(--bm-muted); font-size: 0.74rem; }
.transfer-modal__body li { list-style: disc; }
.transfer-modal__error { border: 1px solid var(--bm-red); border-radius: 6px; background: rgb(191 2 2 / 0.08); padding: 8px 10px; color: var(--bm-red); font-size: 0.7rem; font-weight: 700; }
.transfer-modal > footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--bm-border); padding: 12px 18px; }
@media (max-width: 480px) {
  .transfer-backdrop { padding: 10px; }
  .transfer-modal > footer { flex-direction: column-reverse; }
  .transfer-modal > footer > * { width: 100%; }
}
</style>

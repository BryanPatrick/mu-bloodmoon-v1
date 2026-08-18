<script setup lang="ts">
import { Shield, X } from 'lucide-vue-next'

const emit = defineEmits<{ close: []; created: [{ slug: string }] }>()
const api = useGuildsApi()
const charactersApi = useCharactersApi()
const router = useRouter()

// Minimal form per spec: name + tag only, plus the character picker the
// backend requires (createGuildSelfService needs a leaderCharacterId).
// Everything else (description, focus tags, recruitment mode, emblem,
// banner) is left to the profile editor that already exists (Guild Step
// 1/5) -- not duplicated here.
const form = reactive({ name: '', tag: '', leaderCharacterId: '' })

const loadingCharacters = ref(true)
const eligibleCharacters = ref<any[]>([])
const loadError = ref('')

onMounted(async () => {
  try {
    const [charactersResult, myGuilds] = await Promise.all([charactersApi.list(), api.mine()])
    const activeCharacterIds = new Set((myGuilds as any[]).map((membership) => membership.character?.id).filter(Boolean))
    eligibleCharacters.value = charactersResult.data.filter((character: any) => !activeCharacterIds.has(character.id))
    if (eligibleCharacters.value.length === 1) form.leaderCharacterId = eligibleCharacters.value[0].id
  } catch {
    loadError.value = 'Não foi possível carregar seus personagens agora.'
  } finally {
    loadingCharacters.value = false
  }
})

const nameError = computed(() => {
  const value = form.name.trim()
  if (!value) return null
  if (value.length < 3 || value.length > 100) return 'O nome deve ter entre 3 e 100 caracteres.'
  return null
})
const tagError = computed(() => {
  const value = form.tag.trim()
  if (!value) return null
  if (value.length < 2 || value.length > 10) return 'A tag deve ter entre 2 e 10 caracteres.'
  return null
})
const formValid = computed(() =>
  form.name.trim().length >= 3 && form.tag.trim().length >= 2 && !nameError.value && !tagError.value && Boolean(form.leaderCharacterId)
)

const creating = ref(false)
const createError = ref('')
const submit = async () => {
  if (creating.value || !formValid.value) return
  creating.value = true
  createError.value = ''
  try {
    const guild = await api.create({
      name: form.name.trim(),
      tag: form.tag.trim().toUpperCase(),
      leaderCharacterId: form.leaderCharacterId
    }) as any
    emit('created', { slug: guild.slug })
    await router.push(`/guild/${guild.slug}`)
  } catch (err: any) {
    createError.value = err?.data?.message || 'Não foi possível criar a guilda.'
  } finally {
    creating.value = false
  }
}

const requestClose = () => {
  if (creating.value) return
  emit('close')
}
const onKeydown = (event: KeyboardEvent) => { if (event.key === 'Escape') requestClose() }
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div class="create-guild-backdrop" @click.self="requestClose">
      <form class="create-guild-modal" role="dialog" aria-labelledby="create-guild-modal-title" @submit.prevent="submit">
        <header>
          <Shield class="size-5" />
          <h2 id="create-guild-modal-title">Criar guilda</h2>
          <UButton color="neutral" variant="ghost" square aria-label="Fechar" :disabled="creating" @click="requestClose"><X class="size-4" /></UButton>
        </header>

        <div class="create-guild-modal__body">
          <div v-if="loadingCharacters" class="create-guild-modal__status">Carregando seus personagens...</div>
          <div v-else-if="loadError" class="create-guild-modal__status">{{ loadError }}</div>
          <div v-else-if="!eligibleCharacters.length" class="create-guild-modal__status">
            Você precisa de um personagem que ainda não pertença a nenhuma guilda para criar uma nova.
          </div>
          <template v-else>
            <label>
              Nome
              <input v-model="form.name" maxlength="100" required placeholder="Nome da guilda">
              <small v-if="nameError" class="create-guild-modal__field-error">{{ nameError }}</small>
            </label>
            <label>
              Tag
              <input v-model="form.tag" maxlength="10" required style="text-transform: uppercase" placeholder="TAG">
              <small v-if="tagError" class="create-guild-modal__field-error">{{ tagError }}</small>
            </label>
            <label>
              Personagem líder
              <select v-model="form.leaderCharacterId" required>
                <option value="" disabled>Selecione um personagem</option>
                <option v-for="character in eligibleCharacters" :key="character.id" :value="character.id">{{ character.name }} ({{ character.class }})</option>
              </select>
              <small>Você será o líder inicial. Descrição, emblema, banner e recrutamento podem ser ajustados depois no perfil da guilda.</small>
            </label>
          </template>
          <p v-if="createError" class="create-guild-modal__field-error" role="alert">{{ createError }}</p>
        </div>

        <footer>
          <UButton color="neutral" variant="soft" :disabled="creating" @click="requestClose">Cancelar</UButton>
          <UButton color="error" type="submit" :loading="creating" :disabled="creating || !formValid">
            {{ creating ? 'Criando...' : 'Criar guilda' }}
          </UButton>
        </footer>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.create-guild-backdrop { position: fixed; z-index: 110; inset: 0; display: grid; place-items: center; background: rgb(16 16 16 / 0.55); padding: 18px; backdrop-filter: blur(3px); }
.create-guild-modal { width: min(440px, 100%); border: 1px solid var(--bm-border-strong); border-radius: 10px; background: var(--bm-surface-strong); box-shadow: 0 24px 70px rgb(0 0 0 / 0.35); color: var(--bm-text); }
.create-guild-modal > header { display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--bm-border); padding: 14px 18px; color: var(--bm-red); }
.create-guild-modal > header h2 { flex: 1; font-family: Cinzel, serif; font-size: 1rem; }
.create-guild-modal__body { display: grid; gap: 12px; padding: 16px 18px; }
.create-guild-modal__body label { display: grid; gap: 5px; color: var(--bm-muted); font-size: 0.62rem; font-weight: 800; }
.create-guild-modal__body input, .create-guild-modal__body select { min-height: 38px; border: 1px solid var(--bm-border); border-radius: 6px; background: var(--bm-surface); padding: 8px 10px; outline: none; color: var(--bm-text); font-size: 0.76rem; }
.create-guild-modal__body input:focus, .create-guild-modal__body select:focus { border-color: var(--bm-red); }
.create-guild-modal__field-error { color: var(--bm-red); font-weight: 800; font-size: 0.66rem; }
.create-guild-modal__status { padding: 10px 0; color: var(--bm-muted); font-size: 0.78rem; text-align: center; }
.create-guild-modal > footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--bm-border); padding: 12px 18px; }
@media (max-width: 480px) {
  .create-guild-backdrop { padding: 10px; }
  .create-guild-modal > footer { flex-direction: column-reverse; }
  .create-guild-modal > footer > * { width: 100%; }
}
</style>

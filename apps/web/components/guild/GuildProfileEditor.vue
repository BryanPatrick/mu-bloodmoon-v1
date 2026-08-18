<script setup lang="ts">
import { Save, Upload, X } from 'lucide-vue-next'

const props = defineProps<{ guild: Record<string, any>; slug: string }>()
const emit = defineEmits<{ close: []; saved: [Record<string, any>] }>()
const api = useGuildsApi()
const toast = useToast()

// Only the fields the backend's GuildUpdatePayload actually accepts
// (guilds.contract.ts) -- name, tag, description, focusTags, recruitment.
// `recruitment` was deliberately excluded through Guild Step 1 (INVITE_ONLY
// was a dead end then); Guild Step 2 closed that dead end with a real
// invite flow, so Guild Step 5's audit connects the field now that changing
// it is actually safe. NEVER includes owner/leader/role/permissions fields --
// those have their own dedicated, backend-authoritative endpoints.
const form = reactive({
  name: props.guild.name || '',
  tag: props.guild.tag || '',
  description: props.guild.description || '',
  recruitment: props.guild.recruitment || 'APPROVAL_REQUIRED',
  focusTags: (props.guild.focusTags || []).map((entry: any) => entry.tag)
})

const recruitmentOptions = [
  { value: 'OPEN', label: 'Aberto', hint: 'Qualquer jogador entra direto, sem aprovação.' },
  { value: 'APPROVAL_REQUIRED', label: 'Aprovação necessária', hint: 'Jogador solicita, LEADER/OFFICER aprova ou rejeita.' },
  { value: 'INVITE_ONLY', label: 'Somente convite', hint: 'Só entra quem for convidado por um LEADER/OFFICER.' },
  { value: 'CLOSED', label: 'Fechado', hint: 'Não aceita novos membros por nenhuma via.' }
]

const focusTagOptions = [
  { value: 'PVP', label: 'PvP' },
  { value: 'PVE', label: 'PvE' },
  { value: 'CASTLE_SIEGE', label: 'Castle Siege' },
  { value: 'BOSS', label: 'Boss' },
  { value: 'FARM', label: 'Farm' },
  { value: 'EVENTS', label: 'Eventos' },
  { value: 'CASUAL', label: 'Casual' },
  { value: 'COMPETITIVE', label: 'Competitivo' }
]
const toggleFocusTag = (value: string) => {
  const index = form.focusTags.indexOf(value)
  if (index === -1) form.focusTags.push(value)
  else form.focusTags.splice(index, 1)
}

// Mirrors the backend's own validation (guilds.service.ts's requiredText
// calls) so the user sees the same rule before submitting, not just after
// a round-trip -- the backend remains the final authority regardless.
const nameError = computed(() => {
  const value = form.name.trim()
  if (!value) return 'Informe o nome da guild.'
  if (value.length < 3 || value.length > 100) return 'O nome deve ter entre 3 e 100 caracteres.'
  return null
})
const tagError = computed(() => {
  const value = form.tag.trim()
  if (!value) return 'Informe a tag da guild.'
  if (value.length < 2 || value.length > 10) return 'A tag deve ter entre 2 e 10 caracteres.'
  return null
})
const descriptionError = computed(() => (form.description.length > 4000 ? 'A descrição deve ter no máximo 4000 caracteres.' : null))
const formValid = computed(() => !nameError.value && !tagError.value && !descriptionError.value)

const saving = ref(false)
const saveError = ref<string | null>(null)

const submit = async () => {
  if (saving.value || emblemUploading.value || bannerUploading.value || !formValid.value) return
  saving.value = true
  saveError.value = null
  try {
    const updated = await api.updateGuild(props.slug, {
      name: form.name.trim(),
      tag: form.tag.trim().toUpperCase(),
      description: form.description.trim(),
      recruitment: form.recruitment,
      focusTags: form.focusTags
    })
    toast.add({ title: 'Perfil da guild atualizado', color: 'success' })
    emit('saved', updated as Record<string, any>)
    emit('close')
  } catch (err: any) {
    saveError.value = err?.data?.message || err?.message || 'Não foi possível salvar o perfil da guild.'
  } finally {
    saving.value = false
  }
}

// Emblem/banner: real upload only, same validated pipeline as Community's
// editor -- client-side checks are pure UX (fast feedback), the backend
// (guilds-media.service.ts: JPG/PNG/WebP, magic-byte match, <=4000px,
// <=20MP, re-encoded server-side) is the actual authority. On failure the
// existing image is left untouched, never replaced with a broken value.
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']
const emblemInput = ref<HTMLInputElement | null>(null)
const bannerInput = ref<HTMLInputElement | null>(null)
const emblemUploading = ref(false)
const bannerUploading = ref(false)
const emblemError = ref<string | null>(null)
const bannerError = ref<string | null>(null)
const emblemPreview = ref<string | null>(props.guild.emblemUrl || null)
const bannerPreview = ref<string | null>(props.guild.bannerUrl || null)

const pickFile = (kind: 'emblem' | 'banner') => (kind === 'emblem' ? emblemInput : bannerInput).value?.click()

const handleFile = async (kind: 'emblem' | 'banner', event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  ;(event.target as HTMLInputElement).value = ''
  if (!file) return
  const uploading = kind === 'emblem' ? emblemUploading : bannerUploading
  const errorRef = kind === 'emblem' ? emblemError : bannerError
  errorRef.value = null
  if (!ALLOWED_MIME.includes(file.type)) {
    errorRef.value = 'Formato não permitido. Use JPG, PNG ou WebP.'
    return
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    errorRef.value = 'Arquivo maior que 8 MB.'
    return
  }
  uploading.value = true
  try {
    const media = kind === 'emblem' ? await api.uploadEmblem(props.slug, file) : await api.uploadBanner(props.slug, file)
    const url = (media as any).url as string
    if (kind === 'emblem') emblemPreview.value = url
    else bannerPreview.value = url
    toast.add({ title: kind === 'emblem' ? 'Emblema enviado' : 'Banner enviado', color: 'success' })
    emit('saved', { ...props.guild, [kind === 'emblem' ? 'emblemUrl' : 'bannerUrl']: url })
  } catch (err: any) {
    errorRef.value = err?.data?.message || err?.message || 'Não foi possível enviar a imagem.'
  } finally {
    uploading.value = false
  }
}

const requestClose = () => {
  if (saving.value || emblemUploading.value || bannerUploading.value) return
  emit('close')
}
const onKeydown = (event: KeyboardEvent) => { if (event.key === 'Escape') requestClose() }
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div class="guild-editor-backdrop" @click.self="requestClose">
      <form class="guild-editor" @submit.prevent="submit">
        <header>
          <div><span>Autogestão</span><h2>Editar perfil da guild</h2></div>
          <UButton color="neutral" variant="ghost" square aria-label="Fechar" :disabled="saving" @click="requestClose"><X class="size-4" /></UButton>
        </header>

        <div class="guild-editor__body">
          <section>
            <h3>Identidade</h3>
            <label>
              Nome
              <input v-model="form.name" maxlength="100" required>
              <small v-if="nameError" class="guild-editor__field-error">{{ nameError }}</small>
            </label>
            <label>
              Tag
              <input v-model="form.tag" maxlength="10" required style="text-transform: uppercase">
              <small v-if="tagError" class="guild-editor__field-error">{{ tagError }}</small>
            </label>
            <label>
              Descrição
              <textarea v-model="form.description" maxlength="4000" />
              <small v-if="descriptionError" class="guild-editor__field-error">{{ descriptionError }}</small>
              <small v-else>{{ form.description.length }}/4000</small>
            </label>
            <label>
              Recrutamento
              <select v-model="form.recruitment">
                <option v-for="option in recruitmentOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
              <small>{{ recruitmentOptions.find((option) => option.value === form.recruitment)?.hint }}</small>
            </label>
            <fieldset class="guild-editor__focus">
              <legend>Foco da guild</legend>
              <label v-for="option in focusTagOptions" :key="option.value" class="guild-editor__focus-option">
                <input
                  type="checkbox"
                  :checked="form.focusTags.includes(option.value)"
                  @change="toggleFocusTag(option.value)"
                >
                {{ option.label }}
              </label>
            </fieldset>
          </section>

          <section>
            <h3>Imagens</h3>
            <label>
              Emblema (512x512)
              <div class="guild-editor__media">
                <img v-if="emblemPreview" :src="emblemPreview" alt="Pré-visualização do emblema" class="guild-editor__emblem-preview">
                <div v-else class="guild-editor__emblem-preview guild-editor__emblem-preview--empty" aria-hidden="true">?</div>
                <UButton type="button" color="neutral" variant="soft" size="sm" :loading="emblemUploading" :disabled="emblemUploading" @click="pickFile('emblem')">
                  <Upload class="size-4" />{{ emblemUploading ? 'Enviando...' : 'Enviar imagem' }}
                </UButton>
              </div>
              <input ref="emblemInput" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" @change="handleFile('emblem', $event)">
              <small v-if="emblemError" class="guild-editor__field-error">{{ emblemError }}</small>
              <small v-else>JPG, PNG ou WebP, até 8 MB. Será recortado para 512x512.</small>
            </label>
            <label>
              Banner (1600x480)
              <div class="guild-editor__media">
                <img v-if="bannerPreview" :src="bannerPreview" alt="Pré-visualização do banner" class="guild-editor__banner-preview">
                <div v-else class="guild-editor__banner-preview guild-editor__banner-preview--empty" aria-hidden="true" />
                <UButton type="button" color="neutral" variant="soft" size="sm" :loading="bannerUploading" :disabled="bannerUploading" @click="pickFile('banner')">
                  <Upload class="size-4" />{{ bannerUploading ? 'Enviando...' : 'Enviar imagem' }}
                </UButton>
              </div>
              <input ref="bannerInput" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" @change="handleFile('banner', $event)">
              <small v-if="bannerError" class="guild-editor__field-error">{{ bannerError }}</small>
              <small v-else>JPG, PNG ou WebP, até 8 MB. Será recortado para 1600x480.</small>
            </label>
          </section>
        </div>

        <p v-if="saveError" class="guild-editor__error" role="alert">{{ saveError }}</p>
        <footer>
          <UButton color="neutral" variant="soft" :disabled="saving" @click="requestClose">Cancelar</UButton>
          <UButton color="error" type="submit" :loading="saving" :disabled="saving || emblemUploading || bannerUploading || !formValid">
            <Save class="size-4" />{{ saving ? 'Salvando...' : 'Salvar perfil' }}
          </UButton>
        </footer>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.guild-editor-backdrop { position: fixed; z-index: 100; inset: 0; display: grid; place-items: center; background: rgb(16 16 16 / 0.55); padding: 18px; backdrop-filter: blur(3px); }
.guild-editor { width: min(820px, 100%); max-height: min(780px, 92vh); overflow-y: auto; border: 1px solid var(--bm-border-strong); border-radius: 10px; background: var(--bm-surface-strong); box-shadow: 0 24px 70px rgb(0 0 0 / 0.35); color: var(--bm-text); }
.guild-editor > header, .guild-editor > footer { position: sticky; z-index: 2; display: flex; align-items: center; justify-content: space-between; background: var(--bm-surface-strong); padding: 14px 18px; }
.guild-editor > header { top: 0; border-bottom: 1px solid var(--bm-border); }
.guild-editor > footer { bottom: 0; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--bm-border); }
.guild-editor header span { color: var(--bm-red); font-size: 0.58rem; font-weight: 900; text-transform: uppercase; }
.guild-editor h2 { font-family: Cinzel, serif; font-size: 1.1rem; }
.guild-editor__body { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; padding: 18px; }
.guild-editor section { display: grid; align-content: start; gap: 10px; }
.guild-editor section h3 { border-bottom: 1px solid var(--bm-border); padding-bottom: 8px; color: var(--bm-wine); font-size: 0.68rem; font-weight: 900; text-transform: uppercase; }
.guild-editor label { display: grid; gap: 5px; color: var(--bm-muted); font-size: 0.62rem; font-weight: 800; }
.guild-editor input, .guild-editor textarea, .guild-editor select { min-height: 38px; border: 1px solid var(--bm-border); border-radius: 6px; background: var(--bm-surface); padding: 8px 10px; outline: none; color: var(--bm-text); font-size: 0.72rem; }
.guild-editor textarea { min-height: 90px; resize: vertical; }
.guild-editor input:focus, .guild-editor textarea:focus, .guild-editor select:focus { border-color: var(--bm-red); }
.guild-editor small { color: var(--bm-muted); font-size: 0.58rem; line-height: 1.5; }
.guild-editor__field-error { color: var(--bm-red); font-weight: 800; }
.guild-editor__error { margin: 0 18px; border: 1px solid var(--bm-red); border-radius: 6px; background: rgb(191 2 2 / 0.08); padding: 9px 12px; color: var(--bm-red); font-size: 0.68rem; font-weight: 700; }
.guild-editor__focus { display: flex; flex-wrap: wrap; gap: 8px; border: none; padding: 0; margin: 0; }
.guild-editor__focus legend { color: var(--bm-muted); font-size: 0.62rem; font-weight: 800; margin-bottom: 4px; }
.guild-editor__focus-option { flex-direction: row; align-items: center; gap: 5px; border: 1px solid var(--bm-border); border-radius: 999px; padding: 4px 10px; font-weight: 700; cursor: pointer; }
.guild-editor__focus-option input { min-height: auto; width: auto; }
.guild-editor__media { display: flex; align-items: center; gap: 10px; }
.guild-editor__emblem-preview { width: 52px; height: 52px; flex: none; border: 1px solid var(--bm-border); border-radius: 10px; object-fit: cover; }
.guild-editor__emblem-preview--empty { display: grid; place-items: center; background: var(--bm-surface); color: var(--bm-muted); font-weight: 800; }
.guild-editor__banner-preview { width: 100%; max-width: 180px; height: 44px; flex: none; border: 1px solid var(--bm-border); border-radius: 6px; object-fit: cover; }
.guild-editor__banner-preview--empty { background: var(--bm-surface); }
@media (max-width: 680px) {
  .guild-editor__body { grid-template-columns: 1fr; }
  .guild-editor-backdrop { padding: 8px; }
}
</style>

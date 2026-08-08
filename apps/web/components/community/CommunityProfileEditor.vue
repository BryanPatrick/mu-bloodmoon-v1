<script setup lang="ts">
import { Save, Upload, X } from 'lucide-vue-next'
import type { CommunitySocialProfile } from '~/features/community/types/profile'
import { usernamePolicy } from '~/features/community/username-policy'
import { resolveMediaUrl } from '~/features/community/map-profile-response'

const props = withDefaults(defineProps<{ profile: CommunitySocialProfile; saving?: boolean; error?: string | null }>(), { saving: false, error: null })
const emit = defineEmits<{ close: []; save: [CommunitySocialProfile] }>()
const api = useCommunityApi()
const toast = useToast()

const form = reactive(structuredClone(toRaw(props.profile)))
const submit = () => { if (!props.saving && !avatarUploading.value && !coverUploading.value) emit('save', structuredClone(toRaw(form))) }

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const avatarInput = ref<HTMLInputElement | null>(null)
const coverInput = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)
const coverUploading = ref(false)
const avatarError = ref<string | null>(null)
const coverError = ref<string | null>(null)

/** Real upload only -- no base64, no manually-typed URL. Sends the file to
 * the same validated pipeline posts use (real byte/format check, re-encode,
 * server-generated filename); on success stores the API-relative URL the
 * same way post media does. On failure the existing avatar/cover is left
 * untouched -- never replaced with a broken or fabricated value. */
const pickAndUpload = (kind: 'avatar' | 'cover') => (kind === 'avatar' ? avatarInput : coverInput).value?.click()

const handleFile = async (kind: 'avatar' | 'cover', event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  ;(event.target as HTMLInputElement).value = ''
  if (!file) return
  const uploading = kind === 'avatar' ? avatarUploading : coverUploading
  const errorRef = kind === 'avatar' ? avatarError : coverError
  errorRef.value = null
  if (file.size > MAX_UPLOAD_BYTES) {
    errorRef.value = 'Arquivo maior que 8 MB.'
    return
  }
  uploading.value = true
  try {
    const uploaded = await api.uploadMedia(file)
    if (kind === 'avatar') form.avatarUrl = uploaded.url
    else form.coverUrl = uploaded.url
    toast.add({ title: kind === 'avatar' ? 'Avatar enviado' : 'Capa enviada', color: 'success' })
  } catch (err: any) {
    errorRef.value = err?.data?.message || err?.message || 'Nao foi possivel enviar a imagem.'
  } finally {
    uploading.value = false
  }
}
const onImgError = (event: Event) => { (event.target as HTMLImageElement).src = '/favicon.png' }

// Keyboard basics for this custom Teleport dialog (not a UModal, so nothing
// handles this for free): Escape closes it, same guard as the visible close
// button (never while a save/upload is genuinely in flight).
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && !props.saving && !avatarUploading.value && !coverUploading.value) emit('close')
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>
<template>
  <Teleport to="body">
    <div class="community-editor-backdrop" @click.self="emit('close')">
      <form class="community-editor" @submit.prevent="submit">
        <header>
          <div><span>Meu perfil</span><h2>Editar perfil social</h2></div>
          <UButton color="neutral" variant="ghost" square aria-label="Fechar" :disabled="saving" @click="emit('close')"><X class="size-4" /></UButton>
        </header>
        <div class="community-editor__body">
          <section>
            <h3>Identidade</h3>
            <label>Nome público<input v-model="form.displayName" maxlength="100"></label>
            <label>Bio<textarea v-model="form.bio" maxlength="2000" /></label>
            <div class="community-editor__two">
              <label>Personagem principal<input v-model="form.mainCharacter.name"></label>
              <label>Classe<input v-model="form.mainCharacter.className"></label>
            </div>
            <label>Guild<input v-model="form.guild"></label>
          </section>
          <section>
            <h3>Imagens</h3>
            <label>
              Avatar
              <div class="community-editor__media">
                <img v-if="form.avatarUrl" :src="resolveMediaUrl(form.avatarUrl)" alt="Pre-visualizacao do avatar" class="community-editor__avatar-preview" @error="onImgError">
                <div v-else class="community-editor__avatar-preview community-editor__avatar-preview--empty" aria-hidden="true">?</div>
                <UButton type="button" color="neutral" variant="soft" size="sm" :loading="avatarUploading" :disabled="avatarUploading" @click="pickAndUpload('avatar')"><Upload class="size-4" />{{ avatarUploading ? 'Enviando...' : 'Enviar imagem' }}</UButton>
              </div>
              <input ref="avatarInput" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" @change="handleFile('avatar', $event)">
              <small v-if="avatarError" class="community-editor__field-error">{{ avatarError }}</small>
              <small v-else>JPG, PNG, WebP ou GIF, ate 8 MB.</small>
            </label>
            <label>
              Capa
              <div class="community-editor__media">
                <img v-if="form.coverUrl" :src="resolveMediaUrl(form.coverUrl)" alt="Pre-visualizacao da capa" class="community-editor__cover-preview" @error="onImgError">
                <div v-else class="community-editor__cover-preview community-editor__cover-preview--empty" aria-hidden="true" />
                <UButton type="button" color="neutral" variant="soft" size="sm" :loading="coverUploading" :disabled="coverUploading" @click="pickAndUpload('cover')"><Upload class="size-4" />{{ coverUploading ? 'Enviando...' : 'Enviar imagem' }}</UButton>
              </div>
              <input ref="coverInput" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" @change="handleFile('cover', $event)">
              <small v-if="coverError" class="community-editor__field-error">{{ coverError }}</small>
              <small v-else>JPG, PNG, WebP ou GIF, ate 8 MB.</small>
            </label>
            <label>Username<input :value="form.username" disabled><small>Alteração futura sujeita a validação, histórico e cooldown de {{ usernamePolicy.cooldownDays }} dias.</small></label>
          </section>
          <section class="community-editor__privacy">
            <h3>Privacidade</h3>
            <label>Perfil<select v-model="form.privacy.profile"><option>PUBLIC</option><option>FOLLOWERS</option><option>PRIVATE</option></select></label>
            <label>Personagens<select v-model="form.privacy.characters"><option>ALL</option><option>MAIN_ONLY</option><option>HIDDEN</option></select></label>
            <label>Equipamentos<select v-model="form.privacy.equipment"><option>VISIBLE</option><option>HIDDEN</option></select></label>
            <label>Estatísticas<select v-model="form.privacy.statistics"><option>PRIVATE</option><option>SELECTIVE</option><option>PUBLIC</option></select></label>
            <label>Guild<select v-model="form.privacy.guild"><option>VISIBLE</option><option>HIDDEN</option></select></label>
            <label>Atividade<select v-model="form.privacy.activity"><option>VISIBLE</option><option>HIDDEN</option></select></label>
          </section>
        </div>
        <p v-if="error" class="community-editor__error" role="alert">{{ error }}</p>
        <footer>
          <UButton color="neutral" variant="soft" :disabled="saving" @click="emit('close')">Cancelar</UButton>
          <UButton color="error" type="submit" :loading="saving" :disabled="saving || avatarUploading || coverUploading"><Save class="size-4" />{{ saving ? 'Salvando...' : 'Salvar perfil' }}</UButton>
        </footer>
      </form>
    </div>
  </Teleport>
</template>
<style scoped>
.community-editor-backdrop{position:fixed;z-index:100;inset:0;display:grid;place-items:center;background:rgb(16 16 16/.55);padding:18px;backdrop-filter:blur(3px)}.community-editor{width:min(860px,100%);max-height:min(780px,92vh);overflow-y:auto;border:1px solid var(--bm-border-strong);border-radius:10px;background:var(--bm-surface-strong);box-shadow:0 24px 70px rgb(0 0 0/.35);color:var(--bm-text)}.community-editor>header,.community-editor>footer{position:sticky;z-index:2;display:flex;align-items:center;justify-content:space-between;background:var(--bm-surface-strong);padding:14px 18px}.community-editor>header{top:0;border-bottom:1px solid var(--bm-border)}.community-editor>footer{bottom:0;justify-content:flex-end;gap:8px;border-top:1px solid var(--bm-border)}.community-editor header span{color:var(--bm-red);font-size:.58rem;font-weight:900;text-transform:uppercase}.community-editor h2{font-family:Cinzel,serif;font-size:1.1rem}.community-editor__body{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:18px}.community-editor section{display:grid;align-content:start;gap:10px}.community-editor section h3{border-bottom:1px solid var(--bm-border);padding-bottom:8px;color:var(--bm-wine);font-size:.68rem;font-weight:900;text-transform:uppercase}.community-editor label{display:grid;gap:5px;color:var(--bm-muted);font-size:.62rem;font-weight:800}.community-editor input,.community-editor textarea,.community-editor select{min-height:38px;border:1px solid var(--bm-border);border-radius:6px;background:var(--bm-surface);padding:8px 10px;outline:none;color:var(--bm-text);font-size:.72rem}.community-editor textarea{min-height:90px;resize:vertical}.community-editor input:focus,.community-editor textarea:focus,.community-editor select:focus{border-color:var(--bm-red)}.community-editor small{color:var(--bm-muted);font-size:.58rem;line-height:1.5}.community-editor__field-error{color:var(--bm-red);font-weight:800}.community-editor__error{margin:0 18px;border:1px solid var(--bm-red);border-radius:6px;background:rgb(191 2 2/.08);padding:9px 12px;color:var(--bm-red);font-size:.68rem;font-weight:700}.community-editor__two,.community-editor__privacy{display:grid;grid-template-columns:1fr 1fr;gap:10px}.community-editor__privacy{grid-column:1/-1}.community-editor__privacy h3{grid-column:1/-1}.community-editor__media{display:flex;align-items:center;gap:10px}.community-editor__avatar-preview{width:52px;height:52px;flex:none;border:1px solid var(--bm-border);border-radius:50%;object-fit:cover}.community-editor__avatar-preview--empty{display:grid;place-items:center;background:var(--bm-surface);color:var(--bm-muted);font-weight:800}.community-editor__cover-preview{width:100%;max-width:180px;height:44px;flex:none;border:1px solid var(--bm-border);border-radius:6px;object-fit:cover}.community-editor__cover-preview--empty{background:var(--bm-surface)}@media(max-width:680px){.community-editor__body{grid-template-columns:1fr}.community-editor__privacy{grid-template-columns:1fr 1fr}.community-editor-backdrop{padding:8px}}
</style>

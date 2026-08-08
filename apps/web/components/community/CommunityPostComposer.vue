<script setup lang="ts">
import { FileText, Images, Image as ImageIcon, Plus, Save, Send, Smile, Video, X } from 'lucide-vue-next'
import type { CommunityPostType, CommunityPostView, CommunityPostVisibility } from '~/features/community/types/post'
import { resolveMediaUrl as mediaUrl } from '~/features/community/map-profile-response'

const props = defineProps<{ editingPost?: CommunityPostView | null }>()
const emit = defineEmits<{ saved: [post: Record<string, any>], cancelEdit: [] }>()
const { user } = useAuth()
const api = useCommunityApi()
const toast = useToast()
const open = ref(false)
const saving = ref(false)
const type = ref<CommunityPostType>('TEXT')
const visibility = ref<CommunityPostVisibility>('PUBLIC')
const status = ref<'DRAFT' | 'PUBLISHED'>('PUBLISHED')
const title = ref('')
const content = ref('')
const files = ref<File[]>([])
const existingMedia = ref<Array<{ id: string, url: string, kind: 'IMAGE' | 'GIF' }>>([])
const fileInput = ref<HTMLInputElement | null>(null)
const previews = ref<string[]>([])

const typeOptions: Array<{ value: CommunityPostType, label: string, icon: typeof ImageIcon }> = [
  { value: 'TEXT', label: 'Texto', icon: Smile }, { value: 'IMAGE', label: 'Foto', icon: ImageIcon },
  { value: 'GALLERY', label: 'Galeria', icon: Images }, { value: 'GIF', label: 'GIF', icon: Video },
  { value: 'ARTICLE', label: 'Artigo', icon: FileText }
]
const visibilityItems = [
  { label: 'Publico', value: 'PUBLIC' }, { label: 'Seguidores', value: 'FOLLOWERS' }, { label: 'Privado', value: 'PRIVATE' }
]
const accept = computed(() => type.value === 'GIF' ? 'image/gif' : 'image/jpeg,image/png,image/webp')
const multiple = computed(() => type.value === 'GALLERY')
const allPreviews = computed(() => [...existingMedia.value.map((item) => mediaUrl(item.url)), ...previews.value])

const releasePreviews = () => {
  previews.value.forEach((url) => URL.revokeObjectURL(url))
  previews.value = []
}
const reset = () => {
  releasePreviews(); type.value = 'TEXT'; visibility.value = 'PUBLIC'; status.value = 'PUBLISHED'
  title.value = ''; content.value = ''; files.value = []; existingMedia.value = []
}
const hydrate = (post: CommunityPostView) => {
  type.value = post.type; visibility.value = post.visibility; title.value = post.title || ''; content.value = post.content
  existingMedia.value = post.media.map(({ id, url, kind }) => ({ id, url, kind })); files.value = []; releasePreviews(); open.value = true
}
watch(() => props.editingPost, (post) => { if (post) hydrate(post) }, { immediate: true })
watch(type, (next) => {
  if (next === 'TEXT') { files.value = []; existingMedia.value = []; releasePreviews() }
  if (next !== 'ARTICLE') title.value = ''
})

const start = () => {
  if (!user.value) { navigateTo('/login?redirect=/comunidade'); return }
  open.value = true
}
const pickFiles = () => fileInput.value?.click()
const onFiles = (event: Event) => {
  const selected = Array.from((event.target as HTMLInputElement).files || [])
  const limit = type.value === 'GALLERY' ? 6 : 1
  if (type.value === 'GALLERY' && selected.length < 2) {
    toast.add({ title: 'Selecione ao menos duas imagens', color: 'warning' }); return
  }
  if (selected.some((file) => file.size > 8 * 1024 * 1024)) {
    toast.add({ title: 'Cada arquivo pode ter no maximo 8 MB', color: 'error' }); return
  }
  files.value = selected.slice(0, limit); existingMedia.value = []; releasePreviews()
  previews.value = files.value.map((file) => URL.createObjectURL(file))
}
const removeMedia = (index: number) => {
  if (index < existingMedia.value.length) existingMedia.value.splice(index, 1)
  else {
    const fileIndex = index - existingMedia.value.length
    URL.revokeObjectURL(previews.value[fileIndex]!); previews.value.splice(fileIndex, 1); files.value.splice(fileIndex, 1)
  }
}
const close = () => {
  open.value = false
  if (props.editingPost) emit('cancelEdit')
  reset()
}
const save = async () => {
  if (saving.value) return
  saving.value = true
  try {
    const uploaded = []
    // Post creation only ever runs after every file finishes uploading --
    // if any upload fails, we stop before createPost/updatePost is called,
    // so no post is ever shown as published with missing/broken media.
    // (Already-succeeded files in this batch stay as unattached CommunityMedia
    // rows -- there's no delete endpoint yet to roll those back; see
    // docs/handoff/community-current-state.md for the known limitation.)
    for (const [index, file] of files.value.entries()) {
      try {
        uploaded.push(await api.uploadPostMedia(file))
      } catch (uploadError: any) {
        throw new Error(
          `Falha ao enviar "${file.name}" (arquivo ${index + 1} de ${files.value.length}): ${uploadError?.data?.message || uploadError?.message || 'erro desconhecido'}`,
          { cause: uploadError }
        )
      }
    }
    const body = {
      type: type.value, visibility: visibility.value, status: status.value,
      title: title.value || undefined, content: content.value,
      mediaIds: [...existingMedia.value.map((item) => item.id), ...uploaded.map((item) => item.id)]
    }
    const result = props.editingPost
      ? await api.updatePost(props.editingPost.id, body) as Record<string, any>
      : await api.createPost(body) as Record<string, any>
    emit('saved', result)
    toast.add({ title: props.editingPost ? 'Publicacao atualizada' : status.value === 'DRAFT' ? 'Rascunho salvo' : 'Publicacao criada', color: 'success' })
    close()
  } catch (error: any) {
    toast.add({ title: 'Nao foi possivel salvar', description: error?.data?.message || error?.message, color: 'error' })
  } finally { saving.value = false }
}
onBeforeUnmount(releasePreviews)
</script>

<template>
  <section class="community-composer" aria-label="Criar publicacao">
    <button class="community-composer__prompt" type="button" @click="start">
      <span><Plus class="size-4" /></span><p>Compartilhe algo com a Community Blood Moon</p><Smile class="size-4" />
    </button>
    <div class="community-composer__actions">
      <button v-for="option in typeOptions" :key="option.value" type="button" @click="type = option.value; start()"><component :is="option.icon" class="size-4" />{{ option.label }}</button>
    </div>
  </section>

  <UModal v-model:open="open" :title="editingPost ? 'Editar publicacao' : 'Nova publicacao'" description="Use @ para mencionar e # para organizar por assunto." :ui="{ content: 'max-w-3xl' }" @update:open="value => { if (!value) close() }">
    <template #body>
      <form class="post-form" @submit.prevent="save">
        <div class="post-types">
          <button v-for="option in typeOptions" :key="option.value" type="button" :class="{ active: type === option.value }" @click="type = option.value"><component :is="option.icon" class="size-4" />{{ option.label }}</button>
        </div>
        <UInput v-if="type === 'ARTICLE'" v-model="title" placeholder="Titulo do artigo" maxlength="191" />
        <UEditor v-if="type === 'ARTICLE'" v-model="content" content-type="markdown" :image="false" placeholder="Desenvolva seu artigo..." class="post-editor" />
        <UTextarea v-else v-model="content" :rows="6" autoresize maxlength="10000" placeholder="O que esta acontecendo em Blood Moon?" />
        <input ref="fileInput" class="sr-only" type="file" :accept="accept" :multiple="multiple" @change="onFiles">
        <button v-if="['IMAGE','GALLERY','GIF','ARTICLE'].includes(type)" class="media-picker" type="button" @click="pickFiles"><ImageIcon class="size-4" />{{ type === 'GALLERY' ? 'Selecionar de 2 a 6 imagens' : 'Selecionar midia' }}</button>
        <div v-if="allPreviews.length" class="media-preview" :class="{ gallery: allPreviews.length > 1 }">
          <figure v-for="(url, index) in allPreviews" :key="url"><img :src="url" alt="Previa da midia"><button type="button" aria-label="Remover midia" @click="removeMedia(index)"><X class="size-3" /></button></figure>
        </div>
        <div class="post-form__footer">
          <USelect v-model="visibility" :items="visibilityItems" value-key="value" class="w-40" />
          <UButton type="button" color="neutral" variant="outline" :disabled="saving" @click="status = 'DRAFT'; save()"><Save class="size-4" />Rascunho</UButton>
          <UButton type="submit" color="primary" :loading="saving" @click="status = 'PUBLISHED'"><Send class="size-4" />Publicar</UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>

<style scoped>
.community-composer{border:1px solid var(--bm-border);border-radius:10px;background:var(--bm-surface-strong);box-shadow:var(--shadow-panel)}
.community-composer__prompt{display:flex;width:100%;align-items:center;gap:11px;padding:16px;text-align:left}.community-composer__prompt span{display:grid;width:34px;height:34px;flex:none;place-items:center;border-radius:50%;background:var(--bm-red);color:white}.community-composer__prompt p{flex:1;color:var(--bm-muted);font-size:.76rem}
.community-composer__actions{display:grid;grid-template-columns:repeat(5,1fr);border-top:1px solid var(--bm-border)}.community-composer__actions button,.post-types button{display:flex;align-items:center;justify-content:center;gap:6px;color:var(--bm-muted);font-size:.65rem;font-weight:800}.community-composer__actions button{min-height:42px}.community-composer__actions button:hover,.post-types button.active{background:var(--bm-surface);color:var(--bm-wine)}
.post-form{display:grid;gap:14px}.post-types{display:grid;grid-template-columns:repeat(5,1fr);overflow:hidden;border:1px solid var(--bm-border);border-radius:7px}.post-types button{min-height:38px}.post-editor{min-height:220px;border:1px solid var(--bm-border);border-radius:7px;padding:12px}.media-picker{display:flex;min-height:42px;align-items:center;justify-content:center;gap:7px;border:1px dashed var(--bm-border);border-radius:7px;color:var(--bm-muted);font-size:.7rem;font-weight:800}.media-preview{display:grid;grid-template-columns:1fr;gap:8px}.media-preview.gallery{grid-template-columns:repeat(3,1fr)}.media-preview figure{position:relative;overflow:hidden;border-radius:7px;background:var(--bm-surface)}.media-preview img{width:100%;height:160px;object-fit:cover}.media-preview button{position:absolute;top:6px;right:6px;display:grid;width:26px;height:26px;place-items:center;border-radius:50%;background:rgb(16 16 16/.8);color:white}.post-form__footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;border-top:1px solid var(--bm-border);padding-top:12px}.post-form__footer :first-child{margin-right:auto}
@media(max-width:639px){.community-composer__actions,.post-types{grid-template-columns:repeat(3,1fr)}.media-preview.gallery{grid-template-columns:repeat(2,1fr)}.post-form__footer{flex-wrap:wrap}.post-form__footer :first-child{width:100%;margin:0}.post-form__footer button{flex:1}}
</style>

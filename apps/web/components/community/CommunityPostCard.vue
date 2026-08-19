<script setup lang="ts">
import { Bookmark, Copy, Edit3, Flag, Gem, Heart, Medal, MessageCircle, MoreHorizontal, Repeat2, Share2, Trash2, Trophy, Zap } from 'lucide-vue-next'
import type { CommunityCommentView, CommunityPostView, CommunityReactionType } from '~/features/community/types/post'
import { resolveMediaUrl as mediaUrl } from '~/features/community/map-profile-response'
import { normalizeComment } from '~/features/community/map-post-response'

const props = defineProps<{ post: CommunityPostView, own?: boolean, currentUserId?: string | null }>()
const emit = defineEmits<{
  edit: [post: CommunityPostView]
  remove: [post: CommunityPostView]
  react: [post: CommunityPostView, type: CommunityReactionType]
  save: [post: CommunityPostView]
  repost: [post: CommunityPostView]
  copy: [post: CommunityPostView]
  comment: [post: CommunityPostView, content: string, parentId?: string]
  updateComment: [comment: CommunityCommentView, content: string]
  removeComment: [comment: CommunityCommentView]
  reactComment: [comment: CommunityCommentView, type: CommunityReactionType]
}>()
const api = useCommunityApi()
const { accessToken } = useAuth()
const commentsOpen = ref(false)
const commentText = ref('')
const replyingTo = ref<CommunityCommentView | null>(null)
const editingComment = ref<CommunityCommentView | null>(null)

// Posts only ever embed the first 5 top-level comments (see postInclude in
// community.service.ts) -- extraComments holds pages 2+ fetched on demand,
// reset whenever the post's own comment list changes (a new comment was
// just posted/removed and refetched from the server).
const extraComments = ref<CommunityCommentView[]>([])
const commentsPage = ref(1)
const loadingMoreComments = ref(false)
const commentLoadError = ref(false)
watch(() => props.post.commentItems, () => { extraComments.value = []; commentsPage.value = 1 })
const visibleComments = computed(() => [...props.post.commentItems, ...extraComments.value])
const hasMoreComments = computed(() => visibleComments.value.length < props.post.comments)
const loadMoreComments = async () => {
  if (loadingMoreComments.value || !hasMoreComments.value) return
  loadingMoreComments.value = true
  commentLoadError.value = false
  try {
    const next = (await api.postComments(props.post.id, commentsPage.value + 1, Boolean(accessToken.value))) as { data: unknown[] }
    extraComments.value = [...extraComments.value, ...next.data.map(normalizeComment)]
    commentsPage.value += 1
  } catch {
    commentLoadError.value = true
  } finally {
    loadingMoreComments.value = false
  }
}

const typeLabels: Record<CommunityPostView['type'], string> = { TEXT: 'Texto', IMAGE: 'Foto', GALLERY: 'Galeria', GIF: 'GIF', ARTICLE: 'Artigo' }
const labelNames: Record<string, string> = { FOLLOWING: 'Seguindo', TRENDING: 'Em alta', SPONSORED: 'Patrocinado', OFFICIAL: 'Oficial', ACHIEVEMENT: 'Conquista', MARKETPLACE: 'Marketplace', EVENT: 'Evento', GUIDE: 'Guia' }
const reactionOptions: Array<{ type: CommunityReactionType, label: string, icon: any }> = [
  { type: 'LIKE', label: 'Curtir', icon: Heart }, { type: 'HONOR', label: 'Honra', icon: Medal },
  { type: 'POWER', label: 'Poder', icon: Zap }, { type: 'RARE', label: 'Raro', icon: Gem }, { type: 'VICTORY', label: 'Vitória', icon: Trophy }
]
const createdLabel = computed(() => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(props.post.createdAt)))

// Reaction/save/repost/comment are fire-and-forget emits -- the actual
// request and its result live in the parent (see runSocial in
// pages/comunidade/index.vue). To still prevent a fast double-click from
// firing the same action twice, each gets a short local busy flag: set on
// click, cleared either when the parent's refresh replaces this whole `post`
// prop (the success path) or by a safety-net timeout (the failure path,
// since a failed action never replaces `post`).
const busyReact = ref(false)
const busySave = ref(false)
const busyRepost = ref(false)
const commentSubmitting = ref(false)
watch(() => props.post, () => { busyReact.value = false; busySave.value = false; busyRepost.value = false; commentSubmitting.value = false })
const guardedEmit = (busy: { value: boolean }, run: () => void) => {
  if (busy.value) return
  busy.value = true
  run()
  setTimeout(() => { busy.value = false }, 4000)
}
const reactionMenu = (target: CommunityPostView | CommunityCommentView, comment = false) => [reactionOptions.map((item) => ({
  label: item.label, icon: item.icon,
  onSelect: () => comment
    ? emit('reactComment', target as CommunityCommentView, item.type)
    : guardedEmit(busyReact, () => emit('react', target as CommunityPostView, item.type))
}))]
// Report has no post/comment-level UI state to react to on success (unlike
// edit/delete, the reported content keeps showing normally to the
// reporter) -- self-contained per card instead of threaded through parent
// emits, since there's nothing for the parent to orchestrate afterward.
const reportOpen = ref(false)
const reportTarget = ref<{ type: 'post' | 'comment'; id: string } | null>(null)
const openReport = (type: 'post' | 'comment', id: string) => { reportTarget.value = { type, id }; reportOpen.value = true }

const menuItems = computed(() => {
  if (props.own) return [[
    { label: 'Editar', icon: Edit3, onSelect: () => emit('edit', props.post) },
    { label: 'Excluir', icon: Trash2, color: 'error' as const, onSelect: () => emit('remove', props.post) }
  ]]
  // Own content never offers "Denunciar" -- the backend rejects
  // self-reports outright (community.service.ts's report()), so the option
  // would only ever produce a guaranteed 400.
  if (props.currentUserId) return [[{ label: 'Denunciar', icon: Flag, onSelect: () => openReport('post', props.post.id) }]]
  return []
})
const commentMenuItems = (comment: CommunityCommentView) =>
  props.currentUserId && comment.author.id !== props.currentUserId
    ? [[{ label: 'Denunciar', icon: Flag, onSelect: () => openReport('comment', comment.id) }]]
    : []
const submitComment = () => {
  const content = commentText.value.trim()
  if (!content || commentSubmitting.value) return
  guardedEmit(commentSubmitting, () => {
    if (editingComment.value) emit('updateComment', editingComment.value, content)
    else emit('comment', props.post, content, replyingTo.value?.id)
  })
  commentText.value = ''; replyingTo.value = null; editingComment.value = null
}
const startEdit = (comment: CommunityCommentView) => { commentsOpen.value = true; replyingTo.value = null; editingComment.value = comment; commentText.value = comment.content }
const startReply = (comment: CommunityCommentView) => { commentsOpen.value = true; editingComment.value = null; replyingTo.value = comment; commentText.value = '' }
const cancelCommentMode = () => { replyingTo.value = null; editingComment.value = null; commentText.value = '' }
const onImgError = (event: Event) => { (event.target as HTMLImageElement).src = '/favicon.png' }
</script>

<template>
  <article class="community-post">
    <header class="community-post__header">
      <img :src="post.author.avatarUrl || '/favicon.png'" :alt="post.author.name" @error="onImgError">
      <CommunityProfileHoverCard :username="post.author.username" :name="post.author.name" :avatar-url="post.author.avatarUrl || undefined">
        <div class="min-w-0 flex-1 cursor-pointer">
          <strong>{{ post.author.name }}</strong>
          <p class="community-post__byline">@{{ post.author.username }} · {{ createdLabel }} <span v-if="post.edited">· Editado</span></p>
        </div>
      </CommunityProfileHoverCard>
      <div v-if="post.labels.length" class="community-post__labels"><span v-for="label in post.labels.slice(0, 2)" :key="label">{{ labelNames[label] }}</span></div>
      <span v-else class="community-badge">{{ typeLabels[post.type] }}</span>
      <UDropdownMenu v-if="own || currentUserId" :items="menuItems"><UButton color="neutral" variant="ghost" square aria-label="Opções da publicação"><MoreHorizontal class="size-4" /></UButton></UDropdownMenu>
    </header>

    <div class="community-post__body">
      <p v-if="post.isPinned || post.isFeatured" class="community-post__meta">{{ post.isPinned ? 'Publicação fixada' : 'Em destaque' }}</p>
      <h2 v-if="post.title">{{ post.title }}</h2>
      <p v-if="post.content" class="community-post__content">{{ post.content }}</p>
      <div v-if="post.tags.length" class="community-post__tags"><span v-for="tag in post.tags" :key="tag">#{{ tag }}</span></div>
    </div>

    <div v-if="post.media.length" class="community-post__media" :class="[`count-${Math.min(post.media.length, 4)}`]">
      <img v-for="asset in post.media" :key="asset.id" :src="mediaUrl(asset.url)" :alt="post.title || 'Mídia da publicação'" @error="onImgError">
    </div>

    <footer class="community-post__footer">
      <UDropdownMenu :items="reactionMenu(post)">
        <button type="button" :disabled="busyReact" :class="{ 'is-active': post.viewer.reactions.length }" aria-label="Reagir"><Heart class="size-4" />{{ post.reactions }}</button>
      </UDropdownMenu>
      <button type="button" :class="{ 'is-active': commentsOpen }" @click="commentsOpen = !commentsOpen"><MessageCircle class="size-4" />{{ post.comments }}</button>
      <button type="button" :disabled="busyRepost" :class="{ 'is-active': post.viewer.reposted }" @click="guardedEmit(busyRepost, () => emit('repost', post))"><Repeat2 class="size-4" />{{ post.reposts || '' }}</button>
      <UDropdownMenu :items="[[{ label: 'Repostar na Community', icon: Repeat2, onSelect: () => guardedEmit(busyRepost, () => emit('repost', post)) }, { label: 'Copiar link', icon: Copy, onSelect: () => emit('copy', post) }]]">
        <button type="button" aria-label="Compartilhar"><Share2 class="size-4" /></button>
      </UDropdownMenu>
      <button class="ml-auto" type="button" :disabled="busySave" :class="{ 'is-active': post.viewer.saved }" aria-label="Salvar publicação" @click="guardedEmit(busySave, () => emit('save', post))"><Bookmark class="size-4" />{{ post.saves || '' }}</button>
    </footer>

    <section v-if="commentsOpen" class="community-comments" aria-label="Comentários">
      <form class="community-comment-form" @submit.prevent="submitComment">
        <div v-if="replyingTo || editingComment" class="community-comment-context">
          {{ editingComment ? 'Editando comentário' : `Respondendo a @${replyingTo?.author.username}` }}
          <button type="button" @click="cancelCommentMode">Cancelar</button>
        </div>
        <div class="flex gap-2"><UInput v-model="commentText" class="flex-1" :disabled="commentSubmitting" :placeholder="editingComment ? 'Atualize seu comentário' : 'Escreva um comentário'" /><UButton type="submit" color="error" :loading="commentSubmitting" :disabled="commentSubmitting">Enviar</UButton></div>
      </form>
      <div v-if="!visibleComments.length" class="community-comments__empty">Nenhum comentário ainda.</div>
      <div v-for="comment in visibleComments" :key="comment.id" class="community-comment">
        <img :src="comment.author.avatarUrl || '/favicon.png'" :alt="comment.author.name" @error="onImgError">
        <div><strong>{{ comment.author.name }}</strong><p>{{ comment.content }} <small v-if="comment.edited">· Editado</small></p>
          <div class="community-comment__actions">
            <UDropdownMenu :items="reactionMenu(comment, true)"><button type="button">Reagir · {{ comment.reactions.length }}</button></UDropdownMenu>
            <button type="button" @click="startReply(comment)">Responder</button>
            <button v-if="comment.author.id === currentUserId" type="button" @click="startEdit(comment)">Editar</button>
            <button v-if="comment.author.id === currentUserId" type="button" @click="emit('removeComment', comment)">Excluir</button>
            <UDropdownMenu v-if="currentUserId && comment.author.id !== currentUserId" :items="commentMenuItems(comment)"><button type="button" aria-label="Mais opções do comentário"><MoreHorizontal class="size-3.5" /></button></UDropdownMenu>
          </div>
          <div v-for="reply in comment.replies" :key="reply.id" class="community-comment is-reply">
            <img :src="reply.author.avatarUrl || '/favicon.png'" :alt="reply.author.name" @error="onImgError"><div><strong>{{ reply.author.name }}</strong><p>{{ reply.content }} <small v-if="reply.edited">· Editado</small></p>
              <div class="community-comment__actions"><UDropdownMenu :items="reactionMenu(reply, true)"><button type="button">Reagir · {{ reply.reactions.length }}</button></UDropdownMenu><button v-if="reply.author.id === currentUserId" type="button" @click="startEdit(reply)">Editar</button><button v-if="reply.author.id === currentUserId" type="button" @click="emit('removeComment', reply)">Excluir</button><UDropdownMenu v-if="currentUserId && reply.author.id !== currentUserId" :items="commentMenuItems(reply)"><button type="button" aria-label="Mais opções do comentário"><MoreHorizontal class="size-3.5" /></button></UDropdownMenu></div>
            </div>
          </div>
        </div>
      </div>
      <p v-if="commentLoadError" class="community-comments__empty is-error">Não foi possível carregar mais comentários. Tente novamente.</p>
      <button v-if="hasMoreComments" class="community-comments__more" type="button" :disabled="loadingMoreComments" @click="loadMoreComments">{{ loadingMoreComments ? 'Carregando...' : 'Carregar mais comentários' }}</button>
    </section>

    <CommunityReportDialog v-if="reportTarget" v-model:open="reportOpen" :target-type="reportTarget.type" :target-id="reportTarget.id" />
  </article>
</template>

<style scoped>
.community-post{overflow:hidden;border:1px solid var(--bm-border);border-radius:10px;background:var(--bm-surface-strong);box-shadow:var(--shadow-panel)}.community-post__header{display:flex;align-items:center;gap:10px;padding:14px 16px}.community-post__header>img{width:38px;height:38px;flex:none;border:1px solid var(--bm-border);border-radius:50%;object-fit:cover}.community-post__header strong{display:block;overflow:hidden;color:var(--bm-text);font-size:.76rem;text-overflow:ellipsis;white-space:nowrap}.community-post__header p{color:var(--bm-muted);font-size:.64rem}.community-post__byline{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.community-badge,.community-post__labels span{flex:none;border:1px solid var(--bm-border);border-radius:4px;padding:3px 6px;color:var(--bm-muted);font-size:.56rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.community-post__labels{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:4px}.community-post__body{padding:2px 16px 16px}.community-post__meta{margin-bottom:5px;color:var(--bm-red)!important;font-size:.62rem!important;font-weight:900;text-transform:uppercase}.community-post__body h2{margin-bottom:5px;color:var(--bm-heading);font-family:Cinzel,serif;font-size:1rem;font-weight:800}.community-post__content{white-space:pre-wrap;color:var(--bm-muted);font-size:.76rem;line-height:1.62}.community-post__tags{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px;color:var(--bm-wine);font-size:.66rem;font-weight:800}.community-post__media{display:grid;gap:2px;background:var(--bm-border)}.community-post__media img{width:100%;height:min(430px,58vw);object-fit:cover}.community-post__media.count-2,.community-post__media.count-3,.community-post__media.count-4{grid-template-columns:repeat(2,1fr)}.community-post__media.count-2 img,.community-post__media.count-3 img,.community-post__media.count-4 img{height:240px}.community-post__footer{display:flex;align-items:center;gap:4px;border-top:1px solid var(--bm-border);padding:8px 12px}.community-post__footer button{display:inline-flex;min-width:34px;height:34px;align-items:center;justify-content:center;gap:6px;border-radius:6px;padding-inline:9px;color:var(--bm-muted);font-size:.66rem;font-weight:800}.community-post__footer button:hover,.community-post__footer button.is-active{background:var(--bm-surface);color:var(--bm-wine)}.community-post__footer button:disabled{opacity:.55;pointer-events:none}.community-comments{display:grid;gap:12px;border-top:1px solid var(--bm-border);padding:12px 16px}.community-comment-form{display:grid;gap:6px}.community-comment-context{display:flex;justify-content:space-between;color:var(--bm-muted);font-size:.62rem}.community-comment-context button{color:var(--bm-red);font-weight:800}.community-comments__empty{padding:10px;color:var(--bm-muted);font-size:.66rem;text-align:center}.community-comments__empty.is-error{color:var(--bm-red)}.community-comments__more{justify-self:center;color:var(--bm-wine);font-size:.66rem;font-weight:800}.community-comments__more:disabled{opacity:.6}.community-comment{display:grid;grid-template-columns:28px 1fr;gap:8px}.community-comment img{width:28px;height:28px;border-radius:50%;object-fit:cover}.community-comment strong{color:var(--bm-heading);font-size:.68rem}.community-comment p{color:var(--bm-text);font-size:.7rem;line-height:1.5}.community-comment small{color:var(--bm-muted)}.community-comment__actions{display:flex;gap:10px;margin-top:3px}.community-comment__actions button{color:var(--bm-muted);font-size:.58rem;font-weight:800}.community-comment.is-reply{margin-top:10px;border-left:1px solid var(--bm-border);padding-left:10px}
@media(max-width:479px){.community-post__header{align-items:flex-start;padding:12px}.community-post__labels{display:none}.community-post__body{padding-inline:12px}.community-post__media.count-2 img,.community-post__media.count-3 img,.community-post__media.count-4 img{height:160px}.community-post__footer{gap:0;padding-inline:6px}.community-comments{padding-inline:12px}}
</style>

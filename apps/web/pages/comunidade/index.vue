<template>
  <div class="community-page">
    <CommunitySubheader :active-section="activeSection" :profile-username="profile?.username || user?.username" @open-profile="profileDrawerOpen = true" />

    <header class="community-intro bm-hero-photo">
      <div class="bm-hero-photo__bg" style="background-image: url(/images/hero-elfa-noria.png)" />
      <div class="bm-hero-photo__scrim" />
      <div>
        <p class="bm-kicker">Blood Moon Community</p>
        <h1>O ponto de encontro dos jogadores</h1>
        <p>Histórias, guilds, conquistas e eventos reunidos em um espaço feito para a comunidade.</p>
      </div>
    </header>

    <main class="community-layout" :class="{ 'is-guest-layout': leftRailView === 'guest-banner' }">
      <!-- See features/community/left-rail-view.ts for the state table this
           renders (loading/authenticated/guest x profile pending/loaded/
           errored). Kept as a single computed instead of an inline v-if
           chain so the decision logic is unit-testable on its own. -->
      <div v-if="leftRailView === 'rail' || leftRailView === 'skeleton' || leftRailView === 'load-error'" class="community-layout__left">
        <CommunityUserRail v-if="leftRailView === 'rail'" :profile="profile" />
        <div v-else-if="leftRailView === 'skeleton'" class="community-user-rail community-user-rail-skeleton" aria-hidden="true" aria-busy="true">
          <div class="community-user-rail-skeleton__avatar" />
          <div class="community-user-rail-skeleton__line" style="width: 60%" />
          <div class="community-user-rail-skeleton__line" style="width: 40%" />
          <div class="community-user-rail-skeleton__block" />
        </div>
        <div v-else class="community-signin-prompt">
          <p>Não foi possível carregar seu perfil da Community agora.</p>
          <button type="button" @click="refreshOwnProfile()">Tentar novamente</button>
        </div>
      </div>
      <div v-else-if="leftRailView === 'guest-banner'" class="community-signin-banner">
        <p>Entre na sua conta para ver seu perfil, personagem principal e conquistas.</p>
        <NuxtLink to="/login">Entrar</NuxtLink>
      </div>

      <section class="community-layout__center" :class="{ 'is-wide': activeSection !== 'home' }">
        <template v-if="activeSection === 'home' || activeSection === 'salvos'">
          <button v-if="profile" class="community-mobile-profile" type="button" @click="profileDrawerOpen = true">
            <img :src="profile.avatarUrl || '/favicon.png'" :alt="profile.displayName" @error="onImgError">
            <span><strong>{{ profile.displayName }}</strong><small>{{ profile.mainCharacter?.name || 'Não encontrado' }} · {{ profile.guild || 'Sem guild' }}</small></span>
            <ChevronRight class="size-4" />
          </button>

          <CommunityPostComposer v-if="activeSection === 'home'" :editing-post="editingPost" @saved="refreshFeed" @cancel-edit="editingPost = null" />

          <header v-else class="community-saved-heading"><p class="bm-kicker">Biblioteca pessoal</p><h2>Publicações salvas</h2></header>

          <div v-if="activeSection === 'home'" class="community-feed-tabs" role="tablist" aria-label="Filtros do feed">
            <button v-for="tab in feedTabs" :key="tab" type="button" role="tab" :aria-selected="activeFeedTab === tab" :class="{ 'is-active': activeFeedTab === tab }" @click="activeFeedTab = tab">{{ tab }}</button>
            <button class="community-feed-refresh" type="button" :disabled="feedPending" aria-label="Atualizar feed" @click="refreshFeedRequest()"><RefreshCw class="size-3.5" :class="{ 'is-spinning': feedPending }" /></button>
          </div>

          <div v-if="feedPending" class="community-feed-state">Carregando publicações...</div>
          <div v-else-if="feedError" class="community-feed-state is-error">Não foi possível carregar o feed agora.</div>
          <div v-else-if="!posts.length" class="community-feed-state">{{ feedEmptyMessage }}</div>
          <div v-else class="community-feed">
            <CommunityPostCard v-for="post in posts" :key="post.id" :post="post" :own="Boolean(user?.id && post.author.id === user.id)" :current-user-id="user?.id" @edit="editingPost = $event" @remove="removePost" @react="reactPost" @save="savePost" @repost="repostPost" @copy="copyPostLink" @comment="commentPost" @update-comment="updateComment" @remove-comment="removeComment" @react-comment="reactComment" />
            <button v-if="hasMorePosts" class="community-load-more" type="button" :disabled="loadingMore" @click="loadMorePosts">{{ loadingMore ? 'Carregando...' : 'Carregar mais publicações' }}</button>
          </div>
        </template>

        <CommunityPlaceholderView v-else :title="sectionTitle" />
      </section>

      <CommunityRightRail v-if="activeSection === 'home'" class="community-layout__right" />
    </main>

    <Teleport to="body">
      <Transition name="community-fade">
        <button v-if="profileDrawerOpen" class="community-drawer-backdrop" type="button" aria-label="Fechar resumo do perfil" @click="profileDrawerOpen = false" />
      </Transition>
      <Transition name="community-drawer">
        <div v-if="profileDrawerOpen" class="community-drawer" role="dialog" aria-modal="true" aria-label="Resumo do perfil">
          <div class="community-drawer__head">
            <strong>Meu espaço</strong>
            <UButton color="neutral" variant="ghost" square aria-label="Fechar" @click="profileDrawerOpen = false"><X class="size-4" /></UButton>
          </div>
          <CommunityUserRail v-if="profile" :profile="profile" compact @close="profileDrawerOpen = false" />
        </div>
      </Transition>
      <Transition name="community-fade">
        <button v-if="viewingPostId" class="community-drawer-backdrop" type="button" aria-label="Fechar publicação" @click="closePostView" />
      </Transition>
      <Transition name="community-fade">
        <div v-if="viewingPostId" class="community-post-modal" role="dialog" aria-modal="true" aria-label="Publicação">
          <div class="community-drawer__head">
            <strong>Publicação</strong>
            <UButton color="neutral" variant="ghost" square aria-label="Fechar" @click="closePostView"><X class="size-4" /></UButton>
          </div>
          <div class="community-post-modal__body">
            <div v-if="viewingPostPending" class="community-feed-state">Carregando publicação...</div>
            <div v-else-if="viewingPostError" class="community-feed-state is-error">Não foi possível carregar esta publicação. Ela pode ter sido removida ou não está mais disponível para você.</div>
            <CommunityPostCard v-else-if="viewingPost" :post="viewingPost" :own="Boolean(user?.id && viewingPost.author.id === user.id)" :current-user-id="user?.id" @edit="onEditFromModal" @remove="onRemoveFromModal" @react="reactPost" @save="savePost" @repost="repostPost" @copy="copyPostLink" @comment="commentPost" @update-comment="updateComment" @remove-comment="removeComment" @react-comment="reactComment" />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ChevronRight, RefreshCw, X } from 'lucide-vue-next'
import type { CommunityPostView } from '~/features/community/types/post'
import { mapProfileResponse } from '~/features/community/map-profile-response'
import { normalizePost } from '~/features/community/map-post-response'
import { resolveCommunityLeftRailView } from '~/features/community/left-rail-view'

useHead({ title: 'Community' })

const route = useRoute()
const { user, accessToken, authStatus } = useAuth()
const api = useCommunityApi()
const toast = useToast()
const editingPost = ref<CommunityPostView | null>(null)
const profileDrawerOpen = ref(false)
const activeFeedTab = ref('Para você')
const feedTabs = ['Para você', 'Seguindo', 'Recentes']
const allowedSections = ['home', 'explorar', 'perfil', 'guilds', 'eventos', 'quests', 'conquistas', 'salvos']
const activeSection = computed(() => {
  const value = String(route.query.section || 'home').toLowerCase()
  return allowedSections.includes(value) ? value : 'home'
})

const FEED_PAGE_SIZE = 30
const feedMode = computed(() => activeSection.value === 'salvos' ? 'saved' : activeFeedTab.value === 'Seguindo' ? 'following' : activeFeedTab.value === 'Recentes' ? 'recent' : 'for-you')
// requestFeed always fetches page 1 -- it backs useAsyncData, whose `refresh()`
// runs after every mutation (create/edit/delete/react/save/...) and after a
// tab/section switch. Always resetting to a fresh page 1 there is the
// correct, simple behavior (a new post enters at the top; a stale "page 3"
// after a mutation would be confusing). Going beyond page 1 is a separate,
// explicit action -- see loadMorePosts below, which never touches this call.
const requestFeed = () => {
  if (['following', 'saved'].includes(feedMode.value) && !accessToken.value) return Promise.resolve({ data: [], total: 0, page: 1, pageSize: FEED_PAGE_SIZE, totalPages: 1 })
  return api.feed({ pageSize: FEED_PAGE_SIZE, page: 1, feed: feedMode.value }, Boolean(accessToken.value))
}
const { data: feedData, pending: feedPending, error: feedError, refresh: refreshFeedRequest } = await useAsyncData('community-feed', requestFeed)
const accumulatedPosts = ref<any[]>([])
const feedPage = ref(1)
const feedTotalPages = ref(1)
const loadingMore = ref(false)
watch(feedData, (value) => {
  accumulatedPosts.value = value?.data || []
  feedPage.value = value?.page || 1
  feedTotalPages.value = value?.totalPages || 1
}, { immediate: true })
const posts = computed(() => accumulatedPosts.value.map(normalizePost))
const hasMorePosts = computed(() => feedPage.value < feedTotalPages.value)
const loadMorePosts = async () => {
  if (loadingMore.value || !hasMorePosts.value) return
  loadingMore.value = true
  try {
    const next = await api.feed({ pageSize: FEED_PAGE_SIZE, page: feedPage.value + 1, feed: feedMode.value }, Boolean(accessToken.value)) as any
    accumulatedPosts.value = [...accumulatedPosts.value, ...(next.data || [])]
    feedPage.value = next.page || feedPage.value + 1
    feedTotalPages.value = next.totalPages || feedTotalPages.value
  } catch (error: any) {
    toast.add({ title: 'Não foi possível carregar mais publicações', description: error?.data?.message || error?.message, color: 'error' })
  } finally { loadingMore.value = false }
}
const feedEmptyMessage = computed(() => {
  if (!accessToken.value && feedMode.value === 'following') return 'Entre na sua conta para ver as publicações de quem você segue.'
  if (!accessToken.value && feedMode.value === 'saved') return 'Entre na sua conta para acessar suas publicações salvas.'
  if (feedMode.value === 'following') return 'Você ainda não segue perfis com publicações recentes.'
  if (feedMode.value === 'saved') return 'Nenhuma publicação foi salva ainda.'
  return 'Ainda não há publicações. Seja a primeira pessoa a compartilhar algo.'
})
const refreshFeed = async () => { editingPost.value = null; await refreshFeedRequest() }
const removePost = async (post: CommunityPostView) => {
  if (!confirm('Excluir esta publicação? Ela continuará disponível para auditoria administrativa.')) return
  try { await api.removePost(post.id); toast.add({ title: 'Publicação removida', color: 'success' }); await refreshFeedRequest() }
  catch (error: any) { toast.add({ title: 'Não foi possível remover', description: error?.data?.message || error?.message, color: 'error' }) }
}
const requireSession = () => { if (accessToken.value) return true; navigateTo('/login'); return false }
const runSocial = async (action: () => Promise<unknown>, success?: string) => {
  if (!requireSession()) return
  try { await action(); if (success) toast.add({ title: success, color: 'success' }); await refreshFeedRequest() }
  catch (error: any) { toast.add({ title: 'Não foi possível concluir', description: error?.data?.message || error?.message, color: 'error' }) }
}
const reactPost = (post: CommunityPostView, type: any) => runSocial(() => api.react({ postId: post.id, type }))
const reactComment = (comment: any, type: any) => runSocial(() => api.react({ commentId: comment.id, type }))
const savePost = (post: CommunityPostView) => runSocial(() => api.toggleSave(post.id), post.viewer.saved ? 'Removido dos salvos' : 'Publicação salva')
const repostPost = (post: CommunityPostView) => runSocial(() => api.toggleRepost(post.id), post.viewer.reposted ? 'Repost removido' : 'Repostado na Community')
const commentPost = (post: CommunityPostView, content: string, parentId?: string) => runSocial(() => api.comment(post.id, { content, parentId }), parentId ? 'Resposta publicada' : 'Comentário publicado')
const updateComment = (comment: any, content: string) => runSocial(() => api.updateComment(comment.id, { content }), 'Comentário atualizado')
const removeComment = (comment: any) => { if (confirm('Excluir este comentário?')) runSocial(() => api.removeComment(comment.id), 'Comentário removido') }
const onImgError = (event: Event) => { (event.target as HTMLImageElement).src = '/favicon.png' }
const copyPostLink = async (post: CommunityPostView) => {
  const url = `${window.location.origin}/comunidade?post=${post.id}`
  await navigator.clipboard.writeText(url); toast.add({ title: 'Link copiado', color: 'success' })
}

// Permalink view: opened via ?post=<id> (the exact URL copyPostLink builds
// above) -- a real, working single-post fetch, not a dead query param.
// Visibility/ownership are enforced by the backend (getPost), same rules as
// the feed -- a post hidden from this viewer 404s here too.
const viewingPostId = computed(() => (typeof route.query.post === 'string' ? route.query.post : null))
const viewingPostRaw = ref<any>(null)
const viewingPostPending = ref(false)
const viewingPostError = ref(false)
const viewingPost = computed(() => (viewingPostRaw.value ? normalizePost(viewingPostRaw.value) : null))
const loadViewingPost = async (id: string) => {
  viewingPostPending.value = true; viewingPostError.value = false; viewingPostRaw.value = null
  try { viewingPostRaw.value = await api.getPost(id, Boolean(accessToken.value)) }
  catch { viewingPostError.value = true }
  finally { viewingPostPending.value = false }
}
watch(viewingPostId, (id) => { if (id) loadViewingPost(id) }, { immediate: true })
const closePostView = () => navigateTo({ path: '/comunidade', query: { ...route.query, post: undefined } })
const onEditFromModal = (post: CommunityPostView) => { closePostView(); editingPost.value = post }
const onRemoveFromModal = async (post: CommunityPostView) => { await removePost(post); closePostView() }

const sectionLabels: Record<string, string> = {
  explorar: 'Explorar', perfil: 'Perfil', guilds: 'Guilds', eventos: 'Eventos', quests: 'Quests', conquistas: 'Conquistas', salvos: 'Salvos'
}
const sectionTitle = computed(() => sectionLabels[activeSection.value] || 'Community')

// Own-profile summary card (left rail + mobile drawer). Real data only -- no
// mock fallback. Guests (no session) simply don't get a card; see the
// sign-in prompt rendered in their place in the template.
//
// Why `accessToken` is in the watch list (not just the username): this
// fetch hits the `/authenticated` variant of the profile endpoint, which
// needs the `Authorization` header useCommunityApi() attaches from
// `accessToken.value`. On SSR (and on the very first client tick before
// hydration finishes reading the session out of localStorage),
// `accessToken.value` is empty -- only `user` is known that early (it comes
// from the auth-state cookie; the token itself is deliberately never
// cookied, see useAuth.ts). A request fired without the token 401s and
// resolves to null. Watching only `user.value?.username` never notices that
// -- the username doesn't change once the token shows up a moment later, so
// without this the fetch would never retry and the rail would stay empty
// for an authenticated user forever, not just briefly.
const { data: ownProfileData, pending: profilePending, refresh: refreshOwnProfile } = await useAsyncData(
  'community-own-profile-summary',
  () => (user.value?.username ? api.publicProfile(user.value.username, true) : Promise.resolve(null)),
  { watch: [() => user.value?.username, accessToken] }
)
const profile = computed(() => (ownProfileData.value ? mapProfileResponse(ownProfileData.value) : null))
const leftRailView = computed(() => resolveCommunityLeftRailView({
  activeSection: activeSection.value,
  authStatus: authStatus.value,
  hasProfile: Boolean(profile.value),
  profilePending: profilePending.value
}))

watch(profileDrawerOpen, (open) => {
  if (import.meta.client) document.body.style.overflow = open ? 'hidden' : ''
})
watch([activeFeedTab, activeSection, accessToken], () => refreshFeedRequest())

// Keyboard basics for the two custom Teleport dialogs above (profile drawer,
// post-view modal) -- neither is a UModal, so nothing handles Escape-to-close
// for them otherwise.
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  if (viewingPostId.value) closePostView()
  else if (profileDrawerOpen.value) profileDrawerOpen.value = false
}
onMounted(() => { if (import.meta.client) document.addEventListener('keydown', onKeydown) })
onBeforeUnmount(() => {
  if (import.meta.client) { document.body.style.overflow = ''; document.removeEventListener('keydown', onKeydown) }
})
</script>

<style scoped>
.community-page { min-height: 100vh; background: var(--bm-page-bg); color: var(--bm-text); }
.community-intro { border-bottom: 1px solid var(--bm-border); background: var(--bm-surface-soft); }
.community-intro > div { width: min(100% - 32px, 1500px); margin-inline: auto; padding-block: 26px; }
.community-intro h1 { margin-top: 5px; color: var(--bm-heading); font-family: Cinzel, serif; font-size: clamp(1.45rem, 2.2vw, 2rem); font-weight: 800; }
.community-intro p:last-child { max-width: 680px; margin-top: 5px; color: var(--bm-muted); font-size: 0.76rem; line-height: 1.6; }
.community-layout { display: grid; grid-template-columns: minmax(250px, 280px) minmax(480px, 1fr) minmax(270px, 310px); width: min(100% - 32px, 1500px); margin-inline: auto; align-items: start; gap: 18px; padding-block: 20px 56px; }
/* Guest: no session means no left rail content ever, so don't reserve a
   dead 250-280px column for it -- collapse to center+right and let the
   sign-in banner span full width above them instead. */
.community-layout.is-guest-layout { grid-template-columns: minmax(0, 1fr) minmax(270px, 310px); }
.community-layout__left, .community-layout__right { position: sticky; top: calc(var(--bm-header-height) + 76px); }
.community-signin-banner { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; border: 1px solid var(--bm-border); border-radius: 10px; background: var(--bm-surface-strong); padding: 14px 18px; color: var(--bm-muted); font-size: 0.76rem; box-shadow: var(--shadow-panel); }
.community-signin-banner a { border: 1px solid var(--bm-red); border-radius: 7px; padding: 8px 16px; color: var(--bm-red); font-weight: 800; white-space: nowrap; }
.community-signin-banner a:hover { background: var(--bm-red); color: #fff; }
.community-user-rail-skeleton { display: grid; gap: 12px; padding: 20px 18px; }
.community-user-rail-skeleton__avatar, .community-user-rail-skeleton__line, .community-user-rail-skeleton__block { border-radius: 8px; background: linear-gradient(90deg, var(--bm-surface) 25%, var(--bm-surface-strong) 50%, var(--bm-surface) 75%); background-size: 200% 100%; animation: community-skeleton-shimmer 1.4s ease-in-out infinite; }
.community-user-rail-skeleton__avatar { width: 92px; height: 92px; margin-inline: auto; border-radius: 50%; }
.community-user-rail-skeleton__line { height: 14px; margin-inline: auto; }
.community-user-rail-skeleton__block { height: 90px; }
@keyframes community-skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.community-signin-prompt button { border: 1px solid var(--bm-border-strong); border-radius: 7px; padding: 8px 14px; color: var(--bm-wine); font-size: 0.72rem; font-weight: 800; }
.community-signin-prompt button:hover { border-color: var(--bm-red); background: var(--bm-surface); }
.community-layout__center { min-width: 0; display: grid; align-content: start; gap: 14px; }
.community-layout__center.is-wide { grid-column: 1 / -1; width: min(100%, 900px); margin-inline: auto; }
.community-feed-tabs { display: flex; align-items: center; border-bottom: 1px solid var(--bm-border); }
.community-feed-tabs button { min-height: 40px; border-bottom: 2px solid transparent; padding: 0 16px; color: var(--bm-muted); font-size: 0.7rem; font-weight: 900; }
.community-feed-tabs button:hover, .community-feed-tabs button.is-active { border-color: var(--bm-red); color: var(--bm-wine); }
.community-feed-refresh { display: grid; margin-left: auto; width: 34px; height: 34px; place-items: center; color: var(--bm-muted); }
.community-feed-refresh:hover { color: var(--bm-wine); }
.community-feed-refresh:disabled { opacity: 0.6; }
.community-feed-refresh .is-spinning { animation: community-spin 800ms linear infinite; }
@keyframes community-spin { to { transform: rotate(360deg); } }
.community-feed { display: grid; gap: 14px; }
.community-load-more { justify-self: center; border: 1px solid var(--bm-border); border-radius: 999px; padding: 10px 22px; color: var(--bm-wine); font-size: 0.7rem; font-weight: 900; }
.community-load-more:hover { background: var(--bm-surface-strong); }
.community-load-more:disabled { opacity: 0.6; }
.community-saved-heading{border:1px solid var(--bm-border);border-radius:10px;background:var(--bm-surface-strong);padding:16px}.community-saved-heading h2{margin-top:4px;color:var(--bm-heading);font-family:Cinzel,serif;font-size:1rem}
.community-feed-state { display: grid; min-height: 170px; place-items: center; border: 1px dashed var(--bm-border); border-radius: 10px; background: var(--bm-surface-strong); padding: 24px; color: var(--bm-muted); font-size: 0.72rem; text-align: center; }
.community-feed-state.is-error { color: var(--bm-red); }
.community-mobile-profile { display: none; }
.community-signin-prompt { display: grid; gap: 10px; border: 1px dashed var(--bm-border); border-radius: 10px; background: var(--bm-surface-strong); padding: 20px 16px; text-align: center; color: var(--bm-muted); font-size: 0.72rem; }
.community-signin-prompt a { color: var(--bm-wine); font-weight: 800; }
.community-drawer-backdrop { position: fixed; z-index: 80; inset: 0; background: rgb(16 16 16 / 0.48); backdrop-filter: blur(2px); }
.community-drawer { position: fixed; z-index: 90; top: 0; bottom: 0; left: 0; width: min(330px, 90vw); overflow-y: auto; background: var(--bm-surface-soft); box-shadow: 22px 0 55px rgb(16 16 16 / 0.2); }
.community-drawer__head { position: sticky; z-index: 2; top: 0; display: flex; min-height: 54px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--bm-border); background: var(--bm-surface-soft); padding: 8px 14px; color: var(--bm-heading); font-family: Cinzel, serif; }
.community-post-modal { position: fixed; z-index: 90; top: 6vh; left: 50%; transform: translateX(-50%); width: min(560px, 92vw); max-height: 88vh; overflow-y: auto; border: 1px solid var(--bm-border); border-radius: 12px; background: var(--bm-surface-soft); box-shadow: 0 30px 70px rgb(16 16 16 / 0.35); }
.community-post-modal__body { padding: 14px; }
.community-fade-enter-active, .community-fade-leave-active { transition: opacity 180ms ease; }.community-fade-enter-from, .community-fade-leave-to { opacity: 0; }
.community-drawer-enter-active, .community-drawer-leave-active { transition: transform 220ms ease; }.community-drawer-enter-from, .community-drawer-leave-to { transform: translateX(-100%); }
@media (max-width: 1199px) {
  .community-layout { grid-template-columns: minmax(0, 1fr) minmax(260px, 300px); max-width: 1050px; }
  .community-layout__left { display: none; }.community-layout__right { grid-column: 2; }.community-layout__center { grid-column: 1; grid-row: 1; }
  .community-mobile-profile { display: flex; min-height: 54px; align-items: center; gap: 10px; border: 1px solid var(--bm-border); border-radius: 9px; background: var(--bm-surface-soft); padding: 8px 12px; text-align: left; }
  .community-mobile-profile img { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }.community-mobile-profile span { min-width: 0; flex: 1; }.community-mobile-profile strong, .community-mobile-profile small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.community-mobile-profile strong { color: var(--bm-heading); font-size: 0.74rem; }.community-mobile-profile small { margin-top: 2px; color: var(--bm-muted); font-size: 0.62rem; }
}
@media (max-width: 899px) { .community-layout { grid-template-columns: minmax(0, 1fr); max-width: 700px; }.community-layout__right { display: none !important; } }
@media (max-width: 767px) {
  .community-intro { margin-top: 42px; }.community-intro > div { width: 100%; padding: 20px 14px; }.community-intro h1 { font-size: 1.28rem; }
  .community-layout { width: 100%; padding: 12px 10px 40px; }.community-layout__center { gap: 11px; }.community-feed { gap: 11px; }
  .community-feed-tabs { overflow-x: auto; }.community-feed-tabs button { flex: 1; padding-inline: 10px; white-space: nowrap; }
}
</style>

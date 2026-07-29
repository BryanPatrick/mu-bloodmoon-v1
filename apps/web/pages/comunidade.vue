<template>
  <main class="min-h-screen bg-black text-white">
    <section class="mx-auto grid w-full max-w-[1500px] gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_310px]">
      <div class="grid content-start gap-4">
        <header class="border-b border-white/10 pb-5">
          <p class="bm-kicker">Comunidade Blood Moon</p>
          <h1 class="mt-2 font-display text-3xl font-black uppercase">Mural dos jogadores</h1>
          <p class="mt-2 text-xs font-semibold leading-6 text-white/55">Compartilhe conquistas, estratégias e histórias do servidor.</p>
        </header>

        <form v-if="isLoggedIn && showProfileEditor" class="bm-panel grid gap-3 rounded-md p-4" @submit.prevent="saveProfile">
          <div class="flex items-center justify-between gap-3">
            <div><p class="bm-kicker">Perfil social</p><h2 class="mt-1 font-display text-xl">Minha identidade na comunidade</h2></div>
            <button class="community-action" type="button" @click="closeProfileEditor">Fechar</button>
          </div>
          <input v-model="profileForm.displayName" class="bm-admin-input" maxlength="100" placeholder="Nome de exibição" required>
          <textarea v-model="profileForm.bio" class="bm-admin-input min-h-20 py-3" maxlength="2000" placeholder="Biografia" />
          <div class="grid gap-3 sm:grid-cols-2">
            <input v-model="profileForm.avatarUrl" class="bm-admin-input" placeholder="URL do avatar">
            <input v-model="profileForm.coverUrl" class="bm-admin-input" placeholder="URL da capa">
          </div>
          <label class="flex items-center gap-2 text-xs text-white/60"><input v-model="profileForm.isPublic" type="checkbox"> Perfil público</label>
          <div class="flex justify-end"><UButton type="submit" color="error">Salvar perfil</UButton></div>
        </form>

        <form v-if="isLoggedIn" class="bm-panel grid gap-3 rounded-md p-4" @submit.prevent="publish">
          <div class="flex items-center gap-3">
            <span class="grid size-9 place-items-center rounded-full bg-ember/15 text-ember"><UserRound class="size-4" /></span>
            <div>
              <strong class="text-sm">{{ user?.name }}</strong>
              <p class="text-[10px] text-white/40">@{{ user?.username }}</p>
            </div>
          </div>
          <input v-model="composer.title" class="bm-admin-input" maxlength="191" placeholder="Título opcional">
          <textarea v-model="composer.content" class="bm-admin-input min-h-24 resize-y py-3" maxlength="10000" placeholder="O que está acontecendo em Blood Moon?" required />
          <input v-model="composer.mediaUrl" class="bm-admin-input" placeholder="URL de imagem ou vídeo (opcional)">
          <div class="flex justify-end">
            <UButton type="submit" :loading="busy" color="error"><Send class="mr-2 size-4" /> Publicar</UButton>
          </div>
        </form>
        <div v-else class="bm-panel flex items-center justify-between gap-4 rounded-md p-4">
          <p class="text-xs font-semibold text-white/55">Entre na sua conta para publicar, comentar e reagir.</p>
          <NuxtLink class="bm-button-glass rounded-md px-4 py-2 text-xs font-black" to="/login?redirect=/comunidade">Entrar</NuxtLink>
        </div>

        <p v-if="message" class="rounded-md border border-ember/30 bg-ember/10 px-4 py-3 text-xs font-bold">{{ message }}</p>

        <article v-for="post in feed.data" :key="post.id" class="bm-panel rounded-md p-4">
          <header class="flex items-start justify-between gap-3">
            <NuxtLink class="flex min-w-0 items-center gap-3" :to="`/comunidade/perfil/${post.author.username}`">
              <span class="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/5">
                <img v-if="post.author.communityProfile?.avatarUrl" :src="post.author.communityProfile.avatarUrl" alt="" class="size-full object-cover">
                <UserRound v-else class="size-4 text-white/35" />
              </span>
              <span class="min-w-0">
                <strong class="block truncate text-sm">{{ post.author.communityProfile?.displayName || post.author.name }}</strong>
                <small class="text-[10px] text-white/38">@{{ post.author.username }} · {{ date(post.createdAt) }}</small>
              </span>
            </NuxtLink>
            <div class="flex gap-2">
              <span v-if="post.isPinned" class="bm-status">Fixado</span>
              <span v-if="post.isFeatured" class="bm-status text-ember">Destaque</span>
            </div>
          </header>
          <h2 v-if="post.title" class="mt-4 font-display text-xl font-black">{{ post.title }}</h2>
          <p class="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/72">{{ post.content }}</p>
          <div v-if="post.media?.length" class="mt-4 grid gap-2 sm:grid-cols-2">
            <img v-for="(media, index) in post.media" :key="`${post.id}-${index}`" :src="typeof media === 'string' ? media : media.url" alt="" class="max-h-96 w-full rounded-md border border-white/10 object-cover">
          </div>
          <div class="mt-4 flex items-center gap-2 border-t border-white/8 pt-3">
            <button class="community-action" type="button" :disabled="!isLoggedIn" @click="react(post.id)">
              <Heart class="size-4" /> {{ post._count.reactions }}
            </button>
            <button class="community-action" type="button" @click="toggleComments(post.id)">
              <MessageCircle class="size-4" /> {{ post._count.comments }}
            </button>
            <button class="community-action ml-auto" type="button" :disabled="!isLoggedIn" @click="report(post.id)">
              <Flag class="size-4" /> Denunciar
            </button>
          </div>
          <div v-if="openComments.has(post.id)" class="mt-3 grid gap-3 border-t border-white/8 pt-3">
            <div v-for="comment in post.comments" :key="comment.id" class="rounded-md bg-white/[0.035] p-3">
              <strong class="text-xs">{{ comment.author.communityProfile?.displayName || comment.author.name }}</strong>
              <p class="mt-1 text-xs leading-5 text-white/60">{{ comment.content }}</p>
            </div>
            <form v-if="isLoggedIn" class="flex gap-2" @submit.prevent="comment(post.id)">
              <input v-model="commentDrafts[post.id]" class="bm-admin-input" placeholder="Escreva um comentário" required>
              <UButton type="submit" color="neutral" variant="soft" square aria-label="Comentar"><Send class="size-4" /></UButton>
            </form>
          </div>
        </article>

        <div v-if="!feed.data.length && !loading" class="bm-panel grid min-h-52 place-items-center rounded-md text-center">
          <div><MessagesSquare class="mx-auto size-8 text-white/20" /><p class="mt-3 text-xs text-white/45">Ainda não há publicações.</p></div>
        </div>
        <nav v-if="feed.totalPages > 1" class="flex justify-center gap-2">
          <UButton color="neutral" variant="soft" :disabled="page <= 1" @click="page--">Anterior</UButton>
          <span class="px-3 py-2 text-xs text-white/50">{{ page }} / {{ feed.totalPages }}</span>
          <UButton color="neutral" variant="soft" :disabled="page >= feed.totalPages" @click="page++">Próxima</UButton>
        </nav>
      </div>

      <aside class="grid h-fit gap-4 lg:sticky lg:top-24">
        <section class="bm-panel rounded-md p-4">
          <p class="bm-kicker">Quests do site</p>
          <h2 class="mt-2 font-display text-xl font-black">Desafios ativos</h2>
          <div class="mt-4 grid gap-3">
            <article v-for="quest in quests" :key="quest.id" class="rounded-md border border-white/8 bg-white/[0.03] p-3">
              <strong class="text-sm">{{ quest.name }}</strong>
              <p class="mt-1 text-[11px] leading-5 text-white/48">{{ quest.description }}</p>
              <UButton v-if="isLoggedIn" class="mt-3" size="xs" color="neutral" variant="soft" @click="join(quest.id)">Participar</UButton>
            </article>
            <p v-if="!quests.length" class="text-xs text-white/40">Nenhuma quest ativa.</p>
          </div>
        </section>
        <NuxtLink v-if="isLoggedIn" class="bm-panel flex items-center gap-3 rounded-md p-4 transition hover:border-ember/30" :to="`/comunidade/perfil/${user?.username}`">
          <UserRound class="size-5 text-ember" /><span class="text-xs font-black">Ver meu perfil social</span>
        </NuxtLink>
      </aside>
    </section>
  </main>
</template>

<script setup lang="ts">
import { Flag, Heart, MessageCircle, MessagesSquare, Send, UserRound } from 'lucide-vue-next'

const api = useCommunityApi()
const route = useRoute()
const router = useRouter()
const { isLoggedIn, user } = useAuth()
const page = ref(1)
const feed = ref<any>({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 1 })
const quests = ref<any[]>([])
const composer = reactive({ title: '', content: '', mediaUrl: '' })
const profileForm = reactive({ displayName: '', bio: '', avatarUrl: '', coverUrl: '', isPublic: true })
const commentDrafts = reactive<Record<string, string>>({})
const openComments = ref(new Set<string>())
const busy = ref(false)
const loading = ref(false)
const message = ref('')
const showProfileEditor = computed(() => route.query.painel === 'perfil')

const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
const load = async () => {
  loading.value = true
  try { [feed.value, quests.value] = await Promise.all([api.feed({ page: page.value }), api.quests()]) }
  finally { loading.value = false }
}
const publish = async () => {
  busy.value = true
  try {
    await api.createPost({ title: composer.title, content: composer.content, media: composer.mediaUrl ? [{ url: composer.mediaUrl }] : [] })
    composer.title = ''; composer.content = ''; composer.mediaUrl = ''; message.value = 'Publicação criada.'
    page.value = 1; await load()
  } catch (error: any) { message.value = error?.data?.message || 'Não foi possível publicar.' }
  finally { busy.value = false }
}
const react = async (postId: string) => { await api.react({ postId, type: 'LIKE' }); await load() }
const toggleComments = (id: string) => {
  const next = new Set(openComments.value)
  next.has(id) ? next.delete(id) : next.add(id)
  openComments.value = next
}
const comment = async (postId: string) => {
  await api.comment(postId, { content: commentDrafts[postId] })
  commentDrafts[postId] = ''; await load()
}
const report = async (postId: string) => {
  const reason = window.prompt('Motivo da denúncia:')
  if (!reason) return
  await api.report({ postId, reason }); message.value = 'Denúncia enviada para moderação.'
}
const join = async (id: string) => { await api.joinQuest(id); message.value = 'Você entrou na quest.' }
const loadProfile = async () => {
  if (!isLoggedIn.value) return
  const data:any = await api.myProfile()
  Object.assign(profileForm, {
    displayName: data.communityProfile?.displayName || data.name || '',
    bio: data.communityProfile?.bio || '',
    avatarUrl: data.communityProfile?.avatarUrl || '',
    coverUrl: data.communityProfile?.coverUrl || '',
    isPublic: data.communityProfile?.isPublic !== false
  })
}
const saveProfile = async () => {
  await api.updateProfile(profileForm)
  message.value = 'Perfil social atualizado.'
}
const closeProfileEditor = () => router.replace({ query: {} })
watch(page, load)
watch(showProfileEditor, (open) => { if (open) loadProfile() })
onMounted(async () => { await load(); if (showProfileEditor.value) await loadProfile() })
</script>

<style scoped>
.community-action {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  color: rgb(255 255 255 / 45%);
  font-size: 0.75rem;
  font-weight: 700;
  transition: color 160ms ease, background-color 160ms ease, opacity 160ms ease;
}
.community-action:hover {
  color: white;
  background: rgb(255 255 255 / 5%);
}
.community-action:disabled {
  cursor: not-allowed;
  opacity: 0.3;
}
</style>

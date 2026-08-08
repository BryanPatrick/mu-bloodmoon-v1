<script setup lang="ts">
import { Ban, Camera, Check, MoreHorizontal, Pencil, Share2, UserMinus, UserPlus } from 'lucide-vue-next'
import type { CommunitySocialProfile } from '~/features/community/data/stage-two.mock'

const props = defineProps<{ profile: CommunitySocialProfile; ownProfile?: boolean }>()
const emit = defineEmits<{ edit: [] }>()
const api = useCommunityApi()
const following = ref(false)
const blocked = ref(false)
const blockedBy = ref(false)
const followingBusy = ref(false)
const copied = ref(false)
const toast = useToast()

const share = async () => {
  if (!import.meta.client) return
  const url = window.location.href
  if (navigator.share) await navigator.share({ title: props.profile.displayName, url })
  else await navigator.clipboard.writeText(url)
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1800)
}
const toggleFollow = async () => {
  if (followingBusy.value || blocked.value || blockedBy.value) return
  followingBusy.value = true
  try {
    if (following.value) await api.unfollowProfile(props.profile.username)
    else await api.followProfile(props.profile.username)
    following.value = !following.value
  } finally { followingBusy.value = false }
}
const blockProfile = async () => {
  if (blocked.value) {
    try { await api.unblockProfile(props.profile.username); blocked.value = false; toast.add({ title: 'Perfil desbloqueado', color: 'success' }) }
    catch (error: any) { toast.add({ title: 'Não foi possível desbloquear', description: error?.data?.message || error?.message, color: 'error' }) }
    return
  }
  if (!confirm(`Bloquear @${props.profile.username}? Vocês deixarão de se seguir e o conteúdo será ocultado.`)) return
  try { await api.blockProfile(props.profile.username); following.value = false; blocked.value = true; toast.add({ title: 'Perfil bloqueado', color: 'success' }) }
  catch (error: any) { toast.add({ title: 'Não foi possível bloquear', description: error?.data?.message || error?.message, color: 'error' }) }
}
const moreItems = computed(() => [[{ label: blocked.value ? 'Desbloquear perfil' : 'Bloquear perfil', icon: Ban, color: 'error' as const, onSelect: blockProfile }]])

onMounted(async () => {
  if (props.ownProfile) return
  try {
    const state = await api.profileRelationship(props.profile.username)
    following.value = state.following
    blocked.value = state.blocked
    blockedBy.value = state.blockedBy
  } catch {
    // Visitantes sem sessao continuam vendo o perfil publico normalmente.
  }
})
</script>

<template>
  <header class="community-profile-head">
    <div class="community-profile-head__cover" :style="{ backgroundImage: `url(${profile.coverUrl})` }" />
    <div class="community-profile-head__grid">
      <section class="community-profile-head__identity">
        <div class="community-profile-head__avatar"><img :src="profile.avatarUrl" :alt="profile.displayName"><button v-if="ownProfile" type="button" aria-label="Alterar foto" @click="emit('edit')"><Camera class="size-4" /></button></div>
        <div class="community-profile-head__facts"><span>Personagem principal</span><strong>{{ profile.mainCharacter.name }}</strong><small>{{ profile.mainCharacter.className }} · {{ profile.guild }}</small></div>
      </section>

      <section class="community-profile-head__details">
        <dl class="community-profile-head__stats"><div><strong>{{ profile.stats.posts }}</strong><span>publicações</span></div><div><strong>{{ profile.stats.followers }}</strong><span>seguidores</span></div><div><strong>{{ profile.stats.following }}</strong><span>seguindo</span></div></dl>
        <div class="community-profile-head__achievements"><div><strong>{{ profile.achievements.length }}</strong><span>conquistas</span></div><div class="community-profile-head__badges"><CommunityAchievementPopover v-for="achievement in profile.achievements.slice(0, 5)" :key="achievement.id" :achievement="achievement" /></div></div>
        <div class="community-profile-head__bio"><h1>{{ profile.displayName }}</h1><p>@{{ profile.username }}</p><div>{{ profile.bio }}</div></div>
        <div class="community-profile-head__actions">
          <UButton v-if="ownProfile" color="error" size="sm" @click="emit('edit')"><Pencil class="size-4" />Editar perfil</UButton>
          <UButton v-else color="error" size="sm" :loading="followingBusy" :disabled="blocked || blockedBy" @click="toggleFollow"><UserMinus v-if="following" class="size-4" /><UserPlus v-else class="size-4" />{{ blocked ? 'Perfil bloqueado' : blockedBy ? 'Indisponível' : following ? 'Deixar de seguir' : 'Seguir' }}</UButton>
          <UTooltip :text="copied ? 'Link copiado' : 'Compartilhar perfil'"><UButton color="neutral" variant="soft" square aria-label="Compartilhar perfil" @click="share"><Check v-if="copied" class="size-4" /><Share2 v-else class="size-4" /></UButton></UTooltip>
          <UDropdownMenu v-if="!ownProfile" :items="moreItems"><UButton color="neutral" variant="soft" square aria-label="Mais opções"><MoreHorizontal class="size-4" /></UButton></UDropdownMenu>
        </div>
      </section>
    </div>
  </header>
</template>

<style scoped>
.community-profile-head { position: relative; overflow: hidden; border: 1px solid var(--bm-border); border-radius: 10px; background: var(--bm-surface-strong); box-shadow: var(--shadow-panel); }
.community-profile-head__cover { height: 150px; background-position: center 42%; background-size: cover; opacity: .42; }.community-profile-head__cover::after { content: ''; display: block; height: 100%; background: linear-gradient(180deg, transparent, var(--bm-surface-strong)); }
.community-profile-head__grid { display: grid; grid-template-columns: 270px minmax(0,1fr); gap: 28px; margin-top: -52px; padding: 0 26px 26px; }
.community-profile-head__identity { position: relative; z-index: 1; }.community-profile-head__avatar { position: relative; width: 150px; height: 150px; margin-inline: auto; }.community-profile-head__avatar img { width: 100%; height: 100%; border: 5px solid var(--bm-surface-strong); border-radius: 50%; object-fit: cover; }.community-profile-head__avatar button { position: absolute; right: 7px; bottom: 7px; display: grid; width: 34px; height: 34px; place-items: center; border: 3px solid var(--bm-surface-strong); border-radius: 50%; background: var(--bm-red); color: white; }
.community-profile-head__facts { margin-top: 14px; border-top: 1px solid var(--bm-border); padding-top: 13px; text-align: center; }.community-profile-head__facts span,.community-profile-head__facts small { display: block; color: var(--bm-muted); font-size: .62rem; }.community-profile-head__facts span { font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }.community-profile-head__facts strong { display: block; margin-top: 5px; color: var(--bm-heading); font-family: Cinzel,serif; font-size: .9rem; }
.community-profile-head__details { position: relative; z-index: 1; padding-top: 62px; }.community-profile-head__stats { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); border-bottom: 1px solid var(--bm-border); padding-bottom: 15px; }.community-profile-head__stats div { text-align: center; }.community-profile-head__stats div + div { border-left: 1px solid var(--bm-border); }.community-profile-head__stats strong,.community-profile-head__stats span { display: block; }.community-profile-head__stats strong { color: var(--bm-heading); font-family: Cinzel,serif; font-size: 1rem; }.community-profile-head__stats span { color: var(--bm-muted); font-size: .62rem; }
.community-profile-head__achievements { display: flex; min-height: 62px; align-items: center; gap: 18px; border-bottom: 1px solid var(--bm-border); }.community-profile-head__achievements > div:first-child strong,.community-profile-head__achievements > div:first-child span { display:block; }.community-profile-head__achievements > div:first-child strong { color: var(--bm-wine); font-family:Cinzel,serif; }.community-profile-head__achievements > div:first-child span { color:var(--bm-muted); font-size:.6rem; }.community-profile-head__badges { display:flex; gap:6px; }
.community-profile-head__bio { padding-top: 16px; }.community-profile-head__bio h1 { color:var(--bm-heading); font-family:Cinzel,serif; font-size:1.45rem; }.community-profile-head__bio > p { color:var(--bm-red); font-size:.68rem; font-weight:800; }.community-profile-head__bio > div { max-width: 650px; margin-top:9px; color:var(--bm-muted); font-size:.74rem; line-height:1.65; }.community-profile-head__actions { display:flex; gap:7px; margin-top:15px; }
@media(max-width:767px){.community-profile-head__cover{height:110px}.community-profile-head__grid{grid-template-columns:1fr;gap:10px;margin-top:-46px;padding:0 14px 18px}.community-profile-head__avatar{width:108px;height:108px}.community-profile-head__facts{margin-top:8px}.community-profile-head__details{padding-top:0}.community-profile-head__achievements{justify-content:center}.community-profile-head__bio{text-align:center}.community-profile-head__actions{justify-content:center}.community-profile-head__stats{margin-top:5px}}
</style>

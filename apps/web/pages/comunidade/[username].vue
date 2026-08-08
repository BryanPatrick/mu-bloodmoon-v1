<template>
  <div class="community-profile-page">
    <CommunitySubheader active-section="perfil" :profile-username="username" />

    <main>
      <div v-if="pending" class="community-profile-state">Carregando perfil...</div>

      <div v-else-if="notFound" class="community-profile-state">
        <p>Este perfil não existe ou não está disponível publicamente.</p>
        <NuxtLink to="/comunidade" class="community-profile-state__link">Voltar para a Community</NuxtLink>
      </div>

      <div v-else-if="loadError" class="community-profile-state is-error">
        <p>Não foi possível carregar este perfil agora.</p>
        <UButton color="error" variant="soft" size="sm" @click="refresh()">Tentar novamente</UButton>
      </div>

      <template v-else-if="profile">
        <CommunityProfileHeader :profile="profile" :own-profile="ownProfile" @edit="editorOpen = true" />
        <CommunityProfileTabs :profile="profile" />
      </template>
    </main>

    <CommunityProfileEditor
      v-if="editorOpen && profile"
      :profile="profile"
      :saving="saving"
      :error="saveError"
      @close="closeEditor"
      @save="saveProfile"
    />
  </div>
</template>

<script setup lang="ts">
import type { CommunitySocialProfile } from '~/features/community/types/profile'
import { mapProfileResponse } from '~/features/community/map-profile-response'

const route = useRoute()
const api = useCommunityApi()
const { user, loadSession } = useAuth()
const toast = useToast()

const editorOpen = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)

const username = computed(() => String(route.params.username || '').toLowerCase())
const ownProfile = computed(() => Boolean(user.value?.username && user.value.username.toLowerCase() === username.value))

const { data: profileData, pending, error, refresh } = await useAsyncData(
  () => `community-profile-${username.value}`,
  () => api.publicProfile(username.value),
  { watch: [username] }
)

const profile = computed(() => (profileData.value ? mapProfileResponse(profileData.value) : null))
const errorStatus = computed(() => {
  const err = error.value as any
  return err?.response?.status || err?.statusCode || err?.status
})
const notFound = computed(() => errorStatus.value === 404)
const loadError = computed(() => Boolean(error.value) && !notFound.value)

useHead(() => ({ title: profile.value ? `${profile.value.displayName} | Community` : 'Perfil | Community' }))

const closeEditor = () => {
  if (saving.value) return
  editorOpen.value = false
  saveError.value = null
}

const saveProfile = async (value: CommunitySocialProfile) => {
  if (!ownProfile.value || saving.value) return
  saving.value = true
  saveError.value = null
  try {
    await api.updateProfile({
      displayName: value.displayName,
      bio: value.bio,
      avatarUrl: value.avatarUrl,
      coverUrl: value.coverUrl,
      mainCharacterName: value.mainCharacter.name,
      mainCharacterClass: value.mainCharacter.className,
      guildName: value.guild,
      profileVisibility: value.privacy.profile,
      charactersVisibility: value.privacy.characters,
      equipmentVisibility: value.privacy.equipment,
      statisticsVisibility: value.privacy.statistics,
      guildVisibility: value.privacy.guild,
      activityVisibility: value.privacy.activity
    })
    // Re-fetch from the server rather than trusting the submitted form as the
    // new truth -- confirms what was actually persisted, catches any
    // server-side normalization (trim/slice/defaults) the form doesn't know about.
    await refresh()
    editorOpen.value = false
    toast.add({ title: 'Perfil atualizado', color: 'success' })
  } catch (err: any) {
    saveError.value = err?.data?.message || err?.message || 'Não foi possível salvar o perfil. Tente novamente.'
  } finally {
    saving.value = false
  }
}

onMounted(() => { loadSession() })
</script>

<style scoped>
.community-profile-page { min-height: 100vh; background: var(--bm-page-bg); color: var(--bm-text); }
.community-profile-page main { display: grid; width: min(100% - 32px, 1180px); margin-inline: auto; gap: 16px; padding-block: 20px 58px; }
.community-profile-state { display: grid; min-height: 220px; place-items: center; gap: 12px; border: 1px dashed var(--bm-border); border-radius: 10px; background: var(--bm-surface-strong); padding: 32px; text-align: center; color: var(--bm-muted); font-size: 0.78rem; }
.community-profile-state.is-error { color: var(--bm-red); }
.community-profile-state__link { color: var(--bm-wine); font-weight: 800; }
@media (max-width: 767px) {
  .community-profile-page main { width: 100%; padding: 56px 10px 38px; }
}
</style>

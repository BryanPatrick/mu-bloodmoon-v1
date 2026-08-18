<template>
  <div class="guild-profile-page">
    <main>
      <div v-if="pending" class="guild-profile-state">Carregando guilda...</div>

      <div v-else-if="notFound" class="guild-profile-state">
        <p>Esta guilda não existe ou não está disponível.</p>
        <NuxtLink to="/guilds" class="guild-profile-state__link">Voltar para o diretório</NuxtLink>
      </div>

      <div v-else-if="loadError" class="guild-profile-state is-error">
        <p>Não foi possível carregar esta guilda agora.</p>
        <UButton color="error" variant="soft" size="sm" @click="refresh()">Tentar novamente</UButton>
      </div>

      <template v-else-if="guild">
        <GuildProfileHeader :guild="guild" :can-manage="canManage">
          <template v-if="canManage" #actions>
            <UButton color="neutral" variant="soft" size="sm" @click="showEditor = true">
              <Pencil class="size-4" />Editar perfil
            </UButton>
            <!-- Visually and behaviorally separate from "Editar perfil":
            LEADER-only (not OFFICER, unlike profile edit), and distinctly
            styled since it's a destructive, step-up-gated action. -->
            <UButton v-if="isLeader" color="error" variant="outline" size="sm" @click="showDisbandModal = true">
              <ShieldAlert class="size-4" />Encerrar guilda
            </UButton>
          </template>
        </GuildProfileHeader>
        <GuildProfileTabs :guild="guild" :slug="slug" @refresh="refresh" />

        <GuildProfileEditor
          v-if="showEditor"
          :guild="guild"
          :slug="slug"
          @close="showEditor = false"
          @saved="onSaved"
        />

        <GuildDisbandModal
          v-if="showDisbandModal"
          :guild="guild"
          :slug="slug"
          @close="showDisbandModal = false"
          @disbanded="onDisbanded"
        />
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Pencil, ShieldAlert } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const api = useGuildsApi()
const { user } = useAuth()
const toast = useToast()

const slug = computed(() => String(route.params.slug || '').toLowerCase())

const { data: guild, pending, error, refresh } = await useAsyncData(
  () => `guild-profile-${slug.value}`,
  () => api.bySlug(slug.value),
  { watch: [slug] }
)

// Backend authority: guilds.service.ts's updateGuild/uploadEmblem/
// uploadBanner all gate on assertRole(['LEADER', 'OFFICER']) -- mirrored
// here for UI visibility only, never trusted as the real access control.
// A direct API call from a non-LEADER/OFFICER member still gets 403 from
// the backend regardless of what this computed shows.
const membership = computed(() => {
  const members = (guild.value as any)?.members as Array<{ roleKey: string, account?: { id?: string } }> | undefined
  return members?.find((member) => member.account?.id === user.value?.id)
})
const canManage = computed(() => membership.value?.roleKey === 'LEADER' || membership.value?.roleKey === 'OFFICER')
// Disband is LEADER-only, stricter than canManage (which also allows
// OFFICER for profile edits) -- mirrors the backend's assertRole(['LEADER'])
// in disbandGuild(), same UI-visibility-only caveat as canManage above.
const isLeader = computed(() => membership.value?.roleKey === 'LEADER')

const showEditor = ref(false)
// Always re-fetch from the API after any save (profile fields or an
// emblem/banner upload) rather than trusting a locally-merged guess --
// keeps the header/tabs showing the server's real, current state.
const onSaved = () => refresh()

const showDisbandModal = ref(false)
// No refresh() here -- the guild is gone from this leader's perspective.
// Navigating away entirely is what actually clears stale guild context
// (step 5.5 point 18): a refresh would just re-fetch the now-DISBANDED
// guild and leave this same page rendering it as if it still mattered.
const onDisbanded = () => {
  toast.add({ title: 'Guilda encerrada', color: 'success' })
  router.push('/guilds')
}

const errorStatus = computed(() => {
  const err = error.value as any
  return err?.response?.status || err?.statusCode || err?.status
})
const notFound = computed(() => errorStatus.value === 404)
const loadError = computed(() => Boolean(error.value) && !notFound.value)

useHead(() => ({ title: guild.value ? `${(guild.value as any).name} | Guildas Blood Moon` : 'Guilda | Blood Moon' }))
</script>

<style scoped>
.guild-profile-page { min-height: 100vh; background: var(--bm-page-bg); color: var(--bm-text); }
.guild-profile-page main { display: grid; width: min(100% - 32px, 1180px); margin-inline: auto; gap: 16px; padding-block: 24px 60px; }
.guild-profile-state { display: grid; min-height: 260px; place-items: center; gap: 12px; border: 1px dashed var(--bm-border); border-radius: 10px; background: var(--bm-surface-strong); padding: 32px; text-align: center; color: var(--bm-muted); font-size: 0.78rem; }
.guild-profile-state.is-error { color: var(--bm-red); }
.guild-profile-state__link { color: var(--bm-wine); font-weight: 800; }
@media (max-width: 767px) {
  .guild-profile-page main { width: 100%; padding: 20px 10px 40px; }
}
</style>

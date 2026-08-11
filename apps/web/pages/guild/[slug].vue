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
        <GuildProfileHeader :guild="guild" />
        <GuildProfileTabs :guild="guild" :slug="slug" @refresh="refresh" />
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const api = useGuildsApi()

const slug = computed(() => String(route.params.slug || '').toLowerCase())

const { data: guild, pending, error, refresh } = await useAsyncData(
  () => `guild-profile-${slug.value}`,
  () => api.bySlug(slug.value),
  { watch: [slug] }
)

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

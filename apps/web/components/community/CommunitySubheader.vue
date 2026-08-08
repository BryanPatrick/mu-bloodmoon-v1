<script setup lang="ts">
import { Bell, Menu, Plus, Search, X } from 'lucide-vue-next'

const props = withDefaults(defineProps<{ activeSection: string; profileUsername?: string }>(), { profileUsername: 'bryan' })
defineEmits<{ openProfile: [] }>()

const searchOpen = ref(false)
const links = [
  ['home', 'Home'], ['explorar', 'Explorar'], ['perfil', 'Perfil'], ['guilds', 'Guilds'],
  ['eventos', 'Eventos'], ['quests', 'Quests'], ['conquistas', 'Conquistas'], ['salvos', 'Salvos']
]
</script>

<template>
  <div class="community-subheader">
    <div class="community-subheader__inner">
      <button class="community-profile-toggle" type="button" aria-label="Abrir resumo do perfil" @click="$emit('openProfile')">
        <Menu class="size-4" /><span>Meu espaço</span>
      </button>

      <nav class="community-subheader__nav" aria-label="Navegação da Community">
        <NuxtLink
          v-for="([key, label]) in links"
          :key="key"
          :to="key === 'home' ? '/comunidade' : key === 'perfil' ? `/comunidade/${props.profileUsername}` : { path: '/comunidade', query: { section: key } }"
          class="community-subheader__link"
          :class="{ 'is-active': activeSection === key }"
        >
          {{ label }}
        </NuxtLink>
      </nav>

      <div class="community-subheader__actions">
        <div v-if="searchOpen" class="community-search">
          <Search class="size-4" />
          <input aria-label="Buscar na Community" placeholder="Buscar na Community">
          <button type="button" aria-label="Fechar busca" @click="searchOpen = false"><X class="size-4" /></button>
        </div>
        <UTooltip v-else text="Buscar na Community"><UButton color="neutral" variant="ghost" square aria-label="Buscar" @click="searchOpen = true"><Search class="size-4" /></UButton></UTooltip>
        <UTooltip text="Notificações"><UButton color="neutral" variant="ghost" square aria-label="Notificações"><Bell class="size-4" /></UButton></UTooltip>
        <UButton color="error" size="sm"><Plus class="size-4" /> Criar</UButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.community-subheader { position: sticky; z-index: 35; top: var(--bm-header-height); border-bottom: 1px solid var(--bm-border); background: rgb(245 242 236 / 0.96); backdrop-filter: blur(14px); }
.community-subheader__inner { display: flex; min-height: 58px; width: min(100% - 32px, 1500px); margin-inline: auto; align-items: center; justify-content: space-between; gap: 18px; }
.community-subheader__nav { display: flex; min-width: 0; align-self: stretch; align-items: center; gap: 4px; overflow-x: auto; scrollbar-width: none; }
.community-subheader__nav::-webkit-scrollbar { display: none; }
.community-subheader__link { display: inline-flex; height: 100%; align-items: center; border-bottom: 2px solid transparent; padding: 0 10px; color: var(--bm-muted); font-size: 0.75rem; font-weight: 800; white-space: nowrap; }
.community-subheader__link:hover, .community-subheader__link.is-active { border-bottom-color: var(--bm-red); color: var(--bm-wine); }
.community-subheader__actions { display: flex; flex: none; align-items: center; gap: 4px; }
.community-subheader__actions :deep(button[aria-label="Buscar"]), .community-subheader__actions :deep(button[aria-label="Notificações"]) { color: var(--bm-wine); }
.community-profile-toggle { display: none; align-items: center; gap: 7px; color: var(--bm-wine); font-size: 0.72rem; font-weight: 800; }
.community-search { display: flex; width: min(280px, 26vw); height: 36px; align-items: center; gap: 8px; border: 1px solid var(--bm-border-strong); border-radius: 8px; background: var(--bm-surface-strong); padding: 0 10px; }
.community-search input { min-width: 0; flex: 1; outline: none; background: transparent; color: var(--bm-text); font-size: 0.72rem; }
@media (max-width: 1199px) { .community-profile-toggle { display: inline-flex; } }
@media (max-width: 767px) {
  .community-subheader { top: 68px; }
  .community-subheader__inner { width: 100%; min-height: 52px; padding-inline: 12px; }
  .community-subheader__nav { order: 2; position: absolute; inset: 52px 0 auto; height: 42px; border-bottom: 1px solid var(--bm-border); background: var(--bm-page-bg); padding-inline: 10px; }
  .community-subheader__link { padding-inline: 9px; font-size: 0.68rem; }
  .community-subheader__actions .community-search { position: absolute; inset: 6px 10px; z-index: 2; width: auto; }
}
</style>

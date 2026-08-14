<script setup lang="ts">
import { Bookmark, Flag, ScrollText, Shield, UserRound, UsersRound } from 'lucide-vue-next'
import type { CommunitySocialProfile } from '~/features/community/types/profile'

defineProps<{ profile: Pick<CommunitySocialProfile, 'displayName' | 'username' | 'avatarUrl' | 'mainCharacter' | 'guild' | 'achievements'>; compact?: boolean }>()
defineEmits<{ close: [] }>()
const onImgError = (event: Event) => { (event.target as HTMLImageElement).src = '/favicon.png' }

const shortcuts = [
  { label: 'Meu perfil', icon: UserRound, section: 'perfil' },
  { label: 'Personagens', icon: Shield, section: 'perfil' },
  { label: 'Guild', icon: UsersRound, section: 'guilds' },
  { label: 'Quests', icon: ScrollText, section: 'quests' },
  { label: 'Salvos', icon: Bookmark, section: 'salvos' }
]
</script>

<template>
  <aside class="community-user-rail" :class="{ 'is-compact': compact }">
    <div class="community-user-rail__profile">
      <div class="community-avatar">
        <img :src="profile.avatarUrl || '/favicon.png'" :alt="profile.displayName" @error="onImgError">
        <UTooltip text="Alterar avatar"><button type="button" aria-label="Alterar avatar">+</button></UTooltip>
      </div>
      <h2 class="community-user-rail__name">{{ profile.displayName }}</h2>
      <p class="community-user-rail__username">@{{ profile.username }}</p>
    </div>

    <dl class="community-user-rail__facts">
      <div><dt>Personagem principal</dt><dd>{{ profile.mainCharacter?.name || 'Não encontrado' }}</dd><small v-if="profile.mainCharacter?.className">{{ profile.mainCharacter.className }}</small></div>
      <div><dt>Guild</dt><dd>{{ profile.guild || 'Não encontrado' }}</dd></div>
    </dl>

    <section class="community-user-rail__section">
      <p class="community-label"><Flag class="size-3.5" /> Conquistas</p>
      <div v-if="profile.achievements?.length" class="community-achievements">
        <CommunityAchievementPopover v-for="achievement in profile.achievements" :key="achievement.id" :achievement="achievement" />
      </div>
      <p v-else class="community-empty-hint">Nenhuma conquista encontrada.</p>
    </section>

    <nav class="community-user-rail__section" aria-label="Atalhos da conta">
      <p class="community-label">Atalhos</p>
      <NuxtLink v-for="shortcut in shortcuts" :key="shortcut.label" :to="shortcut.section === 'perfil' ? `/comunidade/${profile.username}` : { path: '/comunidade', query: { section: shortcut.section } }" class="community-shortcut" @click="$emit('close')">
        <component :is="shortcut.icon" class="size-4" />{{ shortcut.label }}
      </NuxtLink>
    </nav>
  </aside>
</template>

<style scoped>
.community-user-rail { border: 1px solid var(--bm-border); border-radius: 10px; background: var(--bm-surface-soft); box-shadow: var(--shadow-panel); }
.community-user-rail__profile { display: grid; justify-items: center; border-bottom: 1px solid var(--bm-border); padding: 24px 18px 18px; text-align: center; }
.community-avatar { position: relative; width: 92px; height: 92px; }
.community-avatar img { width: 100%; height: 100%; border: 2px solid var(--bm-surface-strong); border-radius: 50%; object-fit: cover; box-shadow: 0 0 0 1px var(--bm-border-strong), var(--shadow-panel); }
.community-avatar button { position: absolute; right: -2px; bottom: 1px; display: grid; width: 26px; height: 26px; place-items: center; border: 2px solid var(--bm-surface-soft); border-radius: 50%; background: var(--bm-red); color: white; font-weight: 900; }
.community-user-rail h2 { margin-top: 14px; color: var(--bm-heading); font-family: Cinzel, serif; font-size: 1.15rem; font-weight: 800; }
.community-user-rail__profile p { margin-top: 2px; color: var(--bm-muted); font-size: 0.74rem; }
.community-empty-hint { margin-top: 10px; color: var(--bm-muted); font-size: 0.72rem; font-style: italic; }
.community-user-rail__name, .community-user-rail__username { overflow: hidden; max-width: 100%; text-overflow: ellipsis; white-space: nowrap; }
.community-user-rail__facts { display: grid; gap: 14px; padding: 18px; }
.community-user-rail__facts div + div { border-top: 1px solid var(--bm-border); padding-top: 14px; }
.community-user-rail dt, .community-label { display: flex; align-items: center; gap: 6px; color: var(--bm-muted); font-size: 0.62rem; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
.community-user-rail dd { margin-top: 4px; color: var(--bm-text); font-size: 0.8rem; font-weight: 800; }
.community-user-rail small { color: var(--bm-muted); font-size: 0.67rem; }
.community-user-rail__section { border-top: 1px solid var(--bm-border); padding: 18px; }
.community-achievements { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }
.community-shortcut { display: flex; align-items: center; gap: 9px; margin-top: 4px; border-radius: 7px; padding: 9px 8px; color: var(--bm-muted); font-size: 0.72rem; font-weight: 750; }
.community-shortcut:hover { background: var(--bm-surface); color: var(--bm-wine); }
.is-compact { width: min(310px, 88vw); min-height: 100%; border: 0; border-radius: 0; box-shadow: none; }
</style>

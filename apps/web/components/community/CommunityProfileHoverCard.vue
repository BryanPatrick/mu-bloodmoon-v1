<script setup lang="ts">
import { Eye, Shield, Trophy, UserPlus } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  username: string
  name: string
  avatarUrl: string
  mainCharacter?: string
  guild?: string
  achievementCount?: number
}>(), { mainCharacter: 'Personagem não informado', guild: 'Sem guild', achievementCount: 0 })

const following = ref(false)
</script>

<template>
  <UPopover mode="hover" :content="{ side: 'bottom', align: 'start', sideOffset: 8 }">
    <slot><button class="community-profile-trigger" type="button">@{{ props.username }}</button></slot>
    <template #content>
      <article class="community-hover-card">
        <header><img :src="props.avatarUrl" :alt="props.name"><div><strong>{{ props.name }}</strong><span>@{{ props.username }}</span></div></header>
        <dl>
          <div><Shield class="size-3.5" /><span>{{ props.mainCharacter }}</span></div>
          <div><span class="community-guild-mark">G</span><span>{{ props.guild }}</span></div>
          <div><Trophy class="size-3.5" /><span>{{ props.achievementCount }} conquistas</span></div>
        </dl>
        <footer>
          <button type="button" @click="following = !following"><UserPlus class="size-3.5" />{{ following ? 'Seguindo' : 'Seguir' }}</button>
          <NuxtLink :to="`/comunidade/${props.username}`"><Eye class="size-3.5" />Ver perfil</NuxtLink>
        </footer>
      </article>
    </template>
  </UPopover>
</template>

<style scoped>
.community-profile-trigger { color: var(--bm-muted); font-size: inherit; }
.community-hover-card { width: 260px; padding: 15px; color: var(--bm-text); }
.community-hover-card header { display: flex; align-items: center; gap: 10px; }
.community-hover-card header img { width: 48px; height: 48px; border: 1px solid var(--bm-border); border-radius: 50%; object-fit: cover; }
.community-hover-card header strong, .community-hover-card header span { display: block; }.community-hover-card header strong { font-size: .78rem; }.community-hover-card header span { color: var(--bm-muted); font-size: .64rem; }
.community-hover-card dl { display: grid; gap: 7px; margin-top: 13px; border-block: 1px solid var(--bm-border); padding-block: 10px; }.community-hover-card dl div { display: flex; align-items: center; gap: 7px; color: var(--bm-muted); font-size: .66rem; }.community-guild-mark { display: grid; width: 14px; height: 14px; place-items: center; border-radius: 3px; background: var(--bm-wine); color: white; font-size: .5rem; font-weight: 900; }
.community-hover-card footer { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 11px; }.community-hover-card footer button, .community-hover-card footer a { display: flex; min-height: 32px; align-items: center; justify-content: center; gap: 5px; border: 1px solid var(--bm-border); border-radius: 6px; color: var(--bm-wine); font-size: .62rem; font-weight: 900; }.community-hover-card footer button { background: var(--bm-red); color: white; }
</style>

<script setup lang="ts">
import { ArrowRight, CalendarDays, Hash, UserPlus } from 'lucide-vue-next'
import { communityAdsMock, communityEventsMock, communitySuggestionsMock, communityTrendingMock } from '~/features/community/data/stage-one.mock'

const eventBadgeClass: Record<string, string> = { Servidor: 'server', Community: 'community', Guild: 'guild', Pessoal: 'personal', Campeonato: 'championship' }
</script>

<template>
  <aside class="community-right-rail">
    <CommunityAdCard :ad="communityAdsMock[0]!" />
    <CommunityAdCard :ad="communityAdsMock[1]!" />

    <section class="community-side-section">
      <header><CalendarDays class="size-4" /><h2>Próximos eventos</h2></header>
      <div v-for="event in communityEventsMock" :key="event.id" class="community-event">
        <time>{{ event.time }}</time>
        <div><span :class="eventBadgeClass[event.type]">{{ event.type }}</span><strong>{{ event.title }}</strong></div>
      </div>
      <NuxtLink :to="{ path: '/comunidade', query: { section: 'eventos' } }" class="community-side-link">Ver calendário <ArrowRight class="size-3.5" /></NuxtLink>
    </section>

    <section class="community-side-section">
      <header><Hash class="size-4" /><h2>Em alta</h2></header>
      <NuxtLink v-for="topic in communityTrendingMock" :key="topic" :to="{ path: '/comunidade', query: { section: 'explorar', topic } }" class="community-trend">{{ topic }}</NuxtLink>
    </section>

    <section class="community-side-section">
      <header><UserPlus class="size-4" /><h2>Quem seguir</h2></header>
      <CommunityProfileHoverCard v-for="suggestion in communitySuggestionsMock" :key="suggestion.id" :username="suggestion.username" :name="suggestion.name" :avatar-url="suggestion.avatarUrl" :main-character="suggestion.description">
        <div class="community-suggestion">
          <img :src="suggestion.avatarUrl" :alt="suggestion.name">
          <div><strong>{{ suggestion.name }}</strong><p>@{{ suggestion.username }}</p></div>
          <UTooltip text="Seguir estará disponível em uma próxima etapa"><button type="button" aria-label="Seguir"><UserPlus class="size-3.5" /></button></UTooltip>
        </div>
      </CommunityProfileHoverCard>
    </section>
  </aside>
</template>

<style scoped>
.community-right-rail { display: grid; align-content: start; gap: 14px; }
.community-side-section { border: 1px solid var(--bm-border); border-radius: 9px; background: var(--bm-surface-soft); padding: 14px; box-shadow: var(--shadow-panel); }
.community-side-section header { display: flex; align-items: center; gap: 7px; border-bottom: 1px solid var(--bm-border); padding-bottom: 10px; color: var(--bm-wine); }
.community-side-section h2 { font-size: 0.68rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
.community-event { display: grid; grid-template-columns: 44px 1fr; gap: 9px; padding-block: 10px; }
.community-event + .community-event { border-top: 1px solid var(--bm-border); }
.community-event time { color: var(--bm-wine); font-size: 0.7rem; font-weight: 900; }
.community-event span { display: inline-flex; border-radius: 3px; padding: 2px 4px; color: white; font-size: 0.5rem; font-weight: 900; text-transform: uppercase; }
.community-event span.server { background: #6c0c10; }.community-event span.community { background: #49607b; }.community-event span.guild { background: #6b5426; }.community-event span.personal { background: #6b486e; }.community-event span.championship { background: #936914; }
.community-event strong { display: block; margin-top: 4px; color: var(--bm-text); font-size: 0.68rem; }
.community-side-link { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--bm-border); padding-top: 10px; color: var(--bm-red); font-size: 0.65rem; font-weight: 900; }
.community-trend { display: block; padding: 9px 4px; color: var(--bm-muted); font-size: 0.7rem; font-weight: 800; }.community-trend + .community-trend { border-top: 1px solid var(--bm-border); }.community-trend:hover { color: var(--bm-wine); }
.community-suggestion { display: flex; align-items: center; gap: 9px; padding-block: 10px; }.community-suggestion + .community-suggestion { border-top: 1px solid var(--bm-border); }
.community-suggestion img { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; }.community-suggestion > div { min-width: 0; flex: 1; }.community-suggestion strong { display: block; overflow: hidden; color: var(--bm-text); font-size: 0.68rem; text-overflow: ellipsis; white-space: nowrap; }.community-suggestion p { color: var(--bm-muted); font-size: 0.6rem; }.community-suggestion button { display: grid; width: 29px; height: 29px; place-items: center; border: 1px solid var(--bm-border); border-radius: 50%; color: var(--bm-red); }
</style>

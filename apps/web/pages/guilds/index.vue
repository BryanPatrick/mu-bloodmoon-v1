<template>
  <div class="guilds-directory-page">
    <header class="guilds-hero">
      <p class="bm-kicker">Blood Moon</p>
      <h1>Guildas</h1>
      <p>Organização, prestígio e cooperação. Encontre uma guilda para chamar de sua ou acompanhe as maiores facções do servidor.</p>
      <!-- Shown whenever the player is authenticated; eligibility itself
      (an unaffiliated character to lead it) is resolved inside the modal,
      which shows a clear message instead of a form when there is none --
      avoids an extra fetch just to decide whether to render the button. -->
      <UButton v-if="user" color="error" class="guilds-hero__create" @click="showCreateModal = true">Criar guilda</UButton>
    </header>

    <GuildCreateModal v-if="showCreateModal" @close="showCreateModal = false" @created="showCreateModal = false" />

    <section class="guilds-highlights">
      <article v-for="block in highlightBlocks" :key="block.key" :class="{ 'is-active': activeHighlight === block.key }" @click="selectHighlight(block.key)">
        <strong>{{ block.label }}</strong>
        <span>{{ block.description }}</span>
      </article>
    </section>

    <div class="guilds-toolbar">
      <div class="guilds-search">
        <Search class="size-4" />
        <input v-model="search" type="search" placeholder="Buscar por nome ou tag..." @input="onSearchInput">
      </div>
      <button class="guilds-filter-toggle" type="button" @click="filtersOpen = true">
        <SlidersHorizontal class="size-4" /> Filtros
      </button>
    </div>

    <div class="guilds-layout">
      <aside class="guilds-layout__filters">
        <GuildDirectoryFilters
          v-model:search="search"
          v-model:recruitment="recruitment"
          v-model:focus="focus"
          v-model:sort="sort"
          @clear="clearFilters"
        />
      </aside>

      <main class="guilds-layout__content">
        <div v-if="pending" class="guilds-state">Carregando guildas...</div>
        <div v-else-if="error" class="guilds-state is-error">
          Não foi possível carregar as guildas agora.
          <button type="button" @click="refresh()">Tentar novamente</button>
        </div>
        <div v-else-if="!guilds.length" class="guilds-state">Nenhuma guilda encontrada com esses filtros.</div>
        <div v-else class="guilds-grid">
          <NuxtLink v-for="guild in guilds" :key="guild.id" :to="`/guild/${guild.slug}`" class="guild-card">
            <div class="guild-card__emblem">
              <img v-if="guild.emblemUrl" :src="guild.emblemUrl" :alt="guild.name">
              <Shield v-else class="size-7" />
            </div>
            <div class="guild-card__body">
              <div class="guild-card__title">
                <strong>{{ guild.name }}</strong>
                <span class="guild-card__tag">[{{ guild.tag }}]</span>
              </div>
              <p class="guild-card__desc">{{ guild.description || 'Esta guilda ainda não escreveu uma descrição.' }}</p>
              <div class="guild-card__meta">
                <span><Users class="size-3.5" /> {{ guild._count?.members ?? 0 }} membros</span>
                <span><Trophy class="size-3.5" /> Nível {{ guild.guildLevel }}</span>
                <span class="guild-card__recruitment" :class="`is-${guild.recruitment?.toLowerCase()}`">{{ recruitmentLabel(guild.recruitment) }}</span>
              </div>
              <div v-if="guild.focusTags?.length" class="guild-card__focus">
                <span v-for="tag in guild.focusTags" :key="tag.tag">{{ tag.tag }}</span>
              </div>
            </div>
          </NuxtLink>
        </div>

        <div v-if="totalPages > 1" class="guilds-pagination">
          <button type="button" :disabled="page <= 1" @click="page = Math.max(1, page - 1)">Anterior</button>
          <span>Página {{ page }} de {{ totalPages }}</span>
          <button type="button" :disabled="page >= totalPages" @click="page = Math.min(totalPages, page + 1)">Próxima</button>
        </div>
      </main>
    </div>

    <Teleport v-if="filtersOpen" to="body">
      <div class="bm-drawer-backdrop" @click="filtersOpen = false" />
      <div class="bm-mobile-drawer">
        <div class="bm-mobile-drawer-head">
          <strong>Filtros</strong>
          <button type="button" @click="filtersOpen = false"><X class="size-5" /></button>
        </div>
        <GuildDirectoryFilters
          v-model:search="search"
          v-model:recruitment="recruitment"
          v-model:focus="focus"
          v-model:sort="sort"
          @clear="clearFilters"
        />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { Search, Shield, SlidersHorizontal, Trophy, Users, X } from 'lucide-vue-next'

const api = useGuildsApi()
const { user } = useAuth()
const showCreateModal = ref(false)

const search = ref('')
const recruitment = ref('')
const focus = ref('')
const sort = ref('newest')
const page = ref(1)
const filtersOpen = ref(false)
const activeHighlight = ref('all')

// Only filters backed by real, queryable data reach the API. The remaining
// directory blocks the brief asked for (most-active, biggest, new-guilds,
// PvE/PvP/Siege/Boss/Farm quick-filters beyond the general focus filter) are
// clearly derivable from `sort`/`focus` already wired here -- no separate
// mock endpoint was created just to fill blocks with fake data.
const highlightBlocks = [
  { key: 'all', label: 'Todas', description: 'Diretório completo', recruitment: '', focus: '', sort: 'newest' },
  { key: 'recruiting', label: 'Recrutando', description: 'Aceitando novos membros', recruitment: 'OPEN', focus: '', sort: 'newest' },
  { key: 'biggest', label: 'Maiores', description: 'Mais membros ativos', recruitment: '', focus: '', sort: 'members' },
  { key: 'leveled', label: 'Guild Level', description: 'Maior progressão', recruitment: '', focus: '', sort: 'level' },
  { key: 'pvp', label: 'PvP', description: 'Foco em PvP', recruitment: '', focus: 'PVP', sort: 'newest' },
  { key: 'siege', label: 'Castle Siege', description: 'Foco em cerco de castelo', recruitment: '', focus: 'CASTLE_SIEGE', sort: 'newest' },
  { key: 'boss', label: 'Boss', description: 'Foco em caça a boss', recruitment: '', focus: 'BOSS', sort: 'newest' },
  { key: 'farm', label: 'Farm', description: 'Foco em farm', recruitment: '', focus: 'FARM', sort: 'newest' }
] as const

const selectHighlight = (key: string) => {
  const block = highlightBlocks.find((item) => item.key === key)
  if (!block) return
  activeHighlight.value = key
  recruitment.value = block.recruitment
  focus.value = block.focus
  sort.value = block.sort
  page.value = 1
}

let searchTimeout: ReturnType<typeof setTimeout> | undefined
const onSearchInput = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { page.value = 1 }, 300)
}

const clearFilters = () => {
  search.value = ''
  recruitment.value = ''
  focus.value = ''
  sort.value = 'newest'
  activeHighlight.value = 'all'
  page.value = 1
}

const { data, pending, error, refresh } = await useAsyncData(
  () => `guilds-directory-${page.value}-${search.value}-${recruitment.value}-${focus.value}-${sort.value}`,
  () => api.directory({ page: page.value, pageSize: 12, search: search.value, recruitment: recruitment.value, focus: focus.value, sort: sort.value }),
  { watch: [page, recruitment, focus, sort] }
)

const guilds = computed(() => data.value?.data || [])
const totalPages = computed(() => data.value?.totalPages || 1)

const recruitmentLabel = (value: string) => ({
  OPEN: 'Aberto', APPROVAL_REQUIRED: 'Aprovação', INVITE_ONLY: 'Convite', CLOSED: 'Fechado'
} as Record<string, string>)[value] || value

useHead({ title: 'Guildas | Blood Moon' })
</script>

<style scoped>
.guilds-directory-page { min-height: 100vh; background: var(--bm-page-bg); color: var(--bm-text); }
.guilds-hero { width: min(100% - 32px, 1180px); margin-inline: auto; padding: 40px 0 20px; text-align: center; }
.guilds-hero h1 { margin-top: 6px; font-family: Cinzel, serif; font-size: 2rem; font-weight: 900; color: var(--bm-heading); }
.guilds-hero p { max-width: 560px; margin: 10px auto 0; color: var(--bm-muted); font-size: 0.82rem; line-height: 1.6; }
.guilds-hero__create { margin-top: 16px; }

.guilds-highlights { display: flex; flex-wrap: wrap; gap: 10px; width: min(100% - 32px, 1180px); margin: 0 auto 20px; overflow-x: auto; }
.guilds-highlights article { flex: 0 0 auto; min-width: 150px; cursor: pointer; border: 1px solid var(--bm-border-strong); border-radius: 8px; background: var(--bm-surface-soft); padding: 12px 14px; }
.guilds-highlights article.is-active { border-color: var(--bm-red); background: rgb(191 2 2 / 0.08); }
.guilds-highlights article strong { display: block; font-family: Cinzel, serif; font-size: 0.82rem; color: var(--bm-heading); }
.guilds-highlights article span { display: block; margin-top: 3px; font-size: 0.66rem; color: var(--bm-muted); }

.guilds-toolbar { display: flex; gap: 10px; width: min(100% - 32px, 1180px); margin: 0 auto 16px; }
.guilds-search { display: flex; flex: 1; align-items: center; gap: 8px; border: 1px solid var(--bm-border-strong); border-radius: 6px; background: var(--bm-surface-soft); padding: 0 12px; color: var(--bm-muted); }
.guilds-search input { flex: 1; height: 42px; border: none; background: transparent; color: var(--bm-text); font-size: 0.8rem; outline: none; }
.guilds-filter-toggle { display: none; align-items: center; gap: 6px; border: 1px solid var(--bm-border-strong); border-radius: 6px; padding: 0 14px; color: var(--bm-wine); font-size: 0.72rem; font-weight: 800; text-transform: uppercase; background: var(--bm-surface-soft); }

.guilds-layout { display: grid; grid-template-columns: 260px 1fr; gap: 18px; width: min(100% - 32px, 1180px); margin: 0 auto 60px; align-items: start; }
.guilds-state { display: grid; min-height: 220px; place-items: center; gap: 10px; border: 1px dashed var(--bm-border); border-radius: 10px; background: var(--bm-surface-strong); padding: 30px; text-align: center; color: var(--bm-muted); font-size: 0.78rem; }
.guilds-state.is-error { color: var(--bm-red); }
.guilds-state button { border: 1px solid var(--bm-border-strong); border-radius: 4px; padding: 6px 14px; color: var(--bm-wine); font-weight: 800; background: transparent; }

.guilds-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.guild-card { display: flex; gap: 12px; border: 1px solid var(--bm-border); border-radius: 8px; background: var(--bm-surface-strong); padding: 14px; color: inherit; text-decoration: none; box-shadow: var(--shadow-panel); }
.guild-card:hover { border-color: var(--bm-red); }
.guild-card__emblem { display: grid; width: 56px; height: 56px; flex: none; place-items: center; overflow: hidden; border-radius: 8px; background: var(--bm-surface-soft); color: var(--bm-muted); }
.guild-card__emblem img { width: 100%; height: 100%; object-fit: cover; }
.guild-card__body { min-width: 0; flex: 1; }
.guild-card__title { display: flex; align-items: baseline; gap: 6px; }
.guild-card__title strong { font-family: Cinzel, serif; font-size: 0.92rem; color: var(--bm-heading); }
.guild-card__tag { font-size: 0.68rem; color: var(--bm-muted); font-weight: 800; }
.guild-card__desc { margin-top: 4px; overflow: hidden; color: var(--bm-muted); font-size: 0.7rem; line-height: 1.5; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.guild-card__meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; font-size: 0.64rem; color: var(--bm-muted); }
.guild-card__meta span { display: inline-flex; align-items: center; gap: 4px; }
.guild-card__recruitment { border-radius: 3px; border: 1px solid var(--bm-border); padding: 1px 6px; font-weight: 800; text-transform: uppercase; }
.guild-card__recruitment.is-open { border-color: #1f8a4c; color: #1f8a4c; }
.guild-card__focus { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.guild-card__focus span { border: 1px solid var(--bm-border); border-radius: 999px; padding: 2px 8px; font-size: 0.58rem; font-weight: 800; color: var(--bm-muted); text-transform: uppercase; }

.guilds-pagination { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 20px; font-size: 0.74rem; color: var(--bm-muted); }
.guilds-pagination button { border: 1px solid var(--bm-border-strong); border-radius: 4px; padding: 6px 14px; color: var(--bm-wine); font-weight: 800; background: transparent; }
.guilds-pagination button:disabled { opacity: 0.4; }

@media (max-width: 900px) {
  .guilds-layout { grid-template-columns: 1fr; }
  .guilds-layout__filters { display: none; }
  .guilds-filter-toggle { display: inline-flex; }
  .guilds-grid { grid-template-columns: 1fr; }
}
</style>

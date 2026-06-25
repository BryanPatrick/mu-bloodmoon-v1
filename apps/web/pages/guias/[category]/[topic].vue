<template>
  <div>
    <template v-if="isFutureGuideLocked">
      <PageHero
        wide
        kicker="Versao futura"
        :title="topicTitle"
        description="Este personagem pertence a uma versao mais atualizada do jogo e ainda nao esta liberado para jogadores no Blood Moon atual."
      />
      <section class="bm-guide-container py-14">
        <div class="bm-panel rounded-md p-8 text-center">
          <p class="bm-kicker">Em organizacao</p>
          <h2 class="mt-3 font-display text-4xl font-black uppercase text-white">Guia bloqueado temporariamente</h2>
          <p class="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 text-zinc-300">
            Nossa versao atual vai ate Rage Fighter. Este atalho fica visivel para indicar conteudo futuro, mas a consulta completa esta liberada somente para administradores.
          </p>
        </div>
      </section>
    </template>

    <template v-else-if="characterGuide">
      <section class="character-hero relative min-h-[calc(100vh-5rem)] overflow-hidden" :class="`character-hero-${topicSlug}`">
        <div class="character-hero-image absolute inset-0 bg-cover bg-center" :style="{ backgroundImage: `url('${characterGuide.heroImage}')` }" />
        <div class="character-hero-shade absolute inset-0" />
        <div class="character-hero-focus absolute inset-0" />

        <div class="bm-guide-container relative z-10 flex min-h-[calc(100vh-5rem)] items-end pb-14 pt-28">
          <div class="max-w-2xl">
            <p class="bm-kicker">Personagem</p>
            <h1 class="mt-4 font-display text-6xl font-extrabold uppercase text-white sm:text-8xl">{{ characterGuide.name }}</h1>
            <p class="mt-3 text-xl font-bold uppercase tracking-[0.28em] text-ember">{{ characterGuide.subtitle }}</p>
            <p class="mt-6 max-w-xl text-base leading-8 text-zinc-100 sm:text-lg">{{ characterGuide.description }}</p>

            <div class="mt-9 grid max-w-xl grid-cols-3 overflow-hidden rounded-md border border-white/15 bg-black/35 backdrop-blur-xl">
              <div v-for="item in characterGuide.stats" :key="item.label" class="border-r border-white/10 p-4 last:border-r-0">
                <span class="block text-[10px] font-extrabold uppercase tracking-[0.24em] text-zinc-400">{{ item.label }}</span>
                <strong class="mt-2 block font-display text-lg text-moon">{{ item.value }}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="bm-guide-container grid gap-8 py-14 lg:grid-cols-[0.8fr_1.2fr]">
        <aside class="grid content-start gap-4">
          <div class="bm-panel rounded-md p-6">
            <p class="bm-kicker">Estilo</p>
            <h2 class="mt-2 font-display text-3xl font-bold text-white">{{ characterGuide.styleTitle }}</h2>
            <p class="mt-4 text-sm leading-7 text-zinc-300">{{ characterGuide.styleDescription }}</p>
          </div>
          <div class="grid gap-3">
            <div v-for="trait in characterGuide.traits" :key="trait" class="bm-button-glass rounded-md px-4 py-3 text-sm font-bold text-white">
              {{ trait }}
            </div>
          </div>
        </aside>

        <article class="bm-panel rounded-md p-6 sm:p-8">
          <p class="bm-kicker">Origem</p>
          <h2 class="mt-2 font-display text-4xl font-bold text-white">{{ characterGuide.originTitle }}</h2>
          <p v-for="paragraph in characterGuide.origin" :key="paragraph" class="mt-5 text-sm leading-8 text-zinc-300 first:mt-5 sm:text-base">
            {{ paragraph }}
          </p>
        </article>
      </section>

      <section class="bg-black/20 py-14">
        <div class="bm-guide-container">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p class="bm-kicker">Kit de combate</p>
              <h2 class="mt-2 font-display text-4xl font-bold text-white">Habilidades</h2>
            </div>
            <span class="rounded-md border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">
              {{ characterGuide.combatTags }}
            </span>
          </div>

          <div class="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article v-for="skill in characterGuide.skills" :key="skill.name" class="bm-panel group rounded-md p-5 transition hover:-translate-y-1 hover:border-blood-400/60">
              <div class="grid size-12 place-items-center rounded-md bg-blood-700/30 font-display text-xl font-bold text-ember ring-1 ring-white/10">
                {{ skill.key }}
              </div>
              <h3 class="mt-5 font-display text-2xl font-bold text-white">{{ skill.name }}</h3>
              <p class="mt-3 text-sm leading-7 text-zinc-400">{{ skill.description }}</p>
            </article>
          </div>
        </div>
      </section>

      <section class="bm-guide-container grid gap-8 py-14 lg:grid-cols-[1fr_380px]">
        <article class="bm-panel rounded-md p-6 sm:p-8">
          <p class="bm-kicker">Como jogar</p>
          <h2 class="mt-2 font-display text-4xl font-bold text-white">{{ characterGuide.playTitle }}</h2>
          <div class="mt-7 grid gap-5">
            <div v-for="tip in characterGuide.tips" :key="tip.title" class="rounded-md border border-white/10 bg-white/[0.035] p-5">
              <h3 class="font-display text-2xl font-bold text-moon">{{ tip.title }}</h3>
              <p class="mt-3 text-sm leading-7 text-zinc-400">{{ tip.description }}</p>
            </div>
          </div>
        </article>

        <aside class="bm-panel rounded-md p-6">
          <p class="bm-kicker">Progressao</p>
          <h2 class="mt-2 font-display text-3xl font-bold text-white">Prioridades</h2>
          <ol class="mt-6 grid gap-4 text-sm text-zinc-300">
            <li v-for="(priority, index) in characterGuide.priorities" :key="priority" class="grid grid-cols-[auto_1fr] gap-3">
              <span class="font-display text-xl font-bold text-ember">0{{ index + 1 }}</span>
              <span class="leading-7">{{ priority }}</span>
            </li>
          </ol>
        </aside>
      </section>

      <section v-if="characterGuide.wiki" class="bg-black/20 py-14">
        <div class="bm-guide-container">
          <div class="max-w-3xl">
            <p class="bm-kicker">Base tecnica</p>
            <h2 class="mt-2 font-display text-4xl font-bold text-white">Dados coletados para wiki</h2>
            <p class="mt-4 text-sm leading-7 text-zinc-400">
              Conteudo bruto organizado a partir das referencias coletadas. Alguns pontos ainda precisam de validacao com a versao e configuracao final do servidor.
            </p>
          </div>

          <div class="mt-8 grid gap-5 lg:grid-cols-2">
            <article v-for="section in characterGuide.wiki.sections" :key="section.title" class="bm-panel rounded-md p-5">
              <p class="bm-kicker">{{ section.kicker }}</p>
              <h3 class="mt-2 font-display text-2xl font-bold text-white">{{ section.title }}</h3>
              <p v-if="section.description" class="mt-3 text-sm leading-7 text-zinc-400">{{ section.description }}</p>
              <div v-if="section.items?.length" class="mt-5 grid gap-2">
                <div v-for="item in section.items" :key="item" class="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm leading-6 text-zinc-300">
                  {{ item }}
                </div>
              </div>
            </article>
          </div>

          <div v-if="characterGuide.wiki.formulas?.length" class="mt-10">
            <p class="bm-kicker">Formulas</p>
            <h3 class="mt-2 font-display text-3xl font-bold text-white">Crescimento e combate</h3>
            <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <article v-for="group in characterGuide.wiki.formulas" :key="group.title" class="bm-panel rounded-md p-5">
                <h4 class="font-display text-xl font-bold text-moon">{{ group.title }}</h4>
                <ul class="mt-4 grid gap-2 text-sm leading-6 text-zinc-300">
                  <li v-for="formula in group.items" :key="formula">{{ formula }}</li>
                </ul>
              </article>
            </div>
          </div>

          <div v-if="characterGuide.wiki.equipment?.length" class="mt-10">
            <p class="bm-kicker">Equipamentos</p>
            <h3 class="mt-2 font-display text-3xl font-bold text-white">Itens catalogados</h3>
            <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <article v-for="group in characterGuide.wiki.equipment" :key="group.title" class="bm-panel rounded-md p-5">
                <h4 class="font-display text-xl font-bold text-moon">{{ group.title }}</h4>
                <p v-if="group.description" class="mt-3 text-sm leading-7 text-zinc-400">{{ group.description }}</p>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span v-for="item in group.items" :key="item" class="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-zinc-300">
                    {{ item }}
                  </span>
                </div>
              </article>
            </div>
          </div>

          <div v-if="characterGuide.wiki.notes?.length" class="mt-10 rounded-md border border-ember/25 bg-ember/10 p-5">
            <p class="bm-kicker">Validacao</p>
            <h3 class="mt-2 font-display text-2xl font-bold text-white">Pontos para revisar antes de publicar</h3>
            <ul class="mt-4 grid gap-2 text-sm leading-6 text-zinc-300">
              <li v-for="note in characterGuide.wiki.notes" :key="note">{{ note }}</li>
            </ul>
          </div>
        </div>
      </section>
    </template>

    <template v-else-if="isSetsGuide">
      <PageHero
        wide
        kicker="Equipamentos"
        title="Sets"
        description="Biblioteca inicial de sets do Blood Moon, reunindo imagens enviadas, referencias coletadas e itens pendentes para completar a wiki."
      />

      <section class="bm-guide-container py-14">
        <article class="bm-panel rounded-md p-5 sm:p-6">
          <div class="flex flex-col gap-4 border-b border-white/10 pb-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p class="bm-kicker">Catalogo de sets</p>
              <h2 class="mt-2 font-display text-3xl font-bold text-white">Sets catalogados</h2>
              <p class="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                Os cards abaixo juntam as pecas que ja temos imagem e tambem mostram os sets que ainda estao apenas como referencia, para facilitar a proxima etapa de coleta e otimizacao.
              </p>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center text-xs font-black uppercase tracking-[0.14em] text-zinc-300">
              <div class="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
                <span class="block font-display text-xl text-white">{{ setGuideStats.total }}</span>
                Sets
              </div>
              <div class="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
                <span class="block font-display text-xl text-white">{{ setGuideStats.withImage }}</span>
                Imagens
              </div>
              <div class="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
                <span class="block font-display text-xl text-white">{{ setGuideStats.missingImage }}</span>
                Pendentes
              </div>
            </div>
          </div>

          <div class="mt-5 grid gap-3 xl:grid-cols-[1fr_180px_180px_180px]">
            <input
              v-model="setSearch"
              class="h-11 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/45 focus:border-blood-400/70"
              placeholder="Buscar set, classe, peca..."
              type="search"
            >
            <select v-model="setClassFilter" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
              <option class="bg-zinc-950 text-white" value="Todos">Todas classes</option>
              <option v-for="className in setClassOptions" :key="className" class="bg-zinc-950 text-white" :value="className">{{ className }}</option>
            </select>
            <select v-model="setImageFilter" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
              <option class="bg-zinc-950 text-white" value="Todos">Todas imagens</option>
              <option class="bg-zinc-950 text-white" value="Com imagem">Com imagem</option>
              <option class="bg-zinc-950 text-white" value="Sem imagem">Sem imagem</option>
            </select>
            <select v-model="setCompatibilityFilter" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
              <option class="bg-zinc-950 text-white" value="Todos">Todas versoes</option>
              <option v-for="compatibility in setCompatibilityOptions" :key="compatibility" class="bg-zinc-950 text-white" :value="compatibility">{{ compatibility }}</option>
            </select>
          </div>

          <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1720px]:grid-cols-5">
            <article
              v-for="set in paginatedSetCards"
              :key="set.key"
              class="overflow-hidden rounded-md border border-white/10 bg-white/[0.04] shadow-soft"
            >
              <div class="relative aspect-[4/3] overflow-hidden bg-black/35">
                <img
                  v-if="set.image"
                  :src="set.image"
                  :alt="set.name"
                  class="h-full w-full object-cover"
                  decoding="async"
                  loading="lazy"
                >
                <div v-else class="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.12),rgba(255,255,255,0.03)_38%,rgba(0,0,0,0.35))] p-5 text-center">
                  <span class="rounded-md border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white/60">
                    Referencia sem imagem
                  </span>
                </div>
                <div class="absolute left-3 top-3 rounded-sm bg-black/60 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-md">
                  {{ set.className }}
                </div>
                <div class="absolute right-3 top-3 rounded-sm px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] backdrop-blur-md" :class="set.image ? 'bg-emerald-500/20 text-emerald-100' : 'bg-ember/20 text-ember'">
                  {{ set.image ? 'Imagem local' : 'Pendente' }}
                </div>
              </div>

              <div class="grid gap-4 p-4">
                <div>
                  <h3 class="font-display text-2xl font-black leading-tight text-white">{{ set.name }}</h3>
                  <p class="mt-2 text-sm leading-6 text-zinc-400">{{ set.description }}</p>
                </div>

                <div class="flex flex-wrap gap-2">
                  <span class="rounded-sm bg-blood-700/25 px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-blood-100">{{ set.compatibility }}</span>
                  <span class="rounded-sm bg-white/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-white/72">{{ set.status }}</span>
                  <span class="rounded-sm bg-ember/15 px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-ember">{{ set.pieces.length }} pecas</span>
                </div>

                <div v-if="set.pieces.length" class="flex flex-wrap gap-2 border-t border-white/10 pt-3">
                  <span v-for="piece in set.pieces" :key="piece" class="rounded-md border border-white/10 bg-black/25 px-2.5 py-1 text-xs font-bold text-zinc-300">
                    {{ piece }}
                  </span>
                </div>
              </div>
            </article>
          </div>

          <div
            v-if="filteredSetCards.length > 0"
            class="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-400"
          >
            <span>Pagina {{ setCurrentPage }} de {{ setTotalPages }} - {{ filteredSetCards.length }} itens</span>
            <div class="flex items-center gap-2">
              <button
                class="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                :disabled="setCurrentPage <= 1"
                @click="setCurrentPage--"
              >
                Anterior
              </button>
              <button
                class="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                :disabled="setCurrentPage >= setTotalPages"
                @click="setCurrentPage++"
              >
                Proxima
              </button>
            </div>
          </div>

          <div v-if="filteredSetCards.length === 0" class="mt-8 rounded-md border border-dashed border-white/15 bg-white/[0.035] p-8 text-center">
            <p class="bm-kicker">Nada encontrado</p>
            <h3 class="mt-2 font-display text-3xl font-black uppercase text-white">Ajuste os filtros</h3>
            <p class="mt-3 text-sm leading-7 text-zinc-400">Nao existe set correspondente aos filtros atuais.</p>
          </div>
        </article>
      </section>
    </template>

    <template v-else>
      <PageHero wide :kicker="categoryTitle" :title="topicTitle" description="Pagina modular com conteudo ficticio, pronta para receber imagens, tabelas e dados vindos do servidor." />
      <section class="bm-guide-container grid gap-6 py-14 lg:grid-cols-[1fr_340px]">
        <article class="bm-panel rounded-md p-6">
          <h2 class="font-display text-3xl font-bold text-white">{{ topicTitle }}</h2>
          <p class="mt-5 text-sm leading-7 text-zinc-300">
            Este guia apresenta uma visao inicial sobre {{ topicTitle.toLowerCase() }} no universo Blood Moon. O conteudo foi estruturado para crescer com descricoes, requisitos, bonus, estrategias, imagens ilustrativas e detalhes de obtencao.
          </p>
          <div class="mt-8 grid gap-4 sm:grid-cols-2">
            <div v-for="block in blocks" :key="block" class="rounded-md border border-white/10 bg-white/[0.04] p-5">
              <h3 class="font-bold text-moon">{{ block }}</h3>
              <p class="mt-3 text-sm leading-7 text-zinc-400">Informacao ficticia para demonstracao, preparada para futura integracao administrativa.</p>
            </div>
          </div>
        </article>
        <aside class="bm-panel rounded-md p-6">
          <h3 class="font-display text-2xl font-bold text-white">Resumo</h3>
          <ul class="mt-5 grid gap-3 text-sm text-zinc-300">
            <li>Categoria: {{ categoryTitle }}</li>
            <li>Conteudo: {{ topicTitle }}</li>
            <li>Status: Mock inicial</li>
            <li>Fonte futura: API ou CMS</li>
          </ul>
        </aside>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { devReferenceAssets, type DevReferenceAsset } from '~/data/devReferenceAssets'

type CharacterGuide = {
  name: string
  subtitle: string
  description: string
  heroImage: string
  stats: Array<{ label: string; value: string }>
  styleTitle: string
  styleDescription: string
  traits: string[]
  originTitle: string
  origin: string[]
  combatTags: string
  skills: Array<{ key: string; name: string; description: string }>
  playTitle: string
  tips: Array<{ title: string; description: string }>
  priorities: string[]
  wiki?: {
    sections: Array<{ kicker: string; title: string; description?: string; items?: string[] }>
    formulas?: Array<{ title: string; items: string[] }>
    equipment?: Array<{ title: string; description?: string; items: string[] }>
    notes?: string[]
  }
}

const route = useRoute()
const { loadSession, user } = useAuth()
const pretty = (value: string) =>
  value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const categorySlug = computed(() => String(route.params.category))
const topicSlug = computed(() => String(route.params.topic))
const categoryTitle = computed(() => pretty(categorySlug.value))
const topicTitle = computed(() => pretty(topicSlug.value))
const blocks = ['Descricao', 'Pontos fortes', 'Pontos fracos', 'Builds', 'Equipamentos', 'Dicas']
const characterCategorySlugs = ['personagens', 'personajes', 'characters']
const futureCharacterSlugs = ['grow-lancer', 'rune-mage', 'slayer', 'gun-crusher', 'white-wizard', 'mage']
const isAdmin = computed(() => user.value?.role === 'admin')
const isFutureGuideLocked = computed(() => characterCategorySlugs.includes(categorySlug.value) && futureCharacterSlugs.includes(topicSlug.value) && !isAdmin.value)
const equipmentCategorySlugs = ['equipamentos', 'equipments', 'equipment']
const isSetsGuide = computed(() => equipmentCategorySlugs.includes(categorySlug.value) && topicSlug.value === 'sets')
const setSearch = ref('')
const setClassFilter = ref('Todos')
const setImageFilter = ref('Todos')
const setCompatibilityFilter = ref('Todos')
const setCurrentPage = ref(1)
const setPageSize = 20

type SetCard = {
  key: string
  name: string
  className: string
  image?: string
  status: DevReferenceAsset['status']
  compatibility: DevReferenceAsset['compatibility']
  pieces: string[]
  description: string
  searchText: string
}

const setPieceNames = ['Armor', 'Boots', 'Gloves', 'Helm', 'Pants', 'Set']
const setVariantNames = ['ATK', 'ENE']

const normalizeSetName = (title: string) => {
  let name = title.replace(/\s+Set$/i, '').trim()

  for (const piece of setPieceNames) {
    name = name.replace(new RegExp(`\\s+${piece}(?=\\s+(ATK|ENE)$|$)`, 'i'), '').trim()
  }

  return name.replace(/\s+/g, ' ')
}

const setPieceName = (title: string) => {
  const piece = setPieceNames.find((name) => new RegExp(`\\b${name}\\b`, 'i').test(title))
  const variant = setVariantNames.find((name) => new RegExp(`\\b${name}\\b`, 'i').test(title))

  return [piece || 'Set', variant].filter(Boolean).join(' ')
}

const setClassName = (asset: DevReferenceAsset) => {
  const fromSetCategory = asset.category.match(/^Sets\s*-\s*(.+)$/i)?.[1]
  const fromArmorCategory = asset.category.match(/^Armaduras\s*-\s*(.+)$/i)?.[1]

  return fromSetCategory || fromArmorCategory || 'Compartilhado'
}

const isSetReferenceAsset = (asset: DevReferenceAsset) =>
  asset.group === 'Equipamentos' && (/^Sets\s*-/i.test(asset.category) || /^Armaduras\s*-/i.test(asset.category))

const setCards = computed<SetCard[]>(() => {
  const grouped = new Map<string, SetCard & { imagePriority: number }>()

  for (const asset of devReferenceAssets.filter(isSetReferenceAsset)) {
    const className = setClassName(asset)
    const name = normalizeSetName(asset.title)
    const key = `${className}-${name}`.toLowerCase()
    const piece = setPieceName(asset.title)
    const imagePriority = /\bset\b/i.test(asset.title) ? 3 : asset.image ? 2 : 1

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        name,
        className,
        image: asset.image,
        imagePriority,
        status: asset.status,
        compatibility: asset.compatibility,
        pieces: [],
        description: asset.image
          ? 'Referencia visual local disponivel para consulta e futura otimizacao.'
          : 'Set catalogado a partir das referencias coletadas; imagem ainda precisa ser vinculada ou gerada.',
        searchText: ''
      })
    }

    const card = grouped.get(key)
    if (!card) {
      continue
    }

    if (!card.pieces.includes(piece)) {
      card.pieces.push(piece)
    }

    if (asset.image && imagePriority >= card.imagePriority) {
      card.image = asset.image
      card.imagePriority = imagePriority
    }

    if (asset.status === 'Imagem local') {
      card.status = asset.status
    }

    if (asset.compatibility === 'v6-prioridade') {
      card.compatibility = asset.compatibility
    } else if (card.compatibility !== 'v6-prioridade' && asset.compatibility === 'high-version-futuro') {
      card.compatibility = asset.compatibility
    }

    card.searchText = `${card.name} ${card.className} ${card.status} ${card.compatibility} ${card.pieces.join(' ')} ${asset.notes}`.toLowerCase()
  }

  return Array.from(grouped.values())
    .map(({ imagePriority, ...card }) => ({
      ...card,
      pieces: card.pieces.sort((a, b) => setPieceNames.indexOf(a.split(' ')[0]) - setPieceNames.indexOf(b.split(' ')[0]))
    }))
    .sort((a, b) => a.className.localeCompare(b.className, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR'))
})

const setClassOptions = computed(() => Array.from(new Set(setCards.value.map((set) => set.className))).sort((a, b) => a.localeCompare(b, 'pt-BR')))
const setCompatibilityOptions = computed(() => Array.from(new Set(setCards.value.map((set) => set.compatibility))))
const filteredSetCards = computed(() => {
  const search = setSearch.value.trim().toLowerCase()

  return setCards.value.filter((set) => {
    const matchesSearch = !search || set.searchText.includes(search)
    const matchesClass = setClassFilter.value === 'Todos' || set.className === setClassFilter.value
    const matchesImage =
      setImageFilter.value === 'Todos' ||
      (setImageFilter.value === 'Com imagem' && Boolean(set.image)) ||
      (setImageFilter.value === 'Sem imagem' && !set.image)
    const matchesCompatibility = setCompatibilityFilter.value === 'Todos' || set.compatibility === setCompatibilityFilter.value

    return matchesSearch && matchesClass && matchesImage && matchesCompatibility
  })
})
const setTotalPages = computed(() => Math.max(1, Math.ceil(filteredSetCards.value.length / setPageSize)))
const paginatedSetCards = computed(() => {
  const page = Math.min(setCurrentPage.value, setTotalPages.value)
  const start = (page - 1) * setPageSize

  return filteredSetCards.value.slice(start, start + setPageSize)
})
const setGuideStats = computed(() => ({
  total: setCards.value.length,
  withImage: setCards.value.filter((set) => set.image).length,
  missingImage: setCards.value.filter((set) => !set.image).length
}))

watch([setSearch, setClassFilter, setImageFilter, setCompatibilityFilter], () => {
  setCurrentPage.value = 1
})

watch(setTotalPages, (totalPages) => {
  if (setCurrentPage.value > totalPages) {
    setCurrentPage.value = totalPages
  }
})

onMounted(loadSession)

const fairyElfGuide: CharacterGuide = {
    name: 'Fairy Elf',
    subtitle: 'Guardia de Noria',
    description:
      'Graciosa a distancia e implacavel sob pressao, a Fairy Elf domina o campo de batalha com flechas precisas, apoio magico e mobilidade natural. Quando suas asas se abrem, cada disparo vira uma sentenca.',
    heroImage: '/images/guide-elfa-hero.png',
    stats: [
      { label: 'Funcao', value: 'Suporte' },
      { label: 'Alcance', value: 'Longo' },
      { label: 'Dificuldade', value: 'Media' }
    ],
    styleTitle: 'Atiradora de suporte',
    styleDescription: 'Ideal para jogadores que gostam de controlar distancia, fortalecer aliados e punir qualquer inimigo que avance sem cuidado.',
    traits: ['Pressao segura a distancia', 'Buffs para o grupo', 'Otima em progressao inicial', 'Dependente de posicionamento'],
    originTitle: 'A sentinela das asas sagradas',
    origin: [
      'Nas florestas antigas de Noria, a Fairy Elf aprendeu que beleza e perigo podem dividir o mesmo silencio. Sua presenca no grupo muda o ritmo da luta: ela abre espaco com tiros longos, protege companheiros com encantamentos e escolhe o momento exato para transformar defesa em ataque.',
      'Em Blood Moon, a classe recompensa posicionamento, leitura de combate e evolucao constante de equipamento. O arco certo, a asa certa e uma boa rota de progressao fazem a Fairy Elf crescer de suporte essencial para ameaca decisiva.'
    ],
    combatTags: 'Alcance | Cura | Controle',
    skills: [
      { key: 'Q', name: 'Disparo Multiplo', description: 'Libera uma sequencia de flechas para limpar monstros e manter pressao constante em rotas de farm.' },
      { key: 'W', name: 'Orbe de Cura', description: 'Converte energia natural em recuperacao, sustentando aliados durante hunts longas e eventos disputados.' },
      { key: 'E', name: 'Bencao de Noria', description: 'Fortalece defesa e sobrevivencia do grupo, criando janelas seguras para avancar contra chefes e invasoes.' },
      { key: 'R', name: 'Flecha Celestial', description: 'Um disparo carregado pelas asas sagradas, ideal para finalizar alvos prioritarios ou iniciar uma troca decisiva.' }
    ],
    playTitle: 'Domine a distancia antes do dano',
    tips: [
      { title: 'Jogue pelas bordas da luta', description: 'A Fairy Elf vence quando controla angulo e distancia. Evite o centro do combate e mantenha espaco para reposicionar.' },
      { title: 'Buff antes do confronto', description: 'Entre em eventos com buffs ativos. Esse preparo simples aumenta muito a margem de erro do grupo.' },
      { title: 'Evolua arco e asas juntos', description: 'Dano e mobilidade precisam crescer lado a lado. Um bom arco sem defesa deixa a classe vulneravel.' }
    ],
    priorities: [
      'Garanta uma arma de alcance consistente antes de investir em luxo visual.',
      'Mantenha buffs e recursos de sustain sempre prontos para boss, invasao e PvP.',
      'Procure equipamentos com equilibrio entre dano, defesa e velocidade de ataque.',
      'Use a vantagem de alcance para escolher quando entrar e quando sair da troca.'
    ],
    wiki: {
      sections: [
        {
          kicker: 'Identidade',
          title: 'Fairy Elf de Noria',
          description: 'Classe ligada a Noria, com foco natural em agilidade, arcos, bestas, quivers e suporte magico.',
          items: [
            'Rota ofensiva: Agility Elf, dano fisico a distancia e velocidade de ataque.',
            'Rota suporte: Energy Elf, cura, buffs de defesa e buffs de dano.',
            'Usa bows com arrows e crossbows com bolts.',
            'Pode atuar como personagem de progressao segura ou suporte essencial de party.'
          ]
        },
        {
          kicker: 'Classes',
          title: 'Evolucao',
          items: [
            'Fairy Elf: classe inicial.',
            'Muse Elf: segunda classe, referencia de level 150 + quest.',
            'High Elf: terceira classe, referencia de level 400 + quest.',
            'Noble Elf: quarta classe moderna, catalogada para high-version futuro.'
          ]
        },
        {
          kicker: 'Base stats',
          title: 'Atributos iniciais',
          items: [
            'Strength: 22',
            'Agility: 25',
            'Stamina: 20',
            'Energy: 15',
            'HP: 80',
            'Mana: 30',
            'AG: 30',
            'SD: 99'
          ]
        },
        {
          kicker: 'Builds',
          title: 'Linhas de jogo',
          items: [
            'Agility: dano, attack speed, defesa e defense rate.',
            'Energy: cura, Greater Defense, Greater Damage e suporte de grupo.',
            'Hibrida: pode equilibrar dano e suporte, mas precisa de validacao de pontos no servidor.',
            'Hero/quest status pode alterar ganho de pontos por level em algumas bases.'
          ]
        },
        {
          kicker: 'Skills classicas',
          title: 'Catalogo principal',
          items: [
            'Triple Shot: disparo em leque, base ofensiva da Fairy Elf Agility.',
            'Heal: cura alvo, base da Fairy Elf suporte.',
            'Greater Defense: buff temporario de defesa.',
            'Greater Damage: buff temporario de ataque/magic power.',
            'Penetration: ataque ofensivo com arco/besta.',
            'Ice Arrow: controle/congelamento, forte para PvP e controle.',
            'Infinity Arrow: skill ligada a quest/hero status em muitas versoes.',
            'Summons: Goblin, Stone Golem, Assassin, Elite Yeti, Dark Knight, Bali e Soldier, pendentes de validacao no Blood Moon.'
          ]
        },
        {
          kicker: 'High-version',
          title: 'Conteudo moderno guardado',
          items: [
            'Master Skill Tree: progressao posterior ao level 400 em bases modernas.',
            'Skill Enhancement Tree: conteudo de quarta classe/high-version.',
            'Skills modernas como Multi-Shot, Focus Shot e evolucoes de enhancement ficam catalogadas para futuro.',
            'Sistemas elementais/pentagram ficam em validacao para servidor paralelo de versao mais alta.'
          ]
        }
      ],
      formulas: [
        {
          title: 'HP e Mana',
          items: [
            'HP: +1 por character level.',
            'HP: +2 por ponto de Stamina.',
            'Mana: +1.5 por character level.',
            'Mana: +1.5 por ponto de Energy.'
          ]
        },
        {
          title: 'AG e SD',
          items: [
            'AG: +1 a cada 3 Strength.',
            'AG: +1 a cada 5 Agility.',
            'AG: +1 a cada 3 Stamina.',
            'AG: +1 a cada 5 Energy.',
            'SD: +1.2 por character level.',
            'SD: +1.2 por ponto de stat aplicado.',
            'SD: +1 a cada 2 pontos de DEF.'
          ]
        },
        {
          title: 'Ataque fisico',
          items: [
            'Max Attack Power: +1 a cada 4 Agility.',
            'Max Attack Power: +1 a cada 4 Strength.',
            'Min Attack Power: +1 a cada 7 Agility.',
            'Min Attack Power: +1 a cada 7 Strength.',
            'Attack Rate: +5 por level ate 400.',
            'Attack Rate: +1.5 por Agility.',
            'Attack Rate: +1 a cada 4 Strength.',
            'Attack Speed: +1 a cada 50 Agility.'
          ]
        },
        {
          title: 'PvP e defesa',
          items: [
            'PVP Attack Rate: +3 por level ate 400.',
            'PVP Attack Rate: +0.6 por Agility.',
            'DEF: +1 a cada 10 Agility.',
            'DEF Rate: +1 a cada 4 Agility.',
            'PVP DEF Rate: +2 por character level.',
            'PVP DEF Rate: +1 a cada 10 Agility.'
          ]
        },
        {
          title: 'Elemental moderno',
          items: [
            'Elemental Attack/Defense aparece na fonte moderna.',
            'Manter como high-version futuro.',
            'Nao publicar na v6 sem validar suporte do cliente/servidor.'
          ]
        }
      ],
      equipment: [
        {
          title: 'Bows e Crossbows',
          description: 'Lista bruta coletada para futura wiki de armas da Fairy Elf.',
          items: [
            'Short Bow',
            'Crossbow',
            'Bow',
            'Golden Crossbow',
            'Elven Bow',
            'Arquebus',
            'Tiger Bow',
            'Silver Bow',
            'Light Crossbow',
            'Serpent Crossbow',
            'Bluewing Crossbow',
            'Aquagold Crossbow',
            'Saint Crossbow',
            'Celestial Bow',
            'Divine Crossbow',
            'Great Reign Crossbow',
            'Arrow Viper Bow',
            'Sylph Wind Bow',
            'Aileen Bow'
          ]
        },
        {
          title: 'Armas compartilhadas',
          description: 'Aparecem na fonte como itens equipaveis/relacionados, mas precisam de validacao.',
          items: ['Small Axe', 'Short Sword', 'Kris', 'Rapier', 'Gladius', 'Elven Axe']
        },
        {
          title: 'Quiver e municao',
          description: 'Bows usam arrows; crossbows usam bolts.',
          items: ['Arrow', 'Bolt', 'Arrow +1', 'Bolt +1', 'Arrow +2', 'Bolt +2', 'Stack ate 255 na fonte']
        },
        {
          title: 'Shields',
          description: 'Mais relevantes para setups defensivos ou Fairy Elf suporte.',
          items: [
            'Buckler',
            'Small Shield',
            'Horn Shield',
            'Kite Shield',
            'Elven Shield',
            'Skull Shield',
            'Spiked Shield',
            'Tower Shield',
            'Plate Shield',
            'Large Round Shield',
            'Serpent Shield',
            'Frost Barrier',
            'Light Lord Shield'
          ]
        },
        {
          title: 'Sets classicos',
          description: 'Boa base para progressao visual e wiki v6.',
          items: ['Vine', 'Silk', 'Wind', 'Spirit', 'Guardian', 'Iris', 'Holy Spirit', 'Divine', 'Red Spirit']
        },
        {
          title: 'Sets high-version',
          description: 'Guardar para servidor futuro de versao mais alta.',
          items: [
            'Bloodangel Elf',
            'Darkangel Elf',
            'Holyangel Elf',
            'Manticore Elf',
            'Silver Heart Elf',
            'Brilliant Elf',
            'Sylphid Ray',
            'Sticky',
            'Seraphim',
            'Light Lord',
            'Soul',
            'Blue Eye'
          ]
        },
        {
          title: 'Wings',
          description: 'Validar nomes e status no cliente v6. A referencia visual aprovada esta salva em references/visual.',
          items: [
            'Wings of Elf: referencia DEF 10, DMG +12, absorb +12%, level 150.',
            'Wings of Spirit: referencia DEF 30, DMG +32, absorb +32%, level 215.',
            'Wings of Life: referencia DEF 37, DMG +35, absorb +35%, level 290.',
            'Wing of Illusion: high-version, level 400 na fonte.',
            'Wing of Celestial Body: high-version, level 800 na fonte.'
          ]
        },
        {
          title: 'Armas high-version',
          description: 'Nao publicar na v6 sem validacao; manter para servidor paralelo futuro.',
          items: [
            'Devil Crossbow',
            'Angelic Bow',
            'Divine Crossbow of Archangel',
            'Bloodangel Bow',
            'Blessed Divine Crossbow of Archangel',
            'Darkangel Bow',
            'Holyangel Bow',
            'Soul Bow',
            'Blue Eye Bow'
          ]
        }
      ],
      notes: [
        'Confirmar formulas exatas usadas pelo Blood Moon antes de publicar como definitivo.',
        'Confirmar quais itens existem no cliente v6.',
        'Confirmar nomes traduzidos de skills no nosso cliente.',
        'Confirmar se summons da Fairy Elf estarao ativos.',
        'Confirmar se Master Skill Tree existe no servidor atual ou ficara somente para high-version.',
        'Confirmar nomes e status das asas level 1, 2 e 3.',
        'Confirmar requisitos de level/status por item.'
      ]
    }
}

const characterGuides: Record<string, CharacterGuide> = {
  'fairy-elf': fairyElfGuide,
  elfa: fairyElfGuide,
  'dark-lord': {
    name: 'Dark Lord',
    subtitle: 'Senhor da guerra',
    description:
      'Nobre, brutal e estrategico, o Dark Lord lidera a linha de frente com autoridade absoluta. Cetro, corvo e capa imperial transformam sua presenca em comando: onde ele pisa, o campo de batalha obedece.',
    heroImage: '/images/guide-dark-lord-hero.png',
    stats: [
      { label: 'Funcao', value: 'Comando' },
      { label: 'Alcance', value: 'Medio' },
      { label: 'Dificuldade', value: 'Alta' }
    ],
    styleTitle: 'Comandante ofensivo',
    styleDescription: 'Ideal para jogadores que querem liderar eventos, pressionar alvos prioritarios e combinar dano, invocacao e presenca de grupo.',
    traits: ['Presenca dominante em grupo', 'Cetro com dano magico', 'Corvo como pressao extra', 'Escala muito bem com equipamento'],
    originTitle: 'O soberano do campo de batalha',
    origin: [
      'O Dark Lord nao entra em combate como soldado comum. Ele avança como autoridade. Sua armadura Dark Master, a capa lv3 e o Great Lord Scepter criam uma silhueta de comando feita para intimidar antes mesmo do primeiro golpe.',
      'Em Blood Moon, a classe recompensa decisao e leitura de tempo. O Dark Lord escolhe o alvo, abre caminho com seu cetro, usa o corvo para ampliar pressao e transforma sua presenca em vantagem para a party.'
    ],
    combatTags: 'Comando | Cetro | Corvo',
    skills: [
      { key: 'Q', name: 'Fire Burst', description: 'Explode energia em area ao redor do alvo, excelente para limpar grupos e criar pressao em lutas proximas.' },
      { key: 'W', name: 'Force Wave', description: 'Canaliza o poder do cetro em uma onda frontal, punindo inimigos que entram no seu eixo de controle.' },
      { key: 'E', name: 'Summon Raven', description: 'Invoca o corvo do Dark Lord para perseguir e pressionar alvos, mantendo dano constante durante a troca.' },
      { key: 'R', name: 'Critical Damage', description: 'Amplifica o potencial ofensivo do grupo, abrindo janelas de burst para eventos, boss e PvP.' }
    ],
    playTitle: 'Lidere a luta antes de vencer a troca',
    tips: [
      { title: 'Entre com presenca', description: 'O Dark Lord funciona melhor quando inicia a pressao. Escolha bem o alvo e force o inimigo a reagir ao seu ritmo.' },
      { title: 'Use o corvo para manter contato', description: 'O corvo ajuda a sustentar pressao enquanto voce reposiciona ou prepara uma nova habilidade com o cetro.' },
      { title: 'Proteja sua silhueta de comando', description: 'A capa e o set chamam atencao, mas voce ainda depende de bom posicionamento para nao ser isolado em eventos.' }
    ],
    priorities: [
      'Priorize cetro forte para manter dano e controle consistentes.',
      'Evolua capa e set juntos para sustentar a presenca na linha de frente.',
      'Use o corvo como extensao da sua pressao, principalmente contra alvos em movimento.',
      'Coordene buffs e entrada de dano com a party para transformar comando em abate.'
    ]
  }
}

const characterGuide = computed(() => (categorySlug.value === 'personagens' ? characterGuides[topicSlug.value] : undefined))

useSeoMeta({
  title: () => (characterGuide.value ? `${characterGuide.value.name} - Guia de Personagem` : topicTitle.value),
  description: () => (characterGuide.value ? `Guia do personagem ${characterGuide.value.name} no Blood Moon.` : undefined)
})
</script>

<style scoped>
.character-hero {
  isolation: isolate;
}

.character-hero-dark-lord .character-hero-image {
  filter: brightness(1.18) contrast(1.04);
}

.character-hero-shade {
  background:
    linear-gradient(
      105deg,
      rgba(8, 9, 13, 0.96) 0%,
      rgba(8, 9, 13, 0.88) 25%,
      rgba(8, 9, 13, 0.48) 43%,
      rgba(8, 9, 13, 0.12) 58%,
      rgba(8, 9, 13, 0) 70%
    );
}

.character-hero-focus {
  background:
    radial-gradient(circle at 76% 38%, rgba(245, 158, 11, 0.16), transparent 28rem),
    linear-gradient(180deg, rgba(8, 9, 13, 0.08), rgba(8, 9, 13, 0.2));
}
</style>

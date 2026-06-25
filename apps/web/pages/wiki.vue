<template>
  <div>
    <PageHero
      wide
      kicker="Base de conhecimento"
      title="Wiki Blood Moon"
      description="Painel central para organizar mapas, monstros, personagens, equipamentos, formulas, eventos e todo o conhecimento do servidor."
    />

    <section class="bm-guide-container grid gap-4 py-[6px] lg:grid-cols-[18rem_1fr]">
      <aside class="bm-panel h-fit rounded-md p-[24px] lg:sticky lg:top-28">
        <p class="bm-kicker">Wiki</p>
        <h2 class="bm-heading mt-[6px] font-display text-2xl font-bold">Conteudos</h2>

        <nav class="mt-5 grid gap-2">
          <div v-for="section in navigationSections" :key="section.key" class="border-l border-white/12 pl-3">
            <button
              class="bm-nav-link flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-bold"
              :class="{ 'bm-nav-link-active': activeSectionKey === section.key && !activeTopicKey }"
              type="button"
              @click="selectSection(section.key)"
            >
              <span>{{ section.title }}</span>
              <ChevronDown
                v-if="section.topics.length"
                class="size-4 transition-transform"
                :class="{ 'rotate-180 text-white': openSections.includes(section.key) }"
              />
            </button>

            <div v-if="section.topics.length && openSections.includes(section.key)" class="ml-3 mt-1 grid gap-1 border-l border-white/10 pl-3">
              <button
                v-for="topic in section.topics"
                :key="topic.key"
                class="bm-nav-link rounded-md px-3 py-2 text-left text-xs font-bold"
                :class="{ 'bm-nav-link-active': activeTopicKey === topic.key }"
                :disabled="topic.disabled"
                type="button"
                @click="selectTopic(section.key, topic.key)"
              >
                <span :class="{ 'text-zinc-500': topic.disabled }">{{ topic.label }}</span>
                <span v-if="topic.disabled" class="ml-2 text-[10px] uppercase tracking-[0.16em] text-ember">Futuro</span>
              </button>
            </div>
          </div>
        </nav>
      </aside>

      <section class="bm-panel min-h-[420px] rounded-md p-[24px]">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="bm-kicker">{{ activeTopic ? 'Topico da wiki' : 'Biblioteca' }}</p>
            <h2 class="bm-heading mt-[6px] font-display text-3xl font-bold">{{ contentTitle }}</h2>
            <p class="bm-muted mt-[6px] max-w-3xl text-sm leading-6">{{ contentDescription }}</p>
          </div>
          <span class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-300">
            {{ contentBadge }}
          </span>
        </div>

        <div v-if="activeTopic" class="mt-6 grid gap-4">
          <div v-if="isSetsTopic" class="grid gap-5">
            <div class="grid gap-3 rounded-md border border-white/10 bg-black/20 p-[24px]">
              <div class="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h3 class="bm-heading font-display text-2xl font-bold">Catalogo de sets</h3>
                  <p class="bm-muted mt-[6px] text-sm leading-6">
                    Default mostra todos os itens, sempre do mais fraco ao mais forte.
                  </p>
                </div>
                <div class="grid grid-cols-3 gap-2 text-center text-xs font-black uppercase tracking-[0.14em] text-zinc-300">
                  <div class="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
                    <span class="block font-display text-xl text-white">{{ filteredSetCards.length }}</span>
                    Listados
                  </div>
                  <div class="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
                    <span class="block font-display text-xl text-white">{{ setCharacterOptions.length }}</span>
                    Personagens
                  </div>
                  <div class="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
                    <span class="block font-display text-xl text-white">{{ setCards.length }}</span>
                    Total
                  </div>
                </div>
              </div>

              <div class="grid gap-3 xl:grid-cols-[180px_220px_220px_1fr]">
                <label class="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                  Personagem
                  <select v-model="setCharacterFilter" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-blood-400/70">
                    <option class="bg-zinc-950 text-white" value="Default">Default</option>
                    <option v-for="character in setCharacterOptions" :key="character" class="bg-zinc-950 text-white" :value="character">{{ character }}</option>
                  </select>
                </label>

                <label class="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                  Classe
                  <select v-model="setEvolutionFilter" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-blood-400/70">
                    <option class="bg-zinc-950 text-white" value="Default">Default</option>
                    <option v-for="evolution in setEvolutionOptions" :key="evolution" class="bg-zinc-950 text-white" :value="evolution">{{ evolution }}</option>
                  </select>
                </label>

                <label class="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                  Equipamento
                  <select v-model="setEquipmentFilter" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-blood-400/70">
                    <option class="bg-zinc-950 text-white" value="Default">Default</option>
                    <option v-for="equipment in setEquipmentOptions" :key="equipment" class="bg-zinc-950 text-white" :value="equipment">{{ equipment }}</option>
                  </select>
                </label>

                <label class="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                  Buscar por nome
                  <input
                    v-model="setNameSearch"
                    class="h-11 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold normal-case tracking-normal text-white outline-none transition placeholder:text-white/45 focus:border-blood-400/70"
                    placeholder="Digite o nome do equipamento"
                    type="search"
                  >
                </label>
              </div>
            </div>

            <div class="overflow-hidden rounded-md border border-white/10 bg-black/20">
              <div class="grid grid-cols-[64px_1fr_96px] gap-3 border-b border-white/10 bg-white/[0.035] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-400 md:grid-cols-[64px_1.15fr_0.85fr_1fr_0.9fr_112px]">
                <span>Tier</span>
                <span>Equipamento</span>
                <span class="hidden md:block">Personagem</span>
                <span class="hidden md:block">Classes</span>
                <span class="hidden md:block">Status</span>
                <span class="text-right md:text-left">Visualizar</span>
              </div>

              <div class="max-h-[520px] overflow-auto">
                <article
                  v-for="set in paginatedSetCards"
                  :key="set.key"
                  class="grid grid-cols-[64px_1fr_96px] gap-3 border-b border-white/10 px-4 py-3 last:border-b-0 md:grid-cols-[64px_1.15fr_0.85fr_1fr_0.9fr_112px]"
                >
                  <span class="font-display text-lg font-black text-ember">{{ set.tierLabel }}</span>
                  <div>
                    <h4 class="font-display text-lg font-bold text-white">{{ set.name }}</h4>
                    <p class="mt-1 text-xs leading-5 text-zinc-400">{{ set.pieces.join(', ') }}</p>
                  </div>
                  <span class="hidden text-sm font-bold text-zinc-300 md:block">{{ set.characterName }}</span>
                  <span class="hidden text-xs leading-5 text-zinc-400 md:block">{{ set.evolutions.join(', ') }}</span>
                  <span class="hidden text-xs leading-5 text-zinc-400 md:block">{{ set.status }} · {{ set.compatibility }}</span>
                  <button
                    class="rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:border-ember/50 hover:bg-ember/15"
                    type="button"
                    @click="openSetModal(set)"
                  >
                    Ver
                  </button>
                </article>
              </div>
            </div>

            <div
              v-if="filteredSetCards.length > 0"
              class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-400"
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

            <div v-if="filteredSetCards.length === 0" class="rounded-md border border-dashed border-white/15 bg-white/[0.035] p-8 text-center">
              <p class="bm-kicker">Nada encontrado</p>
              <h3 class="mt-2 font-display text-2xl font-black uppercase text-white">Ajuste os filtros</h3>
            </div>
          </div>

          <div v-else class="rounded-md border border-white/10 bg-black/20 p-[24px]">
            <h3 class="bm-heading font-display text-2xl font-bold">{{ activeTopic.label }}</h3>
            <p class="bm-muted mt-[6px] text-sm leading-6">
              Conteudo modular reservado para este topico. Aqui vamos renderizar tabelas, imagens, formulas,
              equipamentos, mapas, monstros e guias conforme a wiki for sendo detalhada.
            </p>
            <NuxtLink
              v-if="!activeTopic.disabled"
              :to="`/guias/${activeSectionKey}/${activeTopic.key}`"
              class="bm-button-glass mt-5 inline-flex rounded-md px-4 py-3 text-sm font-black"
            >
              Abrir pagina detalhada
            </NuxtLink>
          </div>
        </div>

        <div v-else class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <template v-for="topic in activeTopics" :key="topic.key">
            <button
              v-if="!topic.disabled"
              class="bm-nav-link rounded-md border border-white/10 p-[24px] text-left"
              type="button"
              @click="selectTopic(activeSectionKey, topic.key)"
            >
              <strong class="bm-heading block">{{ topic.label }}</strong>
              <span class="bm-muted mt-[6px] block text-xs leading-5">Renderizar este conteudo no painel da Wiki.</span>
            </button>
            <span
              v-else
              class="cursor-not-allowed rounded-md border border-white/10 bg-white/[0.035] p-[24px]"
              title="Disponivel em uma versao futura"
            >
              <strong class="block text-zinc-500">{{ topic.label }}</strong>
              <span class="mt-[6px] block text-xs font-bold uppercase tracking-[0.18em] text-ember">Futuro</span>
            </span>
          </template>
        </div>
      </section>
    </section>

    <Teleport to="body">
      <div
        v-if="selectedSet"
        class="fixed inset-0 z-50 grid place-items-center bg-black/80 p-3 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
      >
        <div class="relative max-h-[92vh] w-full max-w-[1760px] overflow-auto rounded-md border border-white/15 bg-[#101114] p-4 shadow-2xl sm:p-5">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap gap-2">
              <button
                class="rounded-md border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition"
                :class="modalMode === 'equipment' ? 'border-ember/60 bg-ember/20 text-white' : 'border-white/10 bg-white/[0.04] text-zinc-400'"
                type="button"
                @click="modalMode = 'equipment'"
              >
                Visual
              </button>
              <button
                class="rounded-md border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition"
                :class="modalMode === 'comparison' ? 'border-ember/60 bg-ember/20 text-white' : 'border-white/10 bg-white/[0.04] text-zinc-400'"
                type="button"
                @click="modalMode = 'comparison'"
              >
                Comparar
              </button>
            </div>

            <button
              class="rounded-md border border-white/15 bg-white/[0.06] p-3 text-white transition hover:border-blood-400/60 hover:bg-blood-500/15"
              type="button"
              aria-label="Fechar modal"
              @click="closeSetModal"
            >
              <X class="size-5" />
            </button>
          </div>

          <div v-if="modalMode === 'equipment'" class="grid gap-4 xl:grid-cols-[300px_390px_1fr] 2xl:grid-cols-[340px_430px_1fr]">
            <section class="rounded-md border border-white/10 bg-black/28 p-4">
              <p class="bm-kicker">Set completo</p>
              <h3 class="bm-heading mt-2 font-display text-3xl font-black">{{ selectedSet.name }}</h3>
              <p class="mt-2 text-sm font-bold text-zinc-400">{{ selectedSet.characterName }} · Tier {{ selectedSet.tierLabel }}</p>

              <div class="mt-5 grid min-h-[430px] place-items-center rounded-md border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/30 p-4">
                <img
                  v-if="selectedSet.fullSetImage"
                  :alt="`${selectedSet.name} completo`"
                  class="max-h-[390px] max-w-full rounded-sm object-contain"
                  loading="lazy"
                  decoding="async"
                  :src="selectedSet.fullSetImage"
                >
                <div v-else class="text-center">
                  <p class="font-display text-4xl font-black text-white/18">{{ selectedSet.name }}</p>
                  <p class="mt-3 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Imagem do personagem pendente</p>
                </div>
              </div>
            </section>

            <section class="rounded-md border border-white/10 bg-black/28 p-4">
              <div class="flex flex-wrap gap-2">
                <button
                  class="rounded-md border px-4 py-2 text-xs font-black uppercase tracking-[0.16em]"
                  :class="setQuality === 'normal' ? 'border-ember/60 bg-ember/20 text-white' : 'border-white/10 bg-white/[0.04] text-zinc-400'"
                  type="button"
                  @click="setQuality = 'normal'"
                >
                  Normal
                </button>
                <button
                  class="rounded-md border px-4 py-2 text-xs font-black uppercase tracking-[0.16em]"
                  :class="setQuality === 'excellent' ? 'border-emerald-400/60 bg-emerald-400/15 text-white' : 'border-white/10 bg-white/[0.04] text-zinc-400'"
                  type="button"
                  @click="setQuality = 'excellent'"
                >
                  Excelente
                </button>
              </div>

              <div class="mt-5">
                <p class="bm-kicker">Descricao e refinamento</p>
                <h4 class="mt-2 font-display text-2xl font-black text-white">Defesa total: {{ selectedSetDefense.total }}</h4>
                <p class="mt-3 text-sm leading-6 text-zinc-400">{{ selectedSetUsableByText }}</p>
              </div>

              <label class="mt-6 grid gap-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-400">
                Blessing / refinamento +{{ blessingLevel }}
                <input v-model.number="blessingLevel" min="0" max="15" step="1" type="range" class="accent-amber-400">
              </label>

              <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div class="rounded-md border border-white/10 bg-white/[0.04] p-3">
                  <span class="block text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Base</span>
                  <strong class="mt-1 block font-display text-2xl text-white">{{ selectedSetDefense.base }}</strong>
                </div>
                <div class="rounded-md border border-white/10 bg-white/[0.04] p-3">
                  <span class="block text-xs font-black uppercase tracking-[0.14em] text-zinc-500">Bonus</span>
                  <strong class="mt-1 block font-display text-2xl text-ember">+{{ selectedSetDefense.bonus }}</strong>
                </div>
              </div>

              <div class="mt-5 grid gap-2">
                <p class="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Possiveis opcoes do equipamento</p>
                <p
                  v-for="option in selectedEquipmentOptionRows"
                  :key="option.key"
                  class="rounded-md border px-3 py-2 text-xs font-bold leading-5"
                  :class="option.scope === 'excellent' ? 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300' : 'border-sky-400/20 bg-sky-400/[0.05] text-sky-300'"
                >
                  {{ option.label }}
                </p>
              </div>
            </section>

            <section class="rounded-md border border-white/10 bg-black/28 p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="bm-kicker">Equipamentos do set</p>
                  <h3 class="mt-2 font-display text-2xl font-black text-white">Pecas equipadas</h3>
                </div>
                <span class="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-300">
                  {{ setQuality === 'excellent' ? 'Excelente' : 'Normal' }}
                </span>
              </div>

              <div class="mt-4 grid gap-4 xl:grid-cols-2">
                <article
                  v-for="piece in selectedSetPiecesWithData"
                  :key="piece.key"
                  class="grid gap-4 rounded-md border border-white/10 bg-[#111215]/95 p-4 shadow-xl sm:grid-cols-[110px_1fr]"
                >
                  <div class="grid min-h-32 place-items-center rounded-md border border-white/10 bg-white/[0.04] p-3">
                    <img v-if="piece.image" :src="piece.image" :alt="piece.displayTitle" class="max-h-28 max-w-full object-contain" loading="lazy" decoding="async">
                    <span v-else class="text-center text-xs font-black uppercase tracking-[0.16em] text-zinc-600">{{ piece.label }}</span>
                  </div>
                  <div>
                    <p class="bm-kicker">{{ piece.label }}</p>
                    <h4 class="mt-2 font-display text-xl font-black" :class="setQuality === 'excellent' ? 'text-emerald-400' : 'text-white'">
                      {{ piece.displayTitle }}
                    </h4>
                    <dl class="mt-3 grid gap-1 text-xs leading-5 text-zinc-300">
                      <div class="flex justify-between gap-3">
                        <dt class="text-zinc-500">{{ piece.defenseLabel }}</dt>
                        <dd class="font-bold text-zinc-100">{{ piece.defense }}</dd>
                      </div>
                      <div class="flex justify-between gap-3">
                        <dt class="text-zinc-500">Durability</dt>
                        <dd class="font-bold text-zinc-100">{{ piece.durability }}/{{ piece.durability }}</dd>
                      </div>
                      <div class="flex justify-between gap-3">
                        <dt class="text-zinc-500">Strength available</dt>
                        <dd class="font-bold text-zinc-100">{{ piece.requiredStrength }}</dd>
                      </div>
                      <div class="flex justify-between gap-3">
                        <dt class="text-zinc-500">Agility available</dt>
                        <dd class="font-bold text-zinc-100">{{ piece.requiredAgility }}</dd>
                      </div>
                    </dl>
                  </div>
                </article>
              </div>
            </section>
          </div>

          <div v-else class="grid min-h-[560px] place-items-center rounded-md border border-dashed border-white/15 bg-black/25 p-8 text-center">
            <div>
              <p class="bm-kicker">Comparacao</p>
              <h3 class="mt-2 font-display text-3xl font-black text-white">Proximo modal</h3>
              <p class="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
                Espaco reservado para compararmos sets, refinamentos e qualidade Normal/Excelente na proxima etapa.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown, X } from 'lucide-vue-next'
import { devReferenceAssets, type DevReferenceAsset } from '~/data/devReferenceAssets'
import { loadGuideSetItems, type GuideEquipmentItem } from '~/data/guiamuonlineItems'
import { permissions } from '~/data/security'
import ancientItemsData from '../../../references/game-data/muonlinefanz-ancient-items-data.json'

useSeoMeta({ title: 'Wiki' })

type WikiCategory = { title: string, description: string, links: string[] }
type WikiTopic = { key: string, label: string, disabled: boolean }
type WikiSection = WikiCategory & { key: string, topics: WikiTopic[] }
type SetPieceCard = {
  key: string
  label: string
  title: string
  image?: string
  asset?: DevReferenceAsset
}
type SetCard = {
  key: string
  name: string
  characterName: string
  evolutions: string[]
  tier: number
  tierLabel: string
  status: DevReferenceAsset['status']
  compatibility: DevReferenceAsset['compatibility']
  pieces: string[]
  pieceCards: SetPieceCard[]
  fullSetImage?: string
  searchText: string
}
type AncientSetReference = {
  name: string
  classes?: string[]
  baseSetDefense?: number
  setOptions?: { pieces: number | string, option: string }[]
  pieces?: { name: string, defense?: number, requirements?: Record<string, number> }[]
}
type ModalMode = 'equipment' | 'comparison'
type SetQuality = 'normal' | 'excellent'
type EquipmentOption = {
  key: string
  label: string
  scope: 'normal' | 'excellent'
  appliesTo: 'all' | 'defense' | 'offense'
}

const { dictionary } = useLocale()
const { hasPermission, loadSession } = useAuth()
const futureCharacters = ['Grow Lancer', 'Rune Mage', 'Slayer', 'Gun Crusher', 'White Wizard', 'Mage']
const setCharacterFilter = ref('Default')
const setEvolutionFilter = ref('Default')
const setEquipmentFilter = ref('Default')
const setNameSearch = ref('')
const setCurrentPage = ref(1)
const setPageSize = 20
const selectedSet = ref<SetCard | null>(null)
const selectedGuideSetItems = ref<GuideEquipmentItem[]>([])
const selectedGuideLoadId = ref(0)
const modalMode = ref<ModalMode>('equipment')
const setQuality = ref<SetQuality>('normal')
const blessingLevel = ref(0)

const setPieceNames = ['Armor', 'Boots', 'Gloves', 'Helm', 'Pants', 'Set']
const setVariantNames = ['ATK', 'ENE']
const setModalPieces = [
  {
    key: 'helm',
    label: 'Helm',
    guideCategory: 'Helm',
    aliases: ['Helm']
  },
  {
    key: 'armor',
    label: 'Armor',
    guideCategory: 'Armor',
    aliases: ['Armor']
  },
  {
    key: 'pants',
    label: 'Pants',
    guideCategory: 'Pants',
    aliases: ['Pants']
  },
  {
    key: 'gloves',
    label: 'Gloves',
    guideCategory: 'Gloves',
    aliases: ['Gloves']
  },
  {
    key: 'boots',
    label: 'Boots',
    guideCategory: 'Boots',
    aliases: ['Boots']
  }
]
const normalArmorOptions: EquipmentOption[] = [
  { key: 'luck-soul', label: 'Luck: Jewel of Soul success rate +25%', scope: 'normal', appliesTo: 'all' },
  { key: 'luck-critical', label: 'Luck: Critical Damage Rate +5%', scope: 'normal', appliesTo: 'all' },
  { key: 'additional-defense', label: 'Additional defense +12', scope: 'normal', appliesTo: 'defense' }
]
const defensiveExcellentOptions: EquipmentOption[] = [
  { key: 'excellent-hp', label: 'HP +4%', scope: 'excellent', appliesTo: 'defense' },
  { key: 'excellent-mana', label: 'Mana +4%', scope: 'excellent', appliesTo: 'defense' },
  { key: 'excellent-def-rate', label: 'DEF Rate +10%', scope: 'excellent', appliesTo: 'defense' },
  { key: 'excellent-decrease-damage', label: 'Decreases DMG +4%', scope: 'excellent', appliesTo: 'defense' },
  { key: 'excellent-reflect', label: 'Reflect DMG by +5%', scope: 'excellent', appliesTo: 'defense' },
  { key: 'excellent-zen', label: 'Amount of Zen dropped from monsters +30%', scope: 'excellent', appliesTo: 'defense' }
]
const ancientSetReferences = ((ancientItemsData as { sampleSetsCapturedFromPage?: AncientSetReference[] }).sampleSetsCapturedFromPage || [])
const characterEvolutionMap: Record<string, string[]> = {
  'Dark Knight': ['Dark Knight', 'Blade Knight', 'Blade Master', 'Dragon Knight'],
  'Dark Wizard': ['Dark Wizard', 'Soul Master', 'Grand Master', 'Soul Wizard'],
  'Fairy Elf': ['Fairy Elf', 'Muse Elf', 'High Elf', 'Noble Elf'],
  Summoner: ['Summoner', 'Bloody Summoner', 'Dimension Master'],
  'Magic Gladiator': ['Magic Gladiator', 'Duel Master', 'Magic Knight'],
  'Dark Lord': ['Dark Lord', 'Lord Emperor', 'Empire Lord'],
  'Rage Fighter': ['Rage Fighter', 'Fist Master'],
  'Grow Lancer': ['Grow Lancer', 'Mirage Lancer']
}
const characterOrder = Object.keys(characterEvolutionMap)
const setPowerOrder = [
  'Leather',
  'Bronze',
  'Scale',
  'Brass',
  'Plate',
  'Dragon',
  'Black Dragon',
  'Dark Phoenix',
  'Great Dragon',
  'Ashcrow',
  'Pad',
  'Bone',
  'Sphinx',
  'Legendary',
  'Grand Soul',
  'Dark Soul',
  'Venom Mist',
  'Eclipse',
  'Vine',
  'Silk',
  'Wind',
  'Spirit',
  'Guardian',
  'Iris',
  'Holy Spirit',
  'Divine',
  'Red Spirit',
  'Storm Crow',
  'Thunder Hawk',
  'Hurricane',
  'Volcano',
  'Valiant',
  'Light Plate',
  'Adamantine',
  'Dark Steel',
  'Dark Master',
  'Sunlight',
  'Bloodangel',
  'Darkangel',
  'Holyangel',
  'Soul',
  'Blue Eye',
  'Manticore',
  'Silver Heart',
  'Brilliant'
]

const wikiCategories = computed(() => dictionary.value.guideCategories)
const openSections = ref<string[]>([])
const activeSectionKey = ref('')
const activeTopicKey = ref('')

const navigationSections = computed<WikiSection[]>(() =>
  wikiCategories.value.map((category) => ({
    ...category,
    key: slugify(category.title),
    topics: linksForCategory(category)
  }))
)

const activeSection = computed(() =>
  navigationSections.value.find((section) => section.key === activeSectionKey.value) || navigationSections.value[0]
)

const activeTopics = computed(() => activeSection.value?.topics || [])
const activeTopic = computed(() => activeTopics.value.find((topic) => topic.key === activeTopicKey.value))
const isSetsTopic = computed(() => activeSectionKey.value === 'equipamentos' && activeTopicKey.value === 'sets')
const contentTitle = computed(() => activeTopic.value?.label || activeSection.value?.title || 'Wiki')
const contentDescription = computed(() =>
  activeTopic.value
    ? `Conteudo de ${activeTopic.value.label} dentro da area ${activeSection.value?.title}.`
    : activeSection.value?.description || 'Selecione uma categoria no menu lateral.'
)
const contentBadge = computed(() => activeTopic.value ? activeSection.value?.title : `${activeTopics.value.length} topicos`)

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

const setCharacterName = (asset: DevReferenceAsset) => {
  const fromSetCategory = asset.category.match(/^Sets\s*-\s*(.+)$/i)?.[1]
  const fromArmorCategory = asset.category.match(/^Armaduras\s*-\s*(.+)$/i)?.[1]

  return fromSetCategory || fromArmorCategory || 'Compartilhado'
}

const setTier = (name: string) => {
  const index = setPowerOrder.findIndex((item) => item.toLowerCase() === name.toLowerCase())
  return index === -1 ? 1000 : index + 1
}

const normalizeSetReferenceName = (name: string) =>
  name
    .replace(/\s+Set$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const isSetReferenceAsset = (asset: DevReferenceAsset) =>
  asset.group === 'Equipamentos' && /^Sets\s*-/i.test(asset.category)

const setCards = computed<SetCard[]>(() => {
  const grouped = new Map<string, SetCard>()

  for (const asset of devReferenceAssets.filter(isSetReferenceAsset)) {
    const characterName = setCharacterName(asset)
    const name = normalizeSetName(asset.title)
    const key = `${characterName}-${name}`.toLowerCase()
    const piece = setPieceName(asset.title)
    const evolutions = characterEvolutionMap[characterName] || [characterName]

    if (!grouped.has(key)) {
      const tier = setTier(name)
      grouped.set(key, {
        key,
        name,
        characterName,
        evolutions,
        tier,
        tierLabel: tier === 1000 ? '-' : String(tier).padStart(2, '0'),
        status: asset.status,
        compatibility: asset.compatibility,
        pieces: [],
        pieceCards: [],
        fullSetImage: undefined,
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

    if (piece.startsWith('Set') && asset.image) {
      card.fullSetImage = asset.image
    }

    if (!card.pieceCards.some((item) => item.title === asset.title)) {
      card.pieceCards.push({
        key: slugify(`${asset.title}-${piece}`),
        label: piece,
        title: asset.title,
        image: asset.image,
        asset
      })
    }

    if (asset.status === 'Imagem local') {
      card.status = asset.status
    }

    if (asset.compatibility === 'v6-prioridade') {
      card.compatibility = asset.compatibility
    }

    card.searchText = `${card.name} ${card.characterName} ${card.evolutions.join(' ')} ${card.status} ${card.compatibility} ${card.pieces.join(' ')} ${asset.notes}`.toLowerCase()
  }

  return Array.from(grouped.values())
    .map((card) => ({
      ...card,
      pieces: card.pieces.sort((a, b) => setPieceNames.indexOf(a.split(' ')[0]) - setPieceNames.indexOf(b.split(' ')[0])),
      pieceCards: card.pieceCards.sort((a, b) => setPieceNames.indexOf(a.label.split(' ')[0]) - setPieceNames.indexOf(b.label.split(' ')[0]))
    }))
    .sort((a, b) => {
      const tierSort = a.tier - b.tier
      if (tierSort !== 0) {
        return tierSort
      }

      return characterOrder.indexOf(a.characterName) - characterOrder.indexOf(b.characterName) || a.name.localeCompare(b.name, 'pt-BR')
    })
})

const setCharacterOptions = computed(() =>
  Array.from(new Set(setCards.value.map((set) => set.characterName)))
    .sort((a, b) => characterOrder.indexOf(a) - characterOrder.indexOf(b))
)
const setEvolutionOptions = computed(() => {
  const availableCharacters = setCharacterFilter.value === 'Default'
    ? setCharacterOptions.value
    : [setCharacterFilter.value]

  return availableCharacters.flatMap((character) => characterEvolutionMap[character] || [character])
})
const setEquipmentOptions = computed(() => {
  const availableNames = Array.from(new Set(setCards.value
    .filter((set) => setCharacterFilter.value === 'Default' || set.characterName === setCharacterFilter.value)
    .filter((set) => setEvolutionFilter.value === 'Default' || set.evolutions.includes(setEvolutionFilter.value))
    .map((set) => set.name)))

  return availableNames.sort((a, b) => setTier(a) - setTier(b) || a.localeCompare(b, 'pt-BR'))
})
const filteredSetCards = computed(() => {
  const search = setNameSearch.value.trim().toLowerCase()

  return setCards.value.filter((set) => {
    const matchesCharacter = setCharacterFilter.value === 'Default' || set.characterName === setCharacterFilter.value
    const matchesEvolution = setEvolutionFilter.value === 'Default' || set.evolutions.includes(setEvolutionFilter.value)
    const matchesEquipment = setEquipmentFilter.value === 'Default' || set.name === setEquipmentFilter.value
    const matchesSearch = !search || set.searchText.includes(search)

    return matchesCharacter && matchesEvolution && matchesEquipment && matchesSearch
  })
})
const setTotalPages = computed(() => Math.max(1, Math.ceil(filteredSetCards.value.length / setPageSize)))
const paginatedSetCards = computed(() => {
  const page = Math.min(setCurrentPage.value, setTotalPages.value)
  const start = (page - 1) * setPageSize

  return filteredSetCards.value.slice(start, start + setPageSize)
})

const selectedAncientReference = computed(() => {
  if (!selectedSet.value) {
    return null
  }

  const setName = normalizeSetReferenceName(selectedSet.value.name)
  const characterName = selectedSet.value.characterName.toLowerCase()

  return ancientSetReferences.find((reference) => {
    const referenceName = normalizeSetReferenceName(reference.name)
    const referenceClasses = reference.classes?.map((item) => item.toLowerCase()) || []

    return referenceName === setName && (!referenceClasses.length || referenceClasses.includes(characterName))
  }) || null
})

const selectedEquipmentOptionRows = computed(() =>
  setQuality.value === 'excellent'
    ? [...normalArmorOptions, ...defensiveExcellentOptions]
    : normalArmorOptions
)

const selectedSetUsableByClasses = computed(() => {
  const classes = selectedGuideSetItems.value.flatMap((item) => item?.usableBy || [])

  return classes.length
    ? Array.from(new Set(classes))
    : selectedSet.value?.evolutions || []
})

const selectedSetUsableByText = computed(() => {
  if (!selectedSet.value) {
    return ''
  }

  return `Pode ser equipado por: ${selectedSetUsableByClasses.value.join(', ')}.`
})

const fallbackPieceDefense = (pieceIndex: number) => {
  const tier = selectedSet.value?.tier === 1000 ? 1 : selectedSet.value?.tier || 1
  return Math.max(4, Math.round(tier * 2.4 + pieceIndex * 3))
}

const fallbackRequirement = (pieceIndex: number, multiplier: number) => {
  const tier = selectedSet.value?.tier === 1000 ? 1 : selectedSet.value?.tier || 1
  return Math.max(0, Math.round(tier * multiplier + pieceIndex * 7))
}

const guideDefenseAtLevel = (category: string, name: string, level: number, fallbackIndex: number) => {
  const guideItem = selectedGuideSetItems.value.find((item) => item.category === category && item.name === name)
  const stat = guideItem?.levelStats.find((item) => item.itemLevel === level)
  const defense = setQuality.value === 'excellent'
    ? stat?.excellentDefense ?? stat?.defense
    : stat?.defense

  return defense ?? fallbackPieceDefense(fallbackIndex)
}

const selectedSetPiecesWithData = computed(() =>
  setModalPieces.map((piece, index) => {
    const guideItem = selectedSet.value
      ? selectedGuideSetItems.value.find((item) => item.category === piece.guideCategory && item.name === selectedSet.value?.name)
      : null
    const guideLevelStats = guideItem?.levelStats.find((item) => item.itemLevel === blessingLevel.value)
    const assetPiece = selectedSet.value?.pieceCards.find((candidate) =>
      piece.aliases.some((alias) => candidate.label.toLowerCase().includes(alias.toLowerCase()) || candidate.title.toLowerCase().includes(alias.toLowerCase()))
    )
    const referencePiece = selectedAncientReference.value?.pieces?.find((candidate) =>
      piece.aliases.some((alias) => candidate.name.toLowerCase().includes(alias.toLowerCase()))
    )
    const guideDefense = setQuality.value === 'excellent'
      ? guideLevelStats?.excellentDefense ?? guideLevelStats?.defense
      : guideLevelStats?.defense
    const guideStrength = setQuality.value === 'excellent'
      ? guideLevelStats?.excellentRequiredStrength ?? guideLevelStats?.requiredStrength
      : guideLevelStats?.requiredStrength
    const guideAgility = setQuality.value === 'excellent'
      ? guideLevelStats?.excellentRequiredAgility ?? guideLevelStats?.requiredAgility
      : guideLevelStats?.requiredAgility
    const defense = guideDefense ?? referencePiece?.defense ?? fallbackPieceDefense(index + 1)
    const baseTitle = guideItem?.title || assetPiece?.title || referencePiece?.name || `${selectedSet.value?.name || 'Set'} ${piece.label}`
    const displayTitle = setQuality.value === 'excellent' && !/^excellent\s/i.test(baseTitle)
      ? `Excellent ${baseTitle}`
      : baseTitle
    const requiredStrength = guideStrength ?? referencePiece?.requirements?.strength ?? fallbackRequirement(index + 1, 14)
    const requiredAgility = guideAgility ?? referencePiece?.requirements?.agility ?? fallbackRequirement(index + 1, 8)
    const durability = Math.max(30, 60 + (selectedSet.value?.tier === 1000 ? 1 : selectedSet.value?.tier || 1))

    return {
      ...piece,
      title: baseTitle,
      displayTitle,
      image: assetPiece?.image || guideItem?.image.publicPath || guideItem?.image.sourceUrl,
      defense,
      defenseLabel: piece.key === 'armor' ? 'Armor' : 'Defense',
      durability,
      requiredStrength,
      requiredAgility
    }
  })
)

const selectedSetDefense = computed(() => {
  const total = selectedSetPiecesWithData.value.reduce((sum, piece) => sum + piece.defense, 0)
  const base = selectedSet.value
    ? setModalPieces.reduce((sum, piece, index) => sum + guideDefenseAtLevel(piece.guideCategory, selectedSet.value?.name || '', 0, index + 1), 0)
    : total
  const bonus = Math.max(0, total - base)

  return {
    base,
    bonus,
    total
  }
})

const openSetModal = async (set: SetCard) => {
  const loadId = selectedGuideLoadId.value + 1
  selectedGuideLoadId.value = loadId
  selectedSet.value = set
  selectedGuideSetItems.value = []
  modalMode.value = 'equipment'
  setQuality.value = 'normal'
  blessingLevel.value = 0
  const items = await loadGuideSetItems(set.name)

  if (selectedGuideLoadId.value === loadId && selectedSet.value?.key === set.key) {
    selectedGuideSetItems.value = items
  }
}

const closeSetModal = () => {
  selectedGuideLoadId.value += 1
  selectedSet.value = null
  selectedGuideSetItems.value = []
}

watch(setCharacterFilter, () => {
  setEvolutionFilter.value = 'Default'
  setEquipmentFilter.value = 'Default'
  setCurrentPage.value = 1
})

watch(setEvolutionFilter, () => {
  setEquipmentFilter.value = 'Default'
  setCurrentPage.value = 1
})

watch([setEquipmentFilter, setNameSearch], () => {
  setCurrentPage.value = 1
})

watch(setTotalPages, (totalPages) => {
  if (setCurrentPage.value > totalPages) {
    setCurrentPage.value = totalPages
  }
})

function ensureDefaultSelection () {
  const firstSection = navigationSections.value[0]
  if (!firstSection) {
    return
  }

  if (!activeSectionKey.value || !navigationSections.value.some((section) => section.key === activeSectionKey.value)) {
    activeSectionKey.value = firstSection.key
  }

  if (!openSections.value.includes(activeSectionKey.value)) {
    openSections.value = [activeSectionKey.value]
  }
}

onMounted(() => {
  loadSession()
  ensureDefaultSelection()
})

watch(navigationSections, ensureDefaultSelection, { immediate: true })

const selectSection = (sectionKey: string) => {
  activeSectionKey.value = sectionKey
  activeTopicKey.value = ''
  openSections.value = openSections.value.includes(sectionKey)
    ? openSections.value.filter((key) => key !== sectionKey)
    : [...openSections.value, sectionKey]
}

const selectTopic = (sectionKey: string, topicKey: string) => {
  const section = navigationSections.value.find((item) => item.key === sectionKey)
  const topic = section?.topics.find((item) => item.key === topicKey)
  if (!topic || topic.disabled) {
    return
  }

  activeSectionKey.value = sectionKey
  activeTopicKey.value = topicKey
  if (!openSections.value.includes(sectionKey)) {
    openSections.value = [...openSections.value, sectionKey]
  }
}

function linksForCategory (category: WikiCategory): WikiTopic[] {
  return category.links.map((label) => ({
    key: slugify(label),
    label,
    disabled: ['Personagens', 'Personajes', 'Characters'].includes(category.title)
      ? futureCharacters.includes(label) && !hasPermission(permissions.guidesFutureView)
      : false
  }))
}

function slugify (value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
</script>

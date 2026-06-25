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
          <div class="rounded-md border border-white/10 bg-black/20 p-[24px]">
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
  </div>
</template>

<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { permissions } from '~/data/security'

useSeoMeta({ title: 'Wiki' })

type WikiCategory = { title: string, description: string, links: string[] }
type WikiTopic = { key: string, label: string, disabled: boolean }
type WikiSection = WikiCategory & { key: string, topics: WikiTopic[] }

const { dictionary } = useLocale()
const { hasPermission, loadSession } = useAuth()
const futureCharacters = ['Grow Lancer', 'Rune Mage', 'Slayer', 'Gun Crusher', 'White Wizard', 'Mage']

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
const contentTitle = computed(() => activeTopic.value?.label || activeSection.value?.title || 'Wiki')
const contentDescription = computed(() =>
  activeTopic.value
    ? `Conteudo de ${activeTopic.value.label} dentro da area ${activeSection.value?.title}.`
    : activeSection.value?.description || 'Selecione uma categoria no menu lateral.'
)
const contentBadge = computed(() => activeTopic.value ? activeSection.value?.title : `${activeTopics.value.length} topicos`)

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

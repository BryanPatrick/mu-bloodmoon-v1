<template>
  <ManagementShell>
    <div v-if="hasPermission(permissions.adminDashboardView)" class="grid gap-5">
      <section class="border-b border-white/10 pb-5">
        <p class="bm-kicker">Painel administrativo</p>
        <h1 class="mt-[6px] font-display text-4xl font-black uppercase text-white">Conteudo CMS</h1>
        <p class="mt-3 max-w-4xl text-sm font-semibold leading-7 text-white/68">
          Central para controlar tudo que pode ser publicado no site: noticias, Wiki, equipamentos, itens exclusivos,
          banners, imagens, paginas institucionais e ajustes editoriais.
        </p>
      </section>

      <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article v-for="card in summaryCards" :key="card.label" class="bm-panel rounded-md p-4">
          <p class="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">{{ card.label }}</p>
          <p class="mt-3 font-display text-3xl font-black text-white">{{ card.value }}</p>
          <p class="mt-2 text-xs font-bold leading-5 text-white/50">{{ card.description }}</p>
        </article>
      </section>

      <section class="bm-panel rounded-md p-5">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="bm-kicker">Banco de dados</p>
            <h2 class="mt-[6px] font-display text-2xl font-black uppercase text-white">Pendencias reais de equipamentos</h2>
            <p class="mt-2 text-sm font-semibold leading-6 text-white/62">
              Lista puxada da API para guiar remasterizacao, imagens pendentes e bonus Ancient/Mastery incompletos.
            </p>
          </div>

          <input
            v-model="gapSearch"
            class="h-11 w-full rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-blood-400/70 sm:w-72"
            placeholder="Buscar pendencia"
            type="search"
          >
        </div>

        <div v-if="isApiLoading" class="mt-5 rounded-md border border-white/10 bg-black/20 p-5 text-sm font-bold text-white/55">
          Carregando dados do PostgreSQL...
        </div>
        <div v-else-if="apiError" class="mt-5 rounded-md border border-blood-400/30 bg-blood-700/15 p-5 text-sm font-bold text-blood-100">
          {{ apiError }}
        </div>
        <div v-else class="mt-5 overflow-hidden rounded-md border border-white/10 bg-black/18">
          <div class="grid grid-cols-[1fr_120px_120px] gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/45 md:grid-cols-[1fr_160px_120px_160px]">
            <span>Equipamento</span>
            <span>Tipo</span>
            <span>Season</span>
            <span class="hidden md:block">Pendencia</span>
          </div>
          <article
            v-for="item in equipmentGapRows"
            :key="item.key"
            class="grid grid-cols-[1fr_120px_120px] gap-3 border-b border-white/10 px-4 py-3 last:border-b-0 md:grid-cols-[1fr_160px_120px_160px]"
          >
            <div>
              <h3 class="font-display text-lg font-black text-white">{{ item.name }}</h3>
              <p class="mt-1 text-xs font-bold leading-5 text-white/45">{{ item.baseSetName || item.category }}</p>
            </div>
            <span class="text-xs font-black uppercase tracking-[0.14em] text-white/60">{{ item.category }}</span>
            <span class="text-xs font-black uppercase tracking-[0.14em] text-ember">S{{ item.minSeason }}</span>
            <span class="hidden text-xs font-bold leading-5 text-white/58 md:block">{{ gapWarnings(item).join(', ') }}</span>
          </article>
        </div>
      </section>

      <section class="bm-panel rounded-md p-5">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="bm-kicker">Catalogo</p>
            <h2 class="mt-[6px] font-display text-2xl font-black uppercase text-white">Equipamentos administraveis</h2>
            <p class="mt-2 text-sm font-semibold leading-6 text-white/62">
              Base inicial para editar itens existentes e cadastrar itens exclusivos do servidor sem quebrar a Wiki publica.
            </p>
          </div>

          <input
            v-model="equipmentSearch"
            class="h-11 w-full rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-blood-400/70 sm:w-72"
            placeholder="Buscar equipamento"
            type="search"
          >
        </div>

        <div class="mt-5 overflow-hidden rounded-md border border-white/10 bg-black/18">
          <div class="grid grid-cols-[1fr_120px_120px] gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/45 md:grid-cols-[1fr_120px_160px_120px]">
            <span>Equipamento</span>
            <span>Grupo</span>
            <span class="hidden md:block">Categoria</span>
            <span>Status</span>
          </div>
          <article
            v-for="item in equipmentRows"
            :key="item.key"
            class="grid grid-cols-[1fr_120px_120px] gap-3 border-b border-white/10 px-4 py-3 last:border-b-0 md:grid-cols-[1fr_120px_160px_120px]"
          >
            <div>
              <h3 class="font-display text-lg font-black text-white">{{ item.name }}</h3>
              <p class="mt-1 text-xs font-bold leading-5 text-white/45">{{ item.key }}</p>
            </div>
            <span class="text-xs font-black uppercase tracking-[0.14em] text-white/60">{{ item.group }}</span>
            <span class="hidden text-xs font-black uppercase tracking-[0.14em] text-white/52 md:block">{{ item.category }}</span>
            <span class="text-xs font-black uppercase tracking-[0.14em] text-ember">{{ item.status }}</span>
          </article>
        </div>
      </section>

      <section class="bm-panel rounded-md p-5">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="bm-kicker">Referencias</p>
            <h2 class="mt-[6px] font-display text-2xl font-black uppercase text-white">Assets catalogados</h2>
            <p class="mt-2 text-sm font-semibold leading-6 text-white/62">
              Imagens, HTML e arquivos importados no PostgreSQL para revisao, remasterizacao e publicacao futura.
            </p>
          </div>

          <input
            v-model="assetSearch"
            class="h-11 w-full rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-blood-400/70 sm:w-72"
            placeholder="Buscar asset"
            type="search"
          >
        </div>

        <div v-if="apiError" class="mt-5 rounded-md border border-blood-400/30 bg-blood-700/15 p-5 text-sm font-bold text-blood-100">
          {{ apiError }}
        </div>
        <div v-else class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <article v-for="asset in assetRows" :key="asset.id" class="rounded-md border border-white/10 bg-black/18 p-4">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="text-[11px] font-black uppercase tracking-[0.18em] text-ember">{{ asset.kind }}</p>
                <h3 class="mt-2 truncate text-sm font-black text-white">{{ assetName(asset) }}</h3>
              </div>
              <span class="rounded-sm bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/58">
                {{ asset.status }}
              </span>
            </div>
            <p class="mt-3 line-clamp-2 text-xs font-bold leading-5 text-white/48">{{ asset.localPath }}</p>
            <p class="mt-3 text-[11px] font-black uppercase tracking-[0.12em] text-white/38">
              {{ asset.entries?.length || 0 }} vinculos editoriais
            </p>
          </article>
        </div>
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <article v-for="area in contentAreas" :key="area.title" class="bm-panel rounded-md p-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="bm-kicker">{{ area.kicker }}</p>
              <h2 class="mt-[6px] font-display text-2xl font-black uppercase text-white">{{ area.title }}</h2>
              <p class="mt-3 text-sm font-semibold leading-6 text-white/62">{{ area.description }}</p>
            </div>
            <span class="rounded-sm px-2 py-1 text-[11px] font-black uppercase tracking-[0.14em]" :class="statusClass(area.status)">
              {{ area.status }}
            </span>
          </div>

          <div class="mt-5 grid gap-2">
            <div v-for="item in area.items" :key="item" class="flex items-start gap-3 rounded-md border border-white/10 bg-black/18 p-3">
              <span class="mt-2 size-1.5 shrink-0 rounded-full bg-ember" />
              <p class="text-sm font-semibold leading-6 text-white/68">{{ item }}</p>
            </div>
          </div>
        </article>
      </section>

      <section class="bm-panel rounded-md p-5">
        <p class="bm-kicker">Regra de implementacao</p>
        <h2 class="mt-[6px] font-display text-2xl font-black uppercase text-white">Fluxo editorial obrigatorio</h2>
        <div class="mt-5 grid gap-3 md:grid-cols-4">
          <div v-for="(step, index) in editorialSteps" :key="step.title" class="rounded-md border border-white/10 bg-black/20 p-4">
            <span class="font-display text-2xl font-black text-ember">{{ String(index + 1).padStart(2, '0') }}</span>
            <h3 class="mt-3 font-display text-lg font-black text-white">{{ step.title }}</h3>
            <p class="mt-2 text-xs font-bold leading-5 text-white/55">{{ step.description }}</p>
          </div>
        </div>
      </section>
    </div>

    <div v-else class="bm-panel rounded-md p-6">
      <p class="bm-kicker">Administracao</p>
      <h1 class="mt-2 font-display text-4xl font-black uppercase">Acesso restrito</h1>
      <p class="mt-3 text-sm font-semibold leading-7 text-white/68">
        O CMS fica disponivel apenas para contas administrativas.
      </p>
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import { implementationRoadmap } from '~/data/implementationRoadmap'
import { permissions } from '~/data/security'

useSeoMeta({ title: 'Conteudo CMS' })

const { hasPermission, loadSession } = useAuth()
const adminApi = useAdminContentApi()
const apiSummary = ref<AdminSummary | null>(null)
const equipmentGaps = ref<AdminEquipmentGap[]>([])
const equipmentRecords = ref<AdminEquipmentRecord[]>([])
const referenceAssets = ref<AdminReferenceAsset[]>([])
const gapSearch = ref('')
const equipmentSearch = ref('')
const assetSearch = ref('')
const isApiLoading = ref(false)
const apiError = ref('')

type AdminSummary = {
  totals: {
    entries: number
    assets: number
    equipment: number
    pendingEntries: number
    missingImages: number
    missingSetOptions: number
  }
}

type AdminEquipmentGap = {
  key: string
  name: string
  category: string
  baseSetName?: string | null
  minSeason: number
  remapData?: {
    warnings?: string[]
  }
}

type AdminEquipmentRecord = {
  key: string
  name: string
  category: string
  group: string
  status: string
}

type AdminReferenceAsset = {
  id: string
  localPath: string
  publicPath?: string | null
  kind: string
  status: string
  entries?: unknown[]
}

type AdminPaginatedResponse<T> = {
  data: T[]
  total: number
}

onMounted(() => {
  loadSession()
  void loadAdminContent()
})

watch(gapSearch, () => {
  void loadEquipmentGaps()
})

watch(equipmentSearch, () => {
  void loadEquipmentRecords()
})

watch(assetSearch, () => {
  void loadReferenceAssets()
})

const contentAreas = [
  {
    kicker: 'Publicacao',
    title: 'Noticias e paginas',
    status: 'Planejado',
    description: 'Controle editorial das novidades, avisos, paginas institucionais, banners e carrossel.',
    items: ['Criar, editar, publicar e arquivar noticias.', 'Gerenciar banners/carrossel da home.', 'Editar paginas como About, Downloads e Rankings.']
  },
  {
    kicker: 'Base de conhecimento',
    title: 'Wiki e tutoriais',
    status: 'Em andamento',
    description: 'Conteudo tecnico do servidor com versionamento por season e revisao antes de publicar.',
    items: ['Editar personagens, classes, skills, mapas, monstros, drops, quests, NPCs e eventos.', 'Separar Season 6 publica de seasons futuras.', 'Aprovar conteudo bruto importado antes de aparecer para players.']
  },
  {
    kicker: 'Itens',
    title: 'Equipamentos e exclusivos',
    status: 'Em andamento',
    description: 'CRUD para sets, armas, escudos, asas, joias e itens exclusivos do Blood Moon.',
    items: ['Criar item exclusivo com imagem, classe alvo, season e opcoes.', 'Vincular pecas ao set sem poluir a listagem principal.', 'Controlar Normal, Excellent, Ancient, Socket, Lucky e Mastery por variante.']
  },
  {
    kicker: 'Midia',
    title: 'Referencias e imagens',
    status: 'Base coletada',
    description: 'Biblioteca visual separando referencia original, imagem remasterizada e asset aprovado.',
    items: ['Upload, edicao e exclusao de referencias.', 'Fila de remasterizacao para imagens com marca dagua.', 'Vinculo de imagem ao item, mapa, monstro ou personagem correto.']
  }
]

const editorialSteps = [
  { title: 'Bruto', description: 'Dado coletado ou criado, ainda sem curadoria.' },
  { title: 'Normalizado', description: 'Objeto padronizado com fonte, season, tipo e slug.' },
  { title: 'Revisado', description: 'Admin valida regras, imagem, duplicidade e aplicacao global.' },
  { title: 'Publicado', description: 'Conteudo aparece no site conforme permissao e season.' }
]

const summaryCards = computed(() => [
  { label: 'Entradas', value: apiSummary.value?.totals.entries ?? implementationRoadmap.length, description: 'Conteudos editoriais no banco.' },
  { label: 'Assets', value: apiSummary.value?.totals.assets ?? contentAreas.length, description: 'Imagens, HTML e arquivos de referencia.' },
  { label: 'Equipamentos', value: apiSummary.value?.totals.equipment ?? 0, description: 'Itens consolidados para Wiki e CMS.' },
  { label: 'Pendencias', value: (apiSummary.value?.totals.missingImages ?? 0) + (apiSummary.value?.totals.missingSetOptions ?? 0), description: 'Imagens e opcoes de set a completar.' }
])

const equipmentGapRows = computed(() => equipmentGaps.value.slice(0, 12))
const equipmentRows = computed(() => equipmentRecords.value.slice(0, 10))
const assetRows = computed(() => referenceAssets.value.slice(0, 9))

const gapWarnings = (item: AdminEquipmentGap) => {
  const warnings = item.remapData?.warnings || []
  return warnings.map((warning) => ({
    'missing-image': 'Imagem pendente',
    'missing-ancient-set-options': 'Bonus Ancient/Mastery pendente'
  })[warning] || warning)
}

const assetName = (asset: AdminReferenceAsset) => {
  const path = asset.publicPath || asset.localPath
  return path.split(/[\\/]/).filter(Boolean).at(-1) || path
}

let gapLoadId = 0
let equipmentLoadId = 0
let assetLoadId = 0

const loadEquipmentGaps = async () => {
  const loadId = ++gapLoadId
  try {
    const response = await adminApi.equipmentGaps({
      page: 1,
      pageSize: 12,
      search: gapSearch.value
    }) as AdminPaginatedResponse<AdminEquipmentGap>

    if (loadId === gapLoadId) {
      equipmentGaps.value = response.data
    }
  } catch (error) {
    if (loadId === gapLoadId) {
      console.error(error)
      apiError.value = 'Nao foi possivel carregar as pendencias da API administrativa.'
    }
  }
}

const loadEquipmentRecords = async () => {
  const loadId = ++equipmentLoadId
  try {
    const response = await adminApi.equipment({
      page: 1,
      pageSize: 10,
      search: equipmentSearch.value
    }) as AdminPaginatedResponse<AdminEquipmentRecord>

    if (loadId === equipmentLoadId) {
      equipmentRecords.value = response.data
    }
  } catch (error) {
    if (loadId === equipmentLoadId) {
      console.error(error)
      apiError.value = 'Nao foi possivel carregar os equipamentos da API administrativa.'
    }
  }
}

const loadReferenceAssets = async () => {
  const loadId = ++assetLoadId
  try {
    const response = await adminApi.assets({
      page: 1,
      pageSize: 9,
      search: assetSearch.value
    }) as AdminPaginatedResponse<AdminReferenceAsset>

    if (loadId === assetLoadId) {
      referenceAssets.value = response.data
    }
  } catch (error) {
    if (loadId === assetLoadId) {
      console.error(error)
      apiError.value = 'Nao foi possivel carregar os assets da API administrativa.'
    }
  }
}

const loadAdminContent = async () => {
  isApiLoading.value = true
  apiError.value = ''

  try {
    const [summary] = await Promise.all([
      adminApi.summary() as Promise<AdminSummary>,
      loadEquipmentGaps(),
      loadEquipmentRecords(),
      loadReferenceAssets()
    ])
    apiSummary.value = summary
  } catch (error) {
    console.error(error)
    apiError.value = 'Nao foi possivel carregar o resumo da API administrativa.'
  } finally {
    isApiLoading.value = false
  }
}

const statusClass = (status: string) => {
  if (status === 'Em andamento') return 'bg-sky-500/15 text-sky-100'
  if (status === 'Base coletada') return 'bg-emerald-500/15 text-emerald-100'
  return 'bg-white/10 text-white/66'
}
</script>

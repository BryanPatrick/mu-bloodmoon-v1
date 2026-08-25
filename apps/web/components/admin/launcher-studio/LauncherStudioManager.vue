<template>
  <section class="grid gap-4">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
      <div>
        <p class="bm-kicker">Launcher Studio</p>
        <h1 class="mt-1 font-display text-2xl font-black uppercase text-white">Editor visual do Launcher</h1>
        <p class="mt-1 text-xs font-semibold text-white/50">Estrutura fixa, conteudo remoto. Edite apenas os slots abaixo -- nunca posicao, CSS ou codigo.</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="bm-admin-chip" :class="pendingCount > 0 ? 'border-amber-400/50 text-amber-300' : ''">{{ pendingCount }} pendente(s)</span>
        <button class="bm-admin-action" type="button" :disabled="historyLoading" @click="toggleHistory"><History :size="14" /> Historico</button>
        <button class="bm-admin-primary" type="button" :disabled="publishing || pendingCount === 0" @click="doPublish"><UploadCloud :size="16" /> {{ publishing ? 'Publicando...' : 'Publicar' }}</button>
      </div>
    </header>

    <p v-if="message" class="rounded-md border border-white/10 bg-white/7 px-3 py-2 text-xs font-bold text-white/75">{{ message }}</p>

    <div v-if="historyOpen" class="rounded-md border border-white/10 bg-black/25 p-3">
      <p class="bm-admin-label mb-2">Historico de publicacoes (mais recente primeiro)</p>
      <div class="grid gap-1 max-h-48 overflow-y-auto">
        <div v-for="h in history" :key="h.id" class="flex items-center justify-between gap-2 rounded border border-white/5 bg-white/5 px-2 py-1 text-xs">
          <span class="font-bold text-white">v{{ h.version }}</span>
          <span class="text-white/50">{{ h.kind }}</span>
          <span class="flex-1 truncate text-white/40">{{ h.note || '—' }}</span>
          <span class="text-white/35">{{ new Date(h.publishedAt).toLocaleString('pt-BR') }}</span>
          <button class="bm-admin-action" type="button" @click="doRollback(h.version)"><RotateCcw :size="12" /> Reverter</button>
        </div>
      </div>
    </div>

    <div class="grid gap-2 rounded-md border border-white/10 bg-black/20 p-3 md:grid-cols-[1fr_1fr_1fr]">
      <label class="bm-admin-label">Pagina
        <select v-model="currentPage" class="bm-admin-field">
          <option v-for="p in pages" :key="p.page" :value="p.page">{{ pageLabels[p.page] || p.page }} ({{ p.slotCount }})</option>
        </select>
      </label>
      <label class="bm-admin-label">Resolucao / viewport
        <select v-model="viewportKey" class="bm-admin-field">
          <option v-for="v in viewportProfiles" :key="v.key" :value="v.key">{{ v.label }}</option>
        </select>
      </label>
      <label class="bm-admin-label">Estado do preview
        <select v-model="previewState" class="bm-admin-field">
          <option v-for="s in previewStates" :key="s" :value="s">{{ previewStateLabels[s] || s }}</option>
        </select>
      </label>
    </div>

    <div class="grid gap-4 lg:grid-cols-[1fr_320px]">
      <!-- LEFT/CENTER -- navigable preview -->
      <div class="rounded-md border border-white/10 bg-black/30 p-4">
        <div class="mx-auto overflow-hidden rounded border border-white/15 bg-[#0b0710]" :style="frameStyle">
          <div class="grid h-full" :class="isWide ? 'grid-cols-[180px_1fr]' : 'grid-cols-[220px_1fr]'">
            <!-- side nav (fixed structure) -->
            <nav class="flex flex-col gap-1 border-r border-white/10 bg-black/40 p-3 text-[11px] font-bold uppercase tracking-wide text-white/45">
              <span v-for="nav in navPages" :key="nav" :class="nav === currentPage ? 'text-crimson-300' : ''" class="cursor-pointer rounded px-2 py-1.5 hover:bg-white/5" @click="currentPage = nav">{{ pageLabels[nav] }}</span>
              <div class="mt-auto text-[10px] normal-case text-white/30">Estado: {{ previewStateLabels[previewState] }}</div>
            </nav>

            <!-- page content -->
            <div class="overflow-y-auto p-4 text-white/85">
              <template v-if="currentPage === 'HOME'">
                <div class="flex items-center justify-between">
                  <button class="rounded border border-dashed border-white/20 px-2 py-1 text-[10px] hover:border-crimson-400" @click="openSlot('home.brandLogo')">[logo]</button>
                  <div class="flex gap-2 text-[10px] text-white/40">{{ accountSummary }}</div>
                </div>
                <button class="mt-3 block w-full rounded border border-dashed border-white/20 p-4 text-left hover:border-crimson-400" @click="openSlot('home.hero.title')">
                  <p class="text-[10px] uppercase text-white/40">Hero {{ slotValue('home.hero.enabled') ? '(ativo)' : '(inativo)' }}</p>
                  <p class="mt-1 text-lg font-black">{{ slotValue('home.hero.title') || 'Titulo do hero' }}</p>
                  <p class="text-xs text-white/50">{{ slotValue('home.hero.subtitle') || 'Subtitulo do hero' }}</p>
                  <span class="mt-2 inline-block rounded bg-crimson-500/20 px-2 py-1 text-[10px] font-bold uppercase text-crimson-300">{{ slotValue('home.hero.ctaLabel') || 'Jogar agora' }}</span>
                </button>
                <button v-if="slotValue('home.campaign.enabled')" class="mt-2 block w-full rounded border border-dashed border-amber-400/30 p-2 text-left text-xs hover:border-amber-400" @click="openSlot('home.campaign.title')">
                  {{ slotValue('home.campaign.versionLabel') || 'CAMPANHA' }} — {{ slotValue('home.campaign.title') || 'Titulo da campanha' }}
                </button>
                <div class="mt-3 grid grid-cols-2 gap-2">
                  <button class="rounded border border-dashed border-white/15 p-2 text-left text-[10px] hover:border-crimson-400" @click="openSlot('home.activeEvent')">Evento ativo: {{ referenceLabel('home.activeEvent', fixtures?.events) }}</button>
                  <button class="rounded border border-dashed border-white/15 p-2 text-left text-[10px] hover:border-crimson-400" @click="openSlot('home.nextEvent')">Proximo evento: {{ referenceLabel('home.nextEvent', fixtures?.events) }}</button>
                </div>
                <p class="mt-3 text-[10px] uppercase text-white/35">Noticias (somente leitura -- editar em Conteudo &gt; Noticias)</p>
                <div class="mt-1 grid grid-cols-2 gap-2">
                  <div v-for="n in fixtureList(fixtures?.news)" :key="n.id" class="rounded border border-white/10 bg-white/5 p-2 text-[10px]"><strong class="block text-white/80">{{ n.title }}</strong>{{ n.cardSummary }}</div>
                </div>
                <button class="mt-3 flex gap-2" type="button" @click="openSlot('home.socials')">
                  <span v-for="s in slotValueList('home.socials')" :key="s.id" class="rounded border border-dashed border-white/15 px-2 py-1 text-[10px]">{{ s.label || s.id }}</span>
                  <span v-if="!slotValueList('home.socials').length" class="text-[10px] text-white/30">[editar redes sociais]</span>
                </button>
                <div class="mt-2 flex gap-3 text-[10px] text-white/40">
                  <button @click="openSlot('home.utilities.support.url')">SUPORTE</button>
                  <button @click="openSlot('home.utilities.site.url')">SITE</button>
                  <button @click="openSlot('home.utilities.wiki.url')">WIKI</button>
                </div>
              </template>

              <template v-else-if="currentPage === 'ACCOUNT'">
                <p class="text-xs uppercase text-white/40">Personagens ({{ previewStateLabels[previewState] }})</p>
                <div class="mt-2 grid gap-2">
                  <div v-for="c in accountCharacters" :key="c.id" class="flex items-center gap-2 rounded border border-white/10 bg-white/5 p-2 text-xs">
                    <button class="rounded border border-dashed border-white/20 px-1 text-[9px] hover:border-crimson-400" @click="openSlot('account.classIcon')">[icone]</button>
                    <span class="font-bold text-white">{{ c.name }}</span><span class="text-white/40">{{ c.className }} · lvl {{ c.level }}</span>
                  </div>
                  <p v-if="!accountCharacters.length" class="text-[10px] text-white/30">Sem personagens neste estado de preview.</p>
                </div>
                <button class="mt-3 rounded border border-dashed border-white/15 p-2 text-[10px] hover:border-crimson-400" @click="openSlot('account.guildEmblem')">[emblema de guild generico]</button>
              </template>

              <template v-else-if="currentPage === 'NEWS'">
                <p class="text-[10px] uppercase text-white/35">Lista de noticias (editar em Conteudo &gt; Noticias)</p>
                <div class="mt-2 grid gap-2">
                  <div v-for="n in fixtureList(fixtures?.news)" :key="n.id" class="rounded border border-white/10 bg-white/5 p-2 text-xs"><strong class="block">{{ n.title }}</strong><span class="text-white/45">{{ n.launcherSummary }}</span></div>
                </div>
              </template>

              <template v-else-if="currentPage === 'EVENTS'">
                <button class="block w-full rounded border border-dashed border-white/20 p-3 text-left text-xs hover:border-crimson-400" @click="openSlot('events.activeBanner')">[banner da pagina de eventos]</button>
                <div class="mt-2 grid gap-2">
                  <div v-for="e in fixtureList(fixtures?.events)" :key="e.id" class="rounded border border-white/10 bg-white/5 p-2 text-xs"><strong>{{ e.name }}</strong> — {{ e.shortDescription }}</div>
                </div>
              </template>

              <template v-else-if="currentPage === 'RANKING'">
                <button class="mb-2 rounded border border-dashed border-white/20 px-2 py-1 text-[10px] hover:border-crimson-400" @click="openSlot('ranking.classIcon')">[icones de classe]</button>
                <table class="w-full text-xs"><tbody>
                  <tr v-for="r in fixtureList(fixtures?.ranking)" :key="r.position" class="border-b border-white/5"><td class="py-1 text-white/40">#{{ r.position }}</td><td class="font-bold">{{ r.characterName }}</td><td class="text-white/45">{{ r.className }} · lvl {{ r.level }}</td></tr>
                </tbody></table>
              </template>

              <template v-else-if="currentPage === 'STORE'">
                <button class="block w-full rounded border border-dashed border-white/20 p-2 text-left text-[10px] hover:border-crimson-400" @click="openSlot('store.featuredBannerImage')">[banner de destaque]</button>
                <button class="mt-2 flex gap-2" @click="openSlot('store.currencyIcon')">
                  <span v-for="c in slotValueList('store.currencyIcon')" :key="c.currency" class="rounded border border-dashed border-white/15 px-2 py-1 text-[10px]">{{ c.currency }}</span>
                </button>
                <p class="mt-3 text-[10px] uppercase text-white/35">Produtos (editar em Loja)</p>
                <div class="mt-1 grid grid-cols-2 gap-2">
                  <div v-for="p in fixtureList(fixtures?.storeProducts)" :key="p.id" class="rounded border border-white/10 bg-white/5 p-2 text-[10px]"><strong class="block">{{ p.name }}</strong>{{ p.price }} {{ p.currency }}</div>
                </div>
              </template>

              <template v-else>
                <p class="text-xs text-white/40">Sem slots editaveis nesta pagina.</p>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT -- property inspector -->
      <aside class="rounded-md border border-white/10 bg-black/25 p-3">
        <p class="bm-admin-label mb-2">Inspector</p>
        <div v-if="!selectedSlot" class="text-xs text-white/40">Clique em um slot na pre-visualizacao para editar.</div>
        <SlotInspector v-else :slot-def="selectedSlot" :entry="selectedEntry" :assets="assetsCache" @save="saveSlot" @load-assets="loadAssets" @upload-asset="uploadAsset" />
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { History, RotateCcw, UploadCloud } from 'lucide-vue-next'
import SlotInspector from './SlotInspector.vue'

type SlotDef = { id: string; page: string; label: string; description: string; type: string; required: boolean; constraints: Record<string, unknown>; visualTokens: string[]; defaultValue: unknown }
type DraftEntry = { definition: SlotDef; draft: { value: unknown; tokens: Record<string, string> }; published: { value: unknown; tokens: Record<string, string> } | null; hasPendingChanges: boolean }

const api = useLauncherStudioApi()

const pageLabels: Record<string, string> = { HOME: 'Inicio', ACCOUNT: 'Conta', NEWS: 'Noticias', EVENTS: 'Eventos', RANKING: 'Ranking', STORE: 'Loja', SETTINGS: 'Configuracoes' }
const previewStateLabels: Record<string, string> = { LOGGED_OUT: 'Deslogado', LOGGED_IN_PENDING: 'Logado (provisionando)', LOGGED_IN_ACTIVE: 'Logado (ativo)', ZERO_CHARACTERS: 'Sem personagens', WITH_CHARACTERS: 'Com personagens' }
const previewStates = ['LOGGED_OUT', 'LOGGED_IN_PENDING', 'LOGGED_IN_ACTIVE', 'ZERO_CHARACTERS', 'WITH_CHARACTERS']

// Part Y/Z/AC -- real resolution numbers, not size labels. MAXIMIZED fills
// the available preview panel width at a 16:9-ish ratio rather than
// stretching uniformly.
const viewportProfiles = [
  { key: '1280x720', label: '1280×720 (base)', w: 1280, h: 720, wide: false },
  { key: '1600x900', label: '1600×900', w: 1600, h: 900, wide: false },
  { key: '1920x1080', label: '1920×1080', w: 1920, h: 1080, wide: false },
  { key: '1600x720-wide', label: '1600×720 WIDE', w: 1600, h: 720, wide: true },
  { key: '1920x800-wide', label: '1920×800 WIDE', w: 1920, h: 800, wide: true },
  { key: 'maximized', label: 'Maximizado', w: 0, h: 0, wide: true }
] as const
const navPages = ['HOME', 'ACCOUNT', 'NEWS', 'EVENTS', 'RANKING', 'STORE', 'SETTINGS']

const pages = ref<Array<{ page: string; slotCount: number }>>([])
const currentPage = ref('HOME')
const viewportKey = ref('1280x720')
const previewState = ref('LOGGED_OUT')
const allDraft = ref<DraftEntry[]>([])
const selectedSlotId = ref<string | null>(null)
const fixtures = ref<Record<string, unknown> | null>(null)
const history = ref<Array<{ id: string; version: number; kind: string; note: string | null; publishedAt: string }>>([])
const historyOpen = ref(false)
const historyLoading = ref(false)
const publishing = ref(false)
const message = ref('')
const assetsCache = ref<Array<Record<string, unknown>>>([])

const isWide = computed(() => viewportProfiles.find((v) => v.key === viewportKey.value)?.wide ?? false)
const frameStyle = computed(() => {
  const profile = viewportProfiles.find((v) => v.key === viewportKey.value)!
  if (profile.key === 'maximized') return { width: '100%', aspectRatio: '16 / 8.2', maxWidth: '100%' }
  const scale = Math.min(1, 900 / profile.w)
  return { width: `${profile.w * scale}px`, aspectRatio: `${profile.w} / ${profile.h}` }
})

const pendingCount = computed(() => allDraft.value.filter((e) => e.hasPendingChanges).length)
const selectedEntry = computed(() => allDraft.value.find((e) => e.definition.id === selectedSlotId.value) || null)
const selectedSlot = computed(() => selectedEntry.value?.definition || null)

const slotValue = (id: string) => allDraft.value.find((e) => e.definition.id === id)?.draft.value
const slotValueList = (id: string): Array<Record<string, unknown>> => {
  const value = slotValue(id)
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : []
}
const fixtureList = (value: unknown): Array<Record<string, unknown>> => (Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [])
const referenceLabel = (slotId: string, pool: unknown) => {
  const value = slotValue(slotId) as string | null
  if (!value) return 'nao definido'
  const match = fixtureList(pool).find((item) => item.id === value)
  return (match?.name as string) || (match?.title as string) || value
}

const accountSummary = computed(() => {
  const account = fixtures.value?.account as { username?: string } | null
  return account ? account.username : 'sem sessao'
})
const accountCharacters = computed(() => {
  const account = fixtures.value?.account as { characters?: Array<Record<string, unknown>> } | null
  return account?.characters || []
})

async function loadRegistryAndDraft() {
  const [p, draft] = await Promise.all([api.pages(), api.draft()])
  pages.value = p as Array<{ page: string; slotCount: number }>
  allDraft.value = draft as DraftEntry[]
}
async function loadFixtures() {
  fixtures.value = await api.previewFixtures(previewState.value)
}
async function loadHistory() {
  historyLoading.value = true
  try { history.value = await api.publishHistory() } finally { historyLoading.value = false }
}
function toggleHistory() { historyOpen.value = !historyOpen.value; if (historyOpen.value) void loadHistory() }

function openSlot(id: string) {
  if (!allDraft.value.find((e) => e.definition.id === id)) return
  selectedSlotId.value = id
}

async function saveSlot(payload: { value: unknown; tokens?: Record<string, string> }) {
  if (!selectedSlot.value) return
  try {
    await api.updateSlot(selectedSlot.value.id, payload)
    message.value = `Slot "${selectedSlot.value.label}" salvo como rascunho.`
    await loadRegistryAndDraft()
  } catch {
    message.value = 'Nao foi possivel salvar este slot.'
  }
}

async function doPublish() {
  publishing.value = true
  try {
    await api.publish('Publicado via Launcher Studio')
    message.value = 'Conteudo publicado.'
    await loadRegistryAndDraft()
  } catch {
    message.value = 'Nao foi possivel publicar.'
  } finally {
    publishing.value = false
  }
}
async function doRollback(version: number) {
  if (!confirm(`Reverter para a versao ${version}? Isso cria uma nova versao de publicacao.`)) return
  try {
    await api.rollback(version, `Rollback via Launcher Studio para v${version}`)
    message.value = `Revertido para a versao ${version}.`
    await Promise.all([loadRegistryAndDraft(), loadHistory()])
  } catch {
    message.value = 'Nao foi possivel reverter.'
  }
}
async function loadAssets(category?: string) {
  const result = await api.assets(category ? { category } : {})
  assetsCache.value = result.items
}
async function uploadAsset(payload: { name: string; category: string; dataUrl: string }) {
  await api.uploadAsset(payload)
  await loadAssets(payload.category)
}

onMounted(async () => {
  try { await Promise.all([loadRegistryAndDraft(), loadFixtures()]) } catch { message.value = 'Falha ao carregar o Launcher Studio.' }
})
watch(previewState, loadFixtures)
</script>

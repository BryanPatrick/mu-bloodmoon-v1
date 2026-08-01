<template>
  <section class="grid gap-4">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="bm-kicker">Editorial</p>
        <h2 class="mt-1 font-display text-2xl font-black uppercase text-white">{{ areaConfig.label }}</h2>
      </div>
      <button class="bm-admin-primary" type="button" @click="createNew"><Plus :size="16" /> Novo conteudo</button>
    </header>

    <div class="grid gap-2 rounded-md border border-white/10 bg-black/20 p-3 md:grid-cols-[1fr_190px_170px]">
      <input v-model="search" class="bm-admin-field" type="search" placeholder="Buscar por titulo, slug ou resumo">
      <select v-model="kind" class="bm-admin-field"><option value="">Todos os tipos</option><option v-for="item in areaConfig.kinds" :key="item" :value="item">{{ item }}</option></select>
      <select v-model="status" class="bm-admin-field"><option value="">Todos os status</option><option v-for="item in statuses" :key="item" :value="item">{{ item }}</option></select>
    </div>

    <p v-if="message" class="rounded-md border border-white/10 bg-white/7 px-3 py-2 text-xs font-bold text-white/75">{{ message }}</p>
    <div class="overflow-hidden rounded-md border border-white/10">
      <article v-for="item in rows" :key="item.id" class="grid gap-3 border-b border-white/10 bg-black/18 p-3 last:border-0 md:grid-cols-[1fr_130px_130px_auto] md:items-center">
        <div><strong class="text-sm text-white">{{ item.title }}</strong><p class="mt-1 text-xs text-white/48">{{ item.slug }} · {{ item.summary || 'Sem resumo' }}</p></div>
        <span class="bm-admin-chip">{{ item.kind }}</span><span class="bm-admin-chip">{{ item.status }}</span>
        <div class="flex gap-2"><button class="bm-admin-action" type="button" @click="edit(item)"><Pencil :size="14" /> Editar</button><button class="bm-admin-danger" type="button" @click="archive(item)"><Archive :size="14" /></button></div>
      </article>
      <p v-if="!loading && !rows.length" class="p-8 text-center text-sm font-bold text-white/45">Nenhum conteudo encontrado.</p>
    </div>

    <CmsModal :open="modalOpen" :title="form.id ? 'Editar conteudo' : 'Novo conteudo'" @close="modalOpen = false">
      <form class="grid gap-4" @submit.prevent="save">
        <div class="grid gap-3 md:grid-cols-2"><label class="bm-admin-label">Titulo<input v-model="form.title" required class="bm-admin-field"></label><label class="bm-admin-label">Slug<input v-model="form.slug" class="bm-admin-field" placeholder="Gerado automaticamente"></label></div>
        <div class="grid gap-3 md:grid-cols-3"><label class="bm-admin-label">Tipo<select v-model="form.kind" class="bm-admin-field"><option v-for="item in areaConfig.kinds" :key="item" :value="item">{{ item }}</option></select></label><label class="bm-admin-label">Escopo<select v-model="form.scope" class="bm-admin-field"><option v-for="item in scopes" :key="item" :value="item">{{ item }}</option></select></label><label class="bm-admin-label">Status<select v-model="form.status" class="bm-admin-field"><option v-for="item in statuses" :key="item" :value="item">{{ item }}</option></select></label></div>
        <label class="bm-admin-label">Resumo<textarea v-model="form.summary" class="bm-admin-field min-h-20" /></label>
        <label class="bm-admin-label">Conteudo<textarea v-model="form.content" class="bm-admin-field min-h-64" placeholder="Texto que sera renderizado no site" /></label>
        <div class="grid gap-3 md:grid-cols-2"><label class="bm-admin-label">Season minima<input v-model.number="form.seasonMin" class="bm-admin-field" type="number" min="1" max="6"></label><label class="bm-admin-label">Season maxima<input v-model.number="form.seasonMax" class="bm-admin-field" type="number" min="1" max="6"></label></div>
        <div class="flex justify-end gap-2"><button class="bm-admin-action" type="button" @click="modalOpen = false">Cancelar</button><button class="bm-admin-primary" :disabled="saving" type="submit"><Save :size="16" /> {{ saving ? 'Salvando...' : 'Salvar' }}</button></div>
      </form>
    </CmsModal>
  </section>
</template>

<script setup lang="ts">
import { Archive, Pencil, Plus, Save } from 'lucide-vue-next'

const props = withDefaults(defineProps<{ area?: string }>(), { area: 'paginas' })

type Entry = { id: string; title: string; slug: string; kind: string; scope: string; status: string; summary?: string | null; seasonMin?: number | null; seasonMax?: number | null; normalizedData?: Record<string, unknown> | null }
const api = useAdminContentApi()
const areaDefinitions: Record<string, { label: string, kinds: string[] }> = {
  noticias: { label: 'Notícias', kinds: ['NEWS'] },
  eventos: { label: 'Eventos', kinds: ['EVENT'] },
  wiki: { label: 'Wiki e guias', kinds: ['GUIDE', 'LORE', 'QUEST', 'NPC', 'SKILL', 'MONSTER', 'DROP'] },
  paginas: { label: 'Páginas institucionais', kinds: ['PAGE', 'DOWNLOAD', 'NAVIGATION'] },
  banners: { label: 'Banners', kinds: ['BANNER'] },
  classes: { label: 'Classes e personagens', kinds: ['CHARACTER'] },
  mapas: { label: 'Mapas', kinds: ['MAP', 'MONSTER', 'DROP'] }
}
const areaConfig = computed(() => areaDefinitions[props.area] || areaDefinitions.paginas!)
const statuses = ['RAW', 'NORMALIZED', 'REVIEWED', 'APPROVED', 'PUBLISHED', 'ARCHIVED']
const scopes = ['SEASON_6', 'OFF_TOPIC', 'NEEDS_REVIEW']
const rows = ref<Entry[]>([]); const search = ref(''); const kind = ref(''); const status = ref(''); const loading = ref(false); const saving = ref(false); const modalOpen = ref(false); const message = ref('')
const emptyForm = () => ({ id: '', title: '', slug: '', kind: areaConfig.value.kinds[0] || 'PAGE', scope: 'SEASON_6', status: 'RAW', summary: '', content: '', seasonMin: 1 as number | null, seasonMax: 6 as number | null })
const form = reactive(emptyForm())
let timer: ReturnType<typeof setTimeout> | undefined
const load = async () => { loading.value = true; try { const onlyKind = areaConfig.value.kinds.length === 1 ? areaConfig.value.kinds[0] : kind.value; const result = await api.entries({ pageSize: 100, search: search.value, kind: onlyKind, status: status.value }) as { data: Entry[] }; rows.value = result.data.filter((entry) => areaConfig.value.kinds.includes(entry.kind) && (!kind.value || entry.kind === kind.value)) } catch { message.value = 'Falha ao carregar o conteúdo.' } finally { loading.value = false } }
watch([search, kind, status], () => { clearTimeout(timer); timer = setTimeout(load, 250) })
onMounted(load)
watch(() => props.area, () => { kind.value = ''; Object.assign(form, emptyForm()); void load() })
const createNew = () => { Object.assign(form, emptyForm()); modalOpen.value = true }
const edit = (item: Entry) => { Object.assign(form, emptyForm(), item, { content: typeof item.normalizedData?.content === 'string' ? item.normalizedData.content : '' }); modalOpen.value = true }
const save = async () => { saving.value = true; try { const payload = { title: form.title, slug: form.slug, kind: form.kind, scope: form.scope, status: form.status, summary: form.summary, seasonMin: form.seasonMin, seasonMax: form.seasonMax, normalizedData: { content: form.content } }; form.id ? await api.updateEntry(form.id, payload) : await api.createEntry(payload); modalOpen.value = false; message.value = 'Conteudo salvo e registrado na auditoria.'; await load() } catch { message.value = 'Nao foi possivel salvar o conteudo.' } finally { saving.value = false } }
const archive = async (item: Entry) => { if (!confirm(`Arquivar ${item.title}?`)) return; await api.archiveEntry(item.id); message.value = 'Conteudo arquivado e registrado na auditoria.'; await load() }
</script>

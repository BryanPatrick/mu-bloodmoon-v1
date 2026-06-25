<template>
  <ManagementShell>
    <div v-if="hasPermission(permissions.adminReferencesManage)">
      <div class="flex flex-col gap-6 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-3xl">
          <p class="text-xs font-black uppercase tracking-[0.4em] text-ember">Desenvolvimento</p>
          <h1 class="mt-3 font-display text-4xl font-black uppercase sm:text-5xl">Referencias</h1>
          <p class="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/70">
            Biblioteca visual e tecnica para escolher personagens, equipamentos, mapas, monstros e fontes antes de publicar no site principal.
          </p>
        </div>

        <div class="bm-glass flex flex-col gap-3 rounded-md p-3 sm:flex-row sm:items-center">
          <button class="rounded-md bg-blood-700 px-4 py-3 text-sm font-black text-white transition hover:bg-blood-600" type="button" @click="openCreate">
            Nova referencia
          </button>
          <select
            v-model="activeLibrary"
            class="h-11 min-w-0 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none transition focus:border-blood-400/70 sm:w-72"
          >
            <option v-for="library in libraryOptions" :key="library" class="bg-zinc-950 text-white" :value="library">
              {{ library }}
            </option>
          </select>
          <input
            v-model="query"
            class="h-11 min-w-0 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/45 focus:border-blood-400/70 sm:w-72"
            placeholder="Buscar referencia"
            type="search"
          >
          <select
            v-model="activeStatus"
            class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none transition focus:border-blood-400/70"
          >
            <option class="bg-zinc-950 text-white" value="Todos">Todos</option>
            <option v-for="status in statuses" :key="status" class="bg-zinc-950 text-white" :value="status">{{ status }}</option>
          </select>
        </div>
      </div>

      <div class="mt-6 flex flex-wrap gap-2">
        <button
          v-for="group in groupsWithCounts"
          :key="group.name"
          class="bm-button-glass rounded-md px-4 py-2 text-sm font-black transition hover:scale-[1.02]"
          :class="{ 'bm-nav-link-active': activeGroup === group.name }"
          type="button"
          @click="selectGroup(group.name)"
        >
          {{ group.name }} <span class="ml-2 text-white/55">{{ group.count }}</span>
        </button>
      </div>

      <div class="mt-7 rounded-md border border-white/10 bg-white/[0.035] p-3">
        <label class="grid gap-2 text-xs font-black uppercase tracking-[0.22em] text-white/45">
          Filtrar categoria
          <select
            v-model="activeSectionKey"
            class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none transition focus:border-blood-400/70"
          >
            <option class="bg-zinc-950 text-white" value="">Selecione o que deseja visualizar</option>
            <option v-for="section in groupedAssets" :key="section.key" class="bg-zinc-950 text-white" :value="section.key">
              {{ section.title }} - {{ section.assets.length }} referencias
            </option>
          </select>
        </label>
      </div>

      <div v-if="selectedSection" class="mt-8 grid gap-10">
        <section class="grid gap-4">
          <div class="flex flex-col gap-2 border-b border-white/10 pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p class="text-[11px] font-black uppercase tracking-[0.28em] text-ember">{{ selectedSection.eyebrow }}</p>
              <h2 class="mt-1 font-display text-2xl font-black uppercase text-white">{{ selectedSection.title }}</h2>
            </div>
            <span class="text-xs font-black uppercase tracking-[0.2em] text-white/45">
              {{ selectedSection.assets.length }} referencias
            </span>
          </div>

          <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 min-[1700px]:grid-cols-5">
            <article
              v-for="asset in visibleSelectedAssets"
              :key="assetKey(asset)"
              class="overflow-hidden rounded-md border border-white/10 bg-white/[0.045] shadow-soft"
            >
              <div class="relative aspect-[16/10] overflow-hidden bg-black/40">
                <img
                  v-if="asset.image"
                  :src="asset.image"
                  :alt="asset.title"
                  class="h-full w-full object-cover"
                  decoding="async"
                  loading="lazy"
                >
                <div v-else class="grid h-full place-items-center bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.14),rgba(255,255,255,0.03)_36%,rgba(0,0,0,0.3))]">
                  <span class="rounded-md border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-white/65">
                    Sem imagem local
                  </span>
                </div>
                <div class="absolute left-3 top-3 rounded-sm bg-black/60 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-md">
                  {{ asset.category }}
                </div>
              </div>

              <div class="grid gap-4 p-4">
                <div>
                  <h3 class="font-display text-xl font-black leading-tight">{{ asset.title }}</h3>
                  <p class="mt-2 text-sm font-semibold leading-6 text-white/68">{{ asset.notes }}</p>
                </div>

                <div class="flex flex-wrap gap-2">
                  <span class="rounded-sm bg-ember/15 px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-ember">{{ assetLibrary(asset) }}</span>
                  <span class="rounded-sm bg-white/10 px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-white/75">{{ asset.status }}</span>
                  <span class="rounded-sm bg-blood-700/25 px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-blood-200">{{ asset.compatibility }}</span>
                </div>

                <div class="flex gap-2 border-t border-white/10 pt-3">
                  <button class="bm-button-glass rounded-md px-3 py-2 text-xs font-black" type="button" @click="openEdit(asset)">
                    Editar
                  </button>
                  <button
                    v-if="isCustomAsset(asset)"
                    class="rounded-md border border-blood-500/40 bg-blood-900/30 px-3 py-2 text-xs font-black text-blood-100"
                    type="button"
                    @click="deleteAsset(asset)"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </article>
          </div>

          <div v-if="remainingSelectedAssets > 0" class="flex justify-center border-t border-white/10 pt-5">
            <button class="bm-button-glass rounded-md px-5 py-3 text-sm font-black" type="button" @click="showMoreAssets">
              Mostrar mais {{ nextAssetsAmount }} de {{ remainingSelectedAssets }}
            </button>
          </div>
        </section>
      </div>

      <div v-else class="mt-8 grid min-h-[320px] place-items-center rounded-md border border-dashed border-white/15 bg-white/[0.035] p-8 text-center">
        <div class="max-w-xl">
          <p class="text-xs font-black uppercase tracking-[0.32em] text-ember">Selecione uma categoria</p>
          <h2 class="mt-3 font-display text-3xl font-black uppercase text-white">Nada renderizado ainda</h2>
          <p class="mt-3 text-sm font-semibold leading-7 text-white/62">
            Escolha um grupo e depois uma categoria no filtro para visualizar apenas as referencias que deseja consultar.
          </p>
        </div>
      </div>

      <div v-if="filteredAssets.length === 0" class="mt-10 rounded-md border border-white/10 bg-white/[0.04] p-8 text-center text-sm font-bold text-white/60">
        Nenhuma referencia encontrada.
      </div>

      <div v-if="isEditorOpen" class="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4 backdrop-blur-md" @click.self="closeEditor">
        <form class="bm-panel grid max-h-[90vh] w-full max-w-3xl gap-5 overflow-y-auto rounded-md p-5 sm:p-6" @submit.prevent="saveAsset">
          <div class="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p class="bm-kicker">{{ editingKey ? 'Editar referencia' : 'Nova referencia' }}</p>
              <h2 class="mt-2 font-display text-3xl font-black uppercase text-white">{{ form.title || 'Referencia' }}</h2>
            </div>
            <button class="bm-button-glass rounded-md px-3 py-2 text-sm font-black" type="button" @click="closeEditor">
              Fechar
            </button>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="grid gap-2 text-sm font-bold text-white/70">
              Titulo
              <input v-model="form.title" required class="h-11 rounded-md border border-white/10 bg-black/25 px-3 text-white outline-none focus:border-blood-400/70">
            </label>
            <label class="grid gap-2 text-sm font-bold text-white/70">
              Categoria
              <input v-model="form.category" required class="h-11 rounded-md border border-white/10 bg-black/25 px-3 text-white outline-none focus:border-blood-400/70" placeholder="Fairy Elf, Sets - Dark Lord...">
            </label>
            <label class="grid gap-2 text-sm font-bold text-white/70">
              Grupo
              <select v-model="form.group" class="h-11 rounded-md border border-white/10 bg-black/25 px-3 text-white outline-none focus:border-blood-400/70">
                <option v-for="group in devReferenceGroups" :key="group" class="bg-zinc-950 text-white" :value="group">{{ group }}</option>
              </select>
            </label>
            <label class="grid gap-2 text-sm font-bold text-white/70">
              Biblioteca
              <select v-model="form.library" class="h-11 rounded-md border border-white/10 bg-black/25 px-3 text-white outline-none focus:border-blood-400/70">
                <option v-for="library in libraryOptions" :key="library" class="bg-zinc-950 text-white" :value="library">{{ library }}</option>
              </select>
            </label>
            <label class="grid gap-2 text-sm font-bold text-white/70">
              Status
              <select v-model="form.status" class="h-11 rounded-md border border-white/10 bg-black/25 px-3 text-white outline-none focus:border-blood-400/70">
                <option class="bg-zinc-950 text-white" value="Imagem local">Imagem local</option>
                <option class="bg-zinc-950 text-white" value="Catalogado">Catalogado</option>
                <option class="bg-zinc-950 text-white" value="Coletar imagem">Coletar imagem</option>
              </select>
            </label>
            <label class="grid gap-2 text-sm font-bold text-white/70">
              Compatibilidade
              <select v-model="form.compatibility" class="h-11 rounded-md border border-white/10 bg-black/25 px-3 text-white outline-none focus:border-blood-400/70">
                <option class="bg-zinc-950 text-white" value="v6-prioridade">v6-prioridade</option>
                <option class="bg-zinc-950 text-white" value="validar">validar</option>
                <option class="bg-zinc-950 text-white" value="high-version-futuro">high-version-futuro</option>
                <option class="bg-zinc-950 text-white" value="referencia-visual">referencia-visual</option>
              </select>
            </label>
          </div>

          <label class="grid gap-2 text-sm font-bold text-white/70">
            Observacoes
            <textarea v-model="form.notes" rows="4" class="rounded-md border border-white/10 bg-black/25 px-3 py-3 text-white outline-none focus:border-blood-400/70" />
          </label>

          <div class="grid gap-4 md:grid-cols-[220px_1fr]">
            <div class="relative aspect-[16/10] overflow-hidden rounded-md border border-white/10 bg-black/35">
              <img v-if="form.image" :src="form.image" alt="" class="h-full w-full object-cover" decoding="async">
              <div v-else class="grid h-full place-items-center text-xs font-black uppercase tracking-[0.2em] text-white/45">Sem imagem</div>
            </div>
            <label class="grid content-start gap-2 text-sm font-bold text-white/70">
              Enviar imagem
              <input class="rounded-md border border-white/10 bg-black/25 px-3 py-3 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-blood-700 file:px-3 file:py-2 file:text-white" type="file" accept="image/*" @change="handleImageUpload">
              <span class="text-xs font-semibold leading-6 text-white/45">A imagem fica salva no navegador por enquanto. Quando ligarmos backend, esse mesmo fluxo envia para o servidor.</span>
            </label>
          </div>

          <div class="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-4">
            <button class="bm-button-glass rounded-md px-4 py-3 text-sm font-black" type="button" @click="closeEditor">Cancelar</button>
            <button class="rounded-md bg-blood-700 px-4 py-3 text-sm font-black text-white transition hover:bg-blood-600" type="submit">Salvar</button>
          </div>
        </form>
      </div>
    </div>

    <div v-else class="bm-panel rounded-md p-6">
      <p class="bm-kicker">Administracao</p>
      <h1 class="mt-2 font-display text-4xl font-black uppercase">Acesso restrito</h1>
      <p class="mt-3 text-sm font-semibold leading-7 text-white/68">
        Referencias de desenvolvimento ficam disponiveis apenas para contas administrativas.
      </p>
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import { devReferenceAssets, devReferenceGroups, type DevReferenceAsset, type DevReferenceGroup, type DevReferenceLibrary, type DevReferenceStatus } from '~/data/devReferenceAssets'
import { permissions } from '~/data/security'

type EditableReferenceAsset = DevReferenceAsset & {
  id: string
  originalKey?: string
  source: string
  notes: string
  library: DevReferenceLibrary
}

type ReferenceForm = {
  title: string
  group: DevReferenceGroup
  category: string
  image: string
  status: DevReferenceStatus
  compatibility: DevReferenceAsset['compatibility']
  library: DevReferenceLibrary
  notes: string
}

useHead({
  title: 'Referencias de Desenvolvimento | Blood Moon'
})

const { hasPermission, loadSession, recordAudit } = useAuth()
const route = useRoute()
const router = useRouter()
const activeGroup = ref<DevReferenceGroup>('Personagens')
const activeLibrary = ref<DevReferenceLibrary>('Referencias de desenvolvimento')
const activeStatus = ref<DevReferenceStatus | 'Todos'>('Todos')
const activeSectionKey = ref('')
const visibleAssetLimit = ref(40)
const query = ref('')
const storedAssets = ref<EditableReferenceAsset[]>([])
const editingKey = ref('')
const isEditorOpen = ref(false)
const form = reactive<ReferenceForm>({
  title: '',
  group: 'Personagens',
  category: '',
  image: '',
  status: 'Imagem local',
  compatibility: 'referencia-visual',
  library: 'Referencias de desenvolvimento',
  notes: ''
})

onMounted(() => {
  loadSession()
  loadStoredAssets()
})

const libraryOptions: DevReferenceLibrary[] = ['Referencias de desenvolvimento', 'Gerados e otimizados']
const assetLibrary = (asset: DevReferenceAsset): DevReferenceLibrary => asset.library || 'Referencias de desenvolvimento'

const allAssets = computed<DevReferenceAsset[]>(() => {
  const overriddenKeys = new Set(storedAssets.value.map((asset) => asset.originalKey).filter(Boolean))
  return [
    ...devReferenceAssets.filter((asset) => !overriddenKeys.has(assetKey(asset))),
    ...storedAssets.value
  ]
})
const libraryAssets = computed(() => allAssets.value.filter((asset) => assetLibrary(asset) === activeLibrary.value))
const statuses = computed(() => Array.from(new Set(libraryAssets.value.map((asset) => asset.status))))
const groupsWithCounts = computed(() =>
  devReferenceGroups.map((group) => ({
    name: group,
    count: libraryAssets.value.filter((asset) => asset.group === group).length
  }))
)

const selectGroup = (group: DevReferenceGroup) => {
  activeGroup.value = group
  activeSectionKey.value = ''
  router.replace({ query: { ...route.query, grupo: group } })
}

const filteredAssets = computed(() => {
  const search = query.value.trim().toLowerCase()

  return libraryAssets.value.filter((asset) => {
    const matchesGroup = asset.group === activeGroup.value
    const matchesStatus = activeStatus.value === 'Todos' || asset.status === activeStatus.value
    const haystack = `${asset.title} ${asset.group} ${asset.category} ${asset.source} ${asset.notes} ${asset.compatibility}`.toLowerCase()
    const matchesSearch = !search || haystack.includes(search)

    return matchesGroup && matchesStatus && matchesSearch
  })
})

const sectionEyebrow = (group: DevReferenceGroup) => {
  const labels: Record<DevReferenceGroup, string> = {
    Personagens: 'Referencias para aparencia de personagens',
    Equipamentos: 'Referencias para equipamentos',
    Mapas: 'Referencias para mapas',
    Monstros: 'Referencias para monstros',
    Fontes: 'Fontes e sistemas'
  }

  return labels[group]
}

const sectionTitle = (asset: DevReferenceAsset) => {
  if (asset.group === 'Personagens' && asset.category !== 'Personagem externo') {
    return `Aparencia - ${asset.category}`
  }

  if (asset.group === 'Personagens') {
    return 'Dados por personagem'
  }

  return asset.category
}

const groupedAssets = computed(() => {
  const sections = new Map<string, { key: string, title: string, eyebrow: string, assets: DevReferenceAsset[] }>()

  for (const asset of filteredAssets.value) {
    const title = sectionTitle(asset)
    const key = `${asset.group}-${title}`

    if (!sections.has(key)) {
      sections.set(key, {
        key,
        title,
        eyebrow: sectionEyebrow(asset.group),
        assets: []
      })
    }

    sections.get(key)?.assets.push(asset)
  }

  return Array.from(sections.values()).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
})

const selectedSection = computed(() => groupedAssets.value.find((section) => section.key === activeSectionKey.value))
const visibleSelectedAssets = computed(() => selectedSection.value?.assets.slice(0, visibleAssetLimit.value) || [])
const remainingSelectedAssets = computed(() => Math.max((selectedSection.value?.assets.length || 0) - visibleSelectedAssets.value.length, 0))
const nextAssetsAmount = computed(() => Math.min(40, remainingSelectedAssets.value))
const assetKey = (asset: DevReferenceAsset) => asset.id || `${asset.group}-${asset.category}-${asset.title}`
const isCustomAsset = (asset: DevReferenceAsset) => Boolean(asset.id)

const persistStoredAssets = () => {
  if (import.meta.client) {
    localStorage.setItem('blood-moon-dev-reference-assets', JSON.stringify(storedAssets.value))
  }
}

const loadStoredAssets = () => {
  if (!import.meta.client) {
    return
  }

  try {
    const saved = localStorage.getItem('blood-moon-dev-reference-assets')
    storedAssets.value = saved ? JSON.parse(saved) : []
  } catch {
    storedAssets.value = []
    localStorage.removeItem('blood-moon-dev-reference-assets')
  }
}

const resetForm = () => {
  form.title = ''
  form.group = activeGroup.value
  form.category = selectedSection.value?.title.replace(/^Aparencia - /, '') || ''
  form.image = ''
  form.status = 'Imagem local'
  form.compatibility = 'referencia-visual'
  form.library = activeLibrary.value
  form.notes = ''
}

const openCreate = () => {
  editingKey.value = ''
  resetForm()
  isEditorOpen.value = true
}

const openEdit = (asset: DevReferenceAsset) => {
  editingKey.value = assetKey(asset)
  form.title = asset.title
  form.group = asset.group
  form.category = asset.category
  form.image = asset.image || ''
  form.status = asset.status
  form.compatibility = asset.compatibility
  form.library = assetLibrary(asset)
  form.notes = asset.notes
  isEditorOpen.value = true
}

const closeEditor = () => {
  isEditorOpen.value = false
  editingKey.value = ''
}

const handleImageUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    form.image = String(reader.result || '')
  }
  reader.readAsDataURL(file)
}

const saveAsset = () => {
  const asset: EditableReferenceAsset = {
    id: editingKey.value.startsWith('custom-') || editingKey.value.startsWith('override-') ? editingKey.value : `custom-${Date.now()}`,
    originalKey: editingKey.value && !editingKey.value.startsWith('custom-') && !editingKey.value.startsWith('override-') ? editingKey.value : undefined,
    title: form.title.trim(),
    group: form.group,
    category: form.category.trim(),
    image: form.image || undefined,
    status: form.status,
    compatibility: form.compatibility,
    library: form.library,
    source: 'Painel admin',
    notes: form.notes.trim() || 'Referencia adicionada pelo painel administrativo.'
  }

  if (asset.originalKey) {
    asset.id = `override-${asset.originalKey}`
  }

  const existingIndex = storedAssets.value.findIndex((item) => item.id === asset.id || (asset.originalKey && item.originalKey === asset.originalKey))
  const action = existingIndex >= 0 ? 'editada' : 'criada'
  if (existingIndex >= 0) {
    storedAssets.value.splice(existingIndex, 1, asset)
  } else {
    storedAssets.value.push(asset)
  }

  activeGroup.value = asset.group
  activeLibrary.value = asset.library
  activeStatus.value = 'Todos'
  persistStoredAssets()
  recordAudit({
    type: existingIndex >= 0 ? 'references.asset.updated' : 'references.asset.created',
    message: `Referencia ${action}: ${asset.title}.`,
    meta: {
      group: asset.group,
      category: asset.category,
      library: asset.library
    }
  })
  closeEditor()
  nextTick(() => {
    activeSectionKey.value = `${asset.group}-${sectionTitle(asset)}`
  })
}

const deleteAsset = (asset: DevReferenceAsset) => {
  if (!asset.id) {
    return
  }

  const confirmed = window.confirm(`Excluir "${asset.title}"?`)
  if (!confirmed) {
    return
  }

  storedAssets.value = storedAssets.value.filter((item) => item.id !== asset.id)
  persistStoredAssets()
  recordAudit({
    type: 'references.asset.deleted',
    message: `Referencia excluida: ${asset.title}.`,
    meta: {
      group: asset.group,
      category: asset.category
    }
  })
  if (!selectedSection.value?.assets.length) {
    activeSectionKey.value = ''
  }
}

watch(
  () => route.query.grupo,
  (group) => {
    if (typeof group === 'string' && devReferenceGroups.includes(group as DevReferenceGroup)) {
      activeGroup.value = group as DevReferenceGroup
      activeSectionKey.value = ''
    }
  },
  { immediate: true }
)

watch([activeStatus, query], () => {
  activeSectionKey.value = ''
  visibleAssetLimit.value = 40
})

watch(activeLibrary, () => {
  activeSectionKey.value = ''
  visibleAssetLimit.value = 40
  if (!groupsWithCounts.value.some((group) => group.name === activeGroup.value && group.count > 0)) {
    activeGroup.value = groupsWithCounts.value.find((group) => group.count > 0)?.name || 'Personagens'
  }
})

watch(activeSectionKey, () => {
  visibleAssetLimit.value = 40
})

const showMoreAssets = () => {
  visibleAssetLimit.value += 40
}
</script>

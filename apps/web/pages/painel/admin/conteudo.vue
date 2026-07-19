<template>
  <ManagementShell>
    <div v-if="hasPermission(permissions.adminDashboardView)" class="grid gap-5">
      <header class="border-b border-white/10 pb-5">
        <p class="bm-kicker">Painel administrativo</p>
        <h1 class="mt-[6px] font-display text-4xl font-black uppercase text-white">Gerenciamento central</h1>
        <p class="mt-3 max-w-4xl text-sm font-semibold leading-7 text-white/68">
          Noticias, Wiki, paginas, equipamentos e configuracoes persistidos na API. Toda criacao, edicao e exclusao administrativa gera uma entrada de auditoria.
        </p>
      </header>

      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article v-for="card in cards" :key="card.label" class="bm-panel rounded-md p-4"><p class="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">{{ card.label }}</p><p class="mt-2 font-display text-3xl font-black text-white">{{ card.value }}</p><p class="mt-1 text-xs font-bold text-white/48">{{ card.description }}</p></article>
      </section>

      <nav class="flex flex-wrap gap-2 rounded-md border border-white/10 bg-black/20 p-2" aria-label="Modulos do CMS">
        <button v-for="tab in tabs" :key="tab.key" class="flex items-center gap-2 rounded-md px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition" :class="activeTab === tab.key ? 'bg-white/16 text-white' : 'text-white/48 hover:bg-white/8 hover:text-white'" type="button" @click="selectTab(tab.key)"><component :is="tab.icon" :size="15" /> {{ tab.label }}</button>
      </nav>

      <section class="bm-panel rounded-md p-5">
        <ContentManager v-if="activeTab === 'conteudo'" />
        <EquipmentManager v-else-if="activeTab === 'equipamentos'" />
        <SettingsManager v-else-if="activeTab === 'configuracoes'" />
        <div v-else class="grid gap-4"><div><p class="bm-kicker">Auditoria</p><h2 class="mt-1 font-display text-2xl font-black uppercase text-white">Historico administrativo</h2><p class="mt-2 text-sm font-semibold text-white/58">Consulte autor, acao, alvo, severidade e metadados de cada alteracao.</p></div><NuxtLink class="bm-admin-primary w-fit" to="/painel/admin/auditoria"><ScrollText :size="16" /> Abrir auditoria completa</NuxtLink></div>
      </section>
    </div>

    <div v-else class="bm-panel rounded-md p-6"><p class="bm-kicker">Administracao</p><h1 class="mt-2 font-display text-3xl font-black uppercase text-white">Acesso restrito</h1></div>
  </ManagementShell>
</template>

<script setup lang="ts">
import { BookOpen, Database, ScrollText, Settings } from 'lucide-vue-next'
import { permissions } from '~/data/security'

useSeoMeta({ title: 'Gerenciamento central' })
const route = useRoute(); const router = useRouter(); const { hasPermission, loadSession } = useAuth(); const api = useAdminContentApi()
const summary = ref<{ totals: { entries: number; assets: number; equipment: number; settings: number; pendingEntries: number } } | null>(null)
const tabs = [{ key: 'conteudo', label: 'Conteudo do site', icon: BookOpen }, { key: 'equipamentos', label: 'Equipamentos', icon: Database }, { key: 'configuracoes', label: 'Configuracoes', icon: Settings }, { key: 'auditoria', label: 'Auditoria', icon: ScrollText }]
const requestedTab = computed(() => String(route.query.modulo || 'conteudo'))
const activeTab = ref(tabs.some((tab) => tab.key === requestedTab.value) ? requestedTab.value : 'conteudo')
watch(requestedTab, (value) => { activeTab.value = tabs.some((tab) => tab.key === value) ? value : 'conteudo' })
const selectTab = (key: string) => { activeTab.value = key; void router.replace({ query: { ...route.query, modulo: key } }) }
const cards = computed(() => [{ label: 'Conteudos', value: summary.value?.totals.entries ?? 0, description: 'Noticias, Wiki e paginas' }, { label: 'Equipamentos', value: summary.value?.totals.equipment ?? 0, description: 'Itens administraveis' }, { label: 'Configuracoes', value: summary.value?.totals.settings ?? 0, description: 'Site e servidor' }, { label: 'Em revisao', value: summary.value?.totals.pendingEntries ?? 0, description: 'Aguardando publicacao' }])
onMounted(async () => { loadSession(); try { summary.value = await api.summary() as typeof summary.value } catch {} })
</script>

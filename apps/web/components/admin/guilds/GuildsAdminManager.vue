<template>
  <div class="grid gap-5">
    <header class="flex flex-col gap-4 border-b border-white/10 pb-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p class="bm-kicker">Guildas</p>
        <h1 class="mt-2 font-display text-4xl font-black uppercase">Guildas Admin</h1>
        <p class="mt-2 text-sm font-semibold text-white/60">Diretório, níveis, regras de XP e leitura de tesouraria/cofre em uma única área. Nenhuma movimentação real de recursos ocorre aqui.</p>
      </div>
      <button v-if="canModerate" class="bm-admin-primary" type="button" @click="openCreate">Nova guilda</button>
    </header>

    <nav class="flex gap-2 overflow-x-auto border-b border-white/10 pb-3">
      <button v-for="tab in visibleTabs" :key="tab.key" class="store-tab" :class="{ active: activeTab === tab.key }" type="button" @click="selectTab(tab.key)">
        <component :is="tab.icon" class="size-4" />{{ tab.label }}
        <span v-if="tab.preview" class="preview-pill">preview</span>
      </button>
    </nav>

    <p v-if="notice" class="border px-4 py-3 text-sm font-bold" :class="noticeError ? 'border-red-400/30 bg-red-500/10 text-red-100' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'">{{ notice }}</p>

    <template v-if="activeTab === 'guilds'">
      <section class="bm-panel grid gap-3 rounded-md p-4 md:grid-cols-[1fr_180px_180px]">
        <input v-model="guildQuery.search" class="field" placeholder="Buscar por nome, tag ou slug" @input="debouncedGuilds">
        <select v-model="guildQuery.status" class="field" @change="loadGuilds"><option value="">Todos os status</option><option v-for="status in guildStatuses" :key="status">{{ status }}</option></select>
        <select v-model="guildQuery.source" class="field" @change="loadGuilds"><option value="">Toda origem</option><option v-for="source in guildSources" :key="source">{{ source }}</option></select>
      </section>
      <section class="bm-panel overflow-hidden rounded-md">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[820px] text-left text-xs">
            <thead><tr><th class="p-3">Guilda</th><th>Status</th><th>Origem/Sync</th><th>Membros</th><th>Nível</th><th class="pr-3 text-right">Ações</th></tr></thead>
            <tbody>
              <tr v-for="guild in guilds" :key="guild.id" class="border-t border-white/10">
                <td class="p-3"><strong>{{ guild.name }}</strong> <span class="text-white/40">[{{ guild.tag }}]</span><p class="text-[10px] text-white/35">{{ guild.slug }}</p></td>
                <td><span class="status-pill">{{ guild.status }}</span></td>
                <td><span class="status-pill">{{ guild.source }} / {{ guild.syncStatus }}</span></td>
                <td>{{ guild._count?.members ?? 0 }}</td>
                <td>{{ guild.guildLevel }}</td>
                <td class="pr-3">
                  <div class="flex justify-end gap-1">
                    <button class="bm-admin-action" @click="openDetail(guild)">Detalhes</button>
                    <button v-if="canModerate && guild.status === 'ACTIVE'" class="bm-admin-action" @click="guildAction(guild, 'SUSPEND')">Suspender</button>
                    <button v-if="canModerate && guild.status !== 'ACTIVE'" class="bm-admin-action" @click="guildAction(guild, 'RESTORE')">Restaurar</button>
                    <button v-if="canModerate && guild.status !== 'DISBANDED'" class="bm-admin-danger" @click="guildAction(guild, 'DISBAND')">Dissolver</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <AdminEmptyState v-if="!guilds.length" title="Nenhuma guilda encontrada" description="Crie a primeira guilda administrativamente." />
        <div class="flex items-center justify-between p-4 text-xs text-white/45"><span>{{ guildTotal }} guildas</span><div class="flex gap-2"><button class="bm-admin-action" :disabled="guildPage <= 1" @click="guildPage--; loadGuilds()">Anterior</button><span class="px-2 py-2">{{ guildPage }} / {{ guildPages }}</span><button class="bm-admin-action" :disabled="guildPage >= guildPages" @click="guildPage++; loadGuilds()">Próxima</button></div></div>
      </section>
    </template>

    <template v-else-if="activeTab === 'levels'">
      <section v-if="canLevels" class="bm-panel grid gap-3 rounded-md p-4 md:grid-cols-[100px_140px_1fr_auto_auto]">
        <input v-model.number="levelForm.level" class="field" min="1" placeholder="Nível" type="number">
        <input v-model.number="levelForm.xpRequired" class="field" min="0" placeholder="XP necessário" type="number">
        <input v-model="levelForm.title" class="field" placeholder="Título do nível">
        <label class="check"><input v-model="levelForm.active" type="checkbox"> Ativo</label>
        <button class="bm-admin-primary" @click="saveLevel">{{ levelForm.id ? 'Atualizar' : 'Criar' }}</button>
      </section>
      <p class="text-xs text-white/40">Números placeholder, sem balanceamento definitivo nesta etapa.</p>
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <article v-for="level in levels" :key="level.id" class="bm-panel rounded-md p-4">
          <div class="flex justify-between"><strong class="font-display text-xl">Nível {{ level.level }}</strong><span class="status-pill">{{ level.active ? 'ATIVO' : 'INATIVO' }}</span></div>
          <p class="mt-1 text-xs text-white/45">{{ level.title }} · {{ level.xpRequired }} XP</p>
          <button v-if="canLevels" class="bm-admin-action mt-3" @click="editLevel(level)">Editar</button>
        </article>
      </section>
    </template>

    <template v-else-if="activeTab === 'xp-rules'">
      <p class="rounded border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-100">Nenhuma regra é executada automaticamente. Depositar recursos nunca gera Guild XP -- apenas uma futura conversão irreversível e auditada poderia.</p>
      <section v-if="canXpRules" class="bm-panel grid gap-3 rounded-md p-4 lg:grid-cols-[140px_140px_160px_120px_auto_auto]">
        <input v-model="xpRuleForm.resourceType" class="field" placeholder="Tipo (CURRENCY, JEWEL...)">
        <input v-model="xpRuleForm.resourceKey" class="field" placeholder="Chave (ZEN, JEWEL_BLESS...)">
        <input v-model.number="xpRuleForm.amountRequired" class="field" min="1" placeholder="Quantidade" type="number">
        <input v-model.number="xpRuleForm.guildXpGranted" class="field" min="0" placeholder="Guild XP" type="number">
        <label class="check"><input v-model="xpRuleForm.active" type="checkbox"> Ativa</label>
        <button class="bm-admin-primary" @click="saveXpRule">{{ xpRuleForm.id ? 'Atualizar' : 'Criar' }}</button>
      </section>
      <section class="bm-panel overflow-hidden rounded-md">
        <table class="w-full min-w-[720px] text-left text-xs"><thead><tr><th class="p-3">Recurso</th><th>Quantidade</th><th>Guild XP</th><th>Status</th><th v-if="canXpRules" class="pr-3 text-right">Ações</th></tr></thead>
          <tbody><tr v-for="rule in xpRules" :key="rule.id" class="border-t border-white/10"><td class="p-3">{{ rule.resourceType }} · {{ rule.resourceKey }}</td><td>{{ rule.amountRequired }}</td><td>{{ rule.guildXpGranted }}</td><td><span class="status-pill">{{ rule.active ? 'ATIVA' : 'INATIVA' }}</span></td><td v-if="canXpRules" class="pr-3 text-right"><button class="bm-admin-action" @click="editXpRule(rule)">Editar</button> <button class="bm-admin-danger" @click="removeXpRule(rule)">Excluir</button></td></tr></tbody>
        </table>
        <AdminEmptyState v-if="!xpRules.length" title="Nenhuma regra cadastrada" description="Regras de conversão de recurso em Guild XP aparecerão aqui." />
      </section>
    </template>

    <template v-else-if="activeTab === 'members' || activeTab === 'treasury' || activeTab === 'vault'">
      <section class="bm-panel grid gap-3 rounded-md p-4">
        <label class="label">Selecionar guilda<select v-model="selectedGuildId" class="field" @change="loadSelectedGuildDetail"><option value="">Selecione...</option><option v-for="guild in guilds" :key="guild.id" :value="guild.id">{{ guild.name }} [{{ guild.tag }}]</option></select></label>
      </section>

      <section v-if="!guildDetail" class="bm-panel rounded-md p-6 text-center text-xs text-white/40">Selecione uma guilda na lista acima para visualizar {{ activeTab === 'members' ? 'os membros' : activeTab === 'treasury' ? 'a tesouraria' : 'o cofre' }}.</section>

      <section v-else-if="activeTab === 'members'" class="bm-panel overflow-hidden rounded-md">
        <table class="w-full min-w-[640px] text-left text-xs"><thead><tr><th class="p-3">Personagem</th><th>Conta</th><th>Papel</th><th>XP</th><th>Contribuição</th></tr></thead>
          <tbody><tr v-for="member in guildDetail.members" :key="member.id" class="border-t border-white/10"><td class="p-3">{{ member.character?.name }}</td><td>@{{ member.account?.username }}</td><td><span class="status-pill">{{ member.roleKey }}</span></td><td>{{ member.memberXp }}</td><td>{{ member.contributionScore }}</td></tr></tbody>
        </table>
        <AdminEmptyState v-if="!guildDetail.members?.length" title="Sem membros" description="Esta guilda ainda não possui membros ativos." />
      </section>

      <section v-else-if="activeTab === 'treasury'" class="bm-panel overflow-hidden rounded-md">
        <p class="p-4 text-xs text-white/40">Dados reais e auditáveis. Nenhum endpoint escreve nestes saldos nesta etapa.</p>
        <table class="w-full min-w-[520px] text-left text-xs"><thead><tr><th class="p-3">Recurso</th><th>Disponível</th><th>Reservado</th></tr></thead>
          <tbody><tr v-for="balance in guildDetail.treasury?.balances || []" :key="balance.id" class="border-t border-white/10"><td class="p-3">{{ balance.resourceKey }}</td><td>{{ balance.availableAmount }}</td><td>{{ balance.reservedAmount }}</td></tr></tbody>
        </table>
      </section>

      <section v-else class="bm-panel rounded-md p-4">
        <p class="text-xs text-white/40">Cofre real e auditável.</p>
        <AdminEmptyState v-if="!guildDetail.vault?.items?.length" title="Cofre vazio" description="Nenhum item foi registrado no cofre desta guilda." />
      </section>
    </template>

    <template v-else-if="activeTab === 'reports'">
      <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article v-for="metric in reportMetrics" :key="metric.label" class="bm-panel rounded-md p-4"><p class="metric-label">{{ metric.label }}</p><strong class="metric-value">{{ metric.value }}</strong></article>
      </section>
      <p class="text-xs text-white/40">Relatório inicial de leitura. Analytics mais profundas ficam para uma próxima etapa.</p>
    </template>

    <template v-else-if="activeTab === 'audit'">
      <section v-if="canAudit">
        <div v-if="auditEvents.length" class="bm-panel overflow-hidden rounded-md">
          <div v-for="event in auditEvents" :key="event.id" class="border-t border-white/10 p-3 text-xs first:border-t-0">
            <div class="flex justify-between gap-3"><strong>{{ event.action || event.eventType }}</strong><time class="text-white/40">{{ formatDate(event.createdAt || event.occurredAt) }}</time></div>
            <p class="mt-1 text-white/55">{{ event.reason || event.description }}</p>
          </div>
        </div>
        <AdminEmptyState v-else title="Sem eventos" description="Ações administrativas e eventos operacionais do módulo de guildas aparecerão aqui." />
      </section>
      <section v-else class="bm-panel rounded-md p-6 text-center text-xs text-white/40">Requer permissão de auditoria administrativa geral.</section>
    </template>

    <!-- Preview-only tabs -- no write action rendered, matches the rest of the module's Tier B/C honesty -->
    <template v-else-if="activeTab === 'roles'">
      <section class="bm-panel rounded-md p-5"><p class="bm-kicker">Em breve</p><h2 class="mt-2 font-display text-2xl">Papéis personalizados</h2><p class="mt-2 text-xs text-white/48">Um sistema de papéis e permissões por guilda (além de LEADER/OFFICER/TREASURER/MEMBER/RECRUIT) está documentado para uma etapa futura.</p></section>
    </template>
    <template v-else-if="activeTab === 'requests' || activeTab === 'projects'">
      <section class="bm-panel rounded-md p-5"><p class="bm-kicker">Em breve</p><h2 class="mt-2 font-display text-2xl">{{ activeTab === 'requests' ? 'Solicitações entre guildas' : 'Projetos entre guildas' }}</h2><p class="mt-2 text-xs text-white/48">A leitura cruzada entre guildas ainda não foi construída nesta etapa. {{ activeTab === 'requests' ? 'Solicitações' : 'Projetos' }} de cada guilda já podem ser vistos na própria página pública/de membro da guilda.</p></section>
    </template>
    <template v-else-if="activeTab === 'guides' || activeTab === 'events' || activeTab === 'alliances'">
      <section class="bm-panel rounded-md p-5"><p class="bm-kicker">Em breve</p><h2 class="mt-2 font-display text-2xl">{{ activeTab === 'guides' ? 'Guias' : activeTab === 'events' ? 'Eventos' : 'Alianças' }}</h2><p class="mt-2 text-xs text-white/48">Este módulo ainda não possui backend nesta etapa.</p></section>
    </template>

    <Teleport to="body">
      <div v-if="createOpen" class="fixed inset-0 z-[120] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
        <section class="mx-auto max-w-2xl border border-white/15 bg-zinc-950 p-5">
          <header class="flex justify-between border-b border-white/10 pb-4"><h2 class="font-display text-2xl">Nova guilda</h2><button class="icon-button" @click="createOpen=false"><X class="size-5" /></button></header>
          <form class="mt-5 grid gap-4 md:grid-cols-2" @submit.prevent="submitCreate">
            <label class="label">Nome<input v-model="createForm.name" class="field" required></label>
            <label class="label">Tag<input v-model="createForm.tag" class="field" maxlength="10" required></label>
            <label class="label md:col-span-2">Descrição<textarea v-model="createForm.description" class="field min-h-20" /></label>
            <label class="label">Recrutamento<select v-model="createForm.recruitment" class="field"><option value="OPEN">Aberto</option><option value="APPROVAL_REQUIRED">Requer aprovação</option><option value="INVITE_ONLY">Somente convite</option><option value="CLOSED">Fechado</option></select></label>
            <div class="flex items-end gap-2 md:col-span-2"><button class="bm-admin-primary" type="submit">Criar guilda</button><button class="bm-admin-action" type="button" @click="createOpen=false">Cancelar</button></div>
          </form>
        </section>
      </div>

      <div v-if="detailOpen && detail" class="fixed inset-0 z-[120] overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
        <section class="mx-auto max-w-3xl border border-white/15 bg-zinc-950 p-5">
          <header class="flex justify-between border-b border-white/10 pb-4"><h2 class="font-display text-2xl">{{ detail.name }} [{{ detail.tag }}]</h2><button class="icon-button" @click="detailOpen=false"><X class="size-5" /></button></header>
          <div class="mt-4 grid gap-2 text-xs text-white/60">
            <p>Slug: {{ detail.slug }} · Status: {{ detail.status }} · Origem: {{ detail.source }} / {{ detail.syncStatus }}</p>
            <p>Fundador: {{ detail.foundedByAccountId || '— (sem fundador vinculado)' }}</p>
            <p>Membros ativos: {{ detail._count?.requests ?? 0 }} solicitações · {{ detail._count?.projects ?? 0 }} projetos · {{ detail._count?.joinRequests ?? 0 }} pedidos de entrada</p>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  Award, ChartColumn, Coins, FileSearch, FileText, Handshake, LayoutDashboard,
  Package, Shield, ShieldCheck, TrendingUp, Users, X
} from 'lucide-vue-next'
import { permissions } from '~/data/security'

const api = useGuildsApi()
const { hasPermission } = useAuth()

const canModerate = computed(() => hasPermission(permissions.adminGuildsModerate))
const canLevels = computed(() => hasPermission(permissions.adminGuildsLevelsManage))
const canXpRules = computed(() => hasPermission(permissions.adminGuildsXpRulesManage))
const canAudit = computed(() => hasPermission(permissions.adminAuditView))

const tabs = [
  { key: 'guilds', label: 'Guildas', icon: Shield },
  { key: 'levels', label: 'Níveis', icon: TrendingUp },
  { key: 'xp-rules', label: 'Regras de XP', icon: Award },
  { key: 'members', label: 'Membros', icon: Users },
  { key: 'roles', label: 'Papéis', icon: ShieldCheck, preview: true },
  { key: 'treasury', label: 'Tesouraria', icon: Coins },
  { key: 'vault', label: 'Cofre', icon: Package },
  { key: 'requests', label: 'Solicitações', icon: FileText, preview: true },
  { key: 'projects', label: 'Projetos', icon: ChartColumn, preview: true },
  { key: 'reports', label: 'Relatórios', icon: LayoutDashboard },
  { key: 'guides', label: 'Guias', icon: FileText, preview: true },
  { key: 'events', label: 'Eventos', icon: FileText, preview: true },
  { key: 'alliances', label: 'Alianças', icon: Handshake, preview: true },
  { key: 'audit', label: 'Auditoria', icon: FileSearch }
] as const
const visibleTabs = tabs

const route = useRoute()
const router = useRouter()
const activeTab = ref(String(route.query.tab || 'guilds'))
const notice = ref(''), noticeError = ref(false)
const setNotice = (message: string, error = false) => { notice.value = message; noticeError.value = error }

const guilds = ref<any[]>([]), guildTotal = ref(0), guildPage = ref(1), guildPages = ref(1)
const guildQuery = reactive({ search: '', status: '', source: '' })
const guildStatuses = ['ACTIVE', 'SUSPENDED', 'DISBANDED']
const guildSources = ['PORTAL', 'GAME', 'IMPORTED']
let debounce: ReturnType<typeof setTimeout>
const loadGuilds = async () => {
  const result = await api.adminList({ page: guildPage.value, pageSize: 20, ...guildQuery })
  guilds.value = result.data; guildTotal.value = result.total; guildPages.value = result.totalPages
}
const debouncedGuilds = () => { clearTimeout(debounce); debounce = setTimeout(loadGuilds, 300) }

const createOpen = ref(false)
const createForm = reactive({ name: '', tag: '', description: '', recruitment: 'APPROVAL_REQUIRED' })
const openCreate = () => { Object.assign(createForm, { name: '', tag: '', description: '', recruitment: 'APPROVAL_REQUIRED' }); createOpen.value = true }
const submitCreate = async () => {
  try {
    await api.adminCreate(createForm)
    createOpen.value = false
    setNotice('Guilda criada e auditada.')
    await loadGuilds()
  } catch (error: any) { setNotice(error?.data?.message || 'Falha ao criar guilda.', true) }
}

const detailOpen = ref(false)
const detail = ref<any>(null)
const openDetail = async (guild: any) => { detail.value = await api.adminDetail(guild.id); detailOpen.value = true }

const guildAction = async (guild: any, action: string) => {
  const reason = prompt('Informe a justificativa:') || ''
  if (!reason) return
  try {
    await api.adminAction(guild.id, { action, reason })
    setNotice('Ação aplicada e auditada.')
    await loadGuilds()
  } catch (error: any) { setNotice(error?.data?.message || 'Falha ao aplicar ação.', true) }
}

const levels = ref<any[]>([])
const levelForm = reactive({ id: '', level: 1, xpRequired: 0, title: '', active: true })
const loadLevels = async () => { levels.value = await api.adminLevelConfig() }
const editLevel = (level: any) => Object.assign(levelForm, { id: level.id, level: level.level, xpRequired: level.xpRequired, title: level.title, active: level.active })
const saveLevel = async () => {
  try {
    await api.saveLevelConfig(levelForm.id || null, { level: levelForm.level, xpRequired: levelForm.xpRequired, title: levelForm.title, active: levelForm.active })
    Object.assign(levelForm, { id: '', level: 1, xpRequired: 0, title: '', active: true })
    setNotice('Nível salvo.')
    await loadLevels()
  } catch (error: any) { setNotice(error?.data?.message || 'Falha ao salvar nível.', true) }
}

const xpRules = ref<any[]>([])
const xpRuleForm = reactive({ id: '', resourceType: '', resourceKey: '', amountRequired: 1, guildXpGranted: 0, active: false })
const loadXpRules = async () => { xpRules.value = await api.adminXpRules() }
const editXpRule = (rule: any) => Object.assign(xpRuleForm, { id: rule.id, resourceType: rule.resourceType, resourceKey: rule.resourceKey, amountRequired: Number(rule.amountRequired), guildXpGranted: rule.guildXpGranted, active: rule.active })
const saveXpRule = async () => {
  try {
    await api.saveXpRule(xpRuleForm.id || null, { ...xpRuleForm })
    Object.assign(xpRuleForm, { id: '', resourceType: '', resourceKey: '', amountRequired: 1, guildXpGranted: 0, active: false })
    setNotice('Regra de XP salva. Nenhuma execução automática ocorre.')
    await loadXpRules()
  } catch (error: any) { setNotice(error?.data?.message || 'Falha ao salvar regra.', true) }
}
const removeXpRule = async (rule: any) => {
  if (!confirm('Remover esta regra de conversão?')) return
  await api.deleteXpRule(rule.id)
  await loadXpRules()
}

const selectedGuildId = ref('')
const guildDetail = ref<any>(null)
const loadSelectedGuildDetail = async () => { guildDetail.value = selectedGuildId.value ? await api.adminDetail(selectedGuildId.value) : null }

const reports = ref<Record<string, any>>({})
const loadReports = async () => { reports.value = await api.adminReports() }
const reportMetrics = computed(() => Object.entries(reports.value)
  .filter(([key]) => key !== 'preview')
  .map(([key, value]) => ({ label: key, value })))

const auditEvents = ref<any[]>([])
const loadAudit = async () => {
  if (!canAudit.value) return
  const config = useRuntimeConfig()
  const { accessToken } = useAuth()
  const result = await $fetch<{ data: any[] }>(`${config.public.apiBase}/admin/observability/audit`, {
    query: { module: 'guilds', pageSize: 50 },
    headers: accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {}
  }).catch(() => ({ data: [] }))
  auditEvents.value = result.data || []
}

const loadTab = async () => {
  try {
    if (activeTab.value === 'guilds') await loadGuilds()
    else if (activeTab.value === 'levels') await loadLevels()
    else if (activeTab.value === 'xp-rules') await loadXpRules()
    else if (['members', 'treasury', 'vault'].includes(activeTab.value) && !guilds.value.length) await loadGuilds()
    else if (activeTab.value === 'reports') await loadReports()
    else if (activeTab.value === 'audit') await loadAudit()
  } catch { setNotice('Não foi possível carregar esta área de guildas.', true) }
}
const selectTab = async (key: string) => {
  activeTab.value = key
  await router.replace({ query: { ...route.query, tab: key } })
  await loadTab()
}
const formatDate = (value: string) => value ? new Date(value).toLocaleString('pt-BR') : '—'

onMounted(loadTab)
</script>

<style scoped>
.store-tab { display:flex; align-items:center; gap:.45rem; min-height:2.4rem; flex:none; border:1px solid transparent; border-radius:.375rem; padding:.55rem .8rem; font-size:.7rem; font-weight:900; color:rgba(255,255,255,.48); }
.store-tab:hover,.store-tab.active { border-color:rgba(255,255,255,.13); background:rgba(255,255,255,.08); color:white; }
.preview-pill { border-radius:.2rem; border:1px solid rgba(255,255,255,.15); padding:0 .35rem; font-size:.5rem; text-transform:uppercase; }
.field { min-height:2.55rem; width:100%; border:1px solid rgba(255,255,255,.12); border-radius:.375rem; background:rgba(255,255,255,.055); padding:.62rem .75rem; color:white; font-size:.75rem; font-weight:700; outline:none; }
.label { display:grid; gap:.35rem; color:rgba(255,255,255,.48); font-size:.62rem; font-weight:900; text-transform:uppercase; letter-spacing:.12em; }
.check { display:flex; align-items:center; gap:.5rem; font-size:.72rem; font-weight:800; color:rgba(255,255,255,.62); }
.status-pill { display:inline-flex; border:1px solid rgba(255,255,255,.1); border-radius:.2rem; background:rgba(255,255,255,.06); padding:.25rem .45rem; font-size:.58rem; font-weight:900; letter-spacing:.1em; }
.metric-label { font-size:.6rem; font-weight:900; text-transform:uppercase; letter-spacing:.16em; color:rgba(255,255,255,.42); }
.metric-value { display:block; margin-top:.5rem; font-family:var(--font-display); font-size:1.7rem; }
thead { color:rgba(255,255,255,.38); font-size:.6rem; text-transform:uppercase; letter-spacing:.12em; }
</style>

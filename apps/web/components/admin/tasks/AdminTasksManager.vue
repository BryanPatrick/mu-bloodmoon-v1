<template>
  <section class="space-y-4">
    <header class="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="bm-kicker">Operação administrativa</p>
        <h1 class="font-display text-2xl font-black">Central de tarefas</h1>
        <p class="mt-1 max-w-3xl text-xs text-white/55">
          Responsáveis, revisão, evidências e comprovação de trabalho de todos os módulos.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-if="canCreate"
          icon="i-lucide-plus"
          color="primary"
          @click="openCreate"
        >
          Nova tarefa
        </UButton>
        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" :loading="loading" @click="loadAll">
          Atualizar
        </UButton>
      </div>
    </header>

    <nav class="flex gap-1 overflow-x-auto border-b border-white/10" aria-label="Visões da central">
      <button
        v-for="item in tabs"
        :key="item.key"
        class="shrink-0 border-b-2 px-3 py-2 text-xs font-black transition"
        :class="tab === item.key ? 'border-ember text-white' : 'border-transparent text-white/45 hover:text-white'"
        @click="selectTab(item.key)"
      >
        {{ item.label }}
      </button>
    </nav>

    <template v-if="tab === 'dashboard'">
      <section>
        <p class="bm-kicker mb-2">Meu trabalho</p>
        <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <TaskMetric label="Minhas tarefas" :value="personal.mine" icon="ListTodo" />
          <TaskMetric label="Atrasadas" :value="personal.overdue" icon="ClockAlert" tone="danger" />
          <TaskMetric label="Urgentes" :value="personal.urgent" icon="Siren" tone="warning" />
          <TaskMetric label="Em revisão" :value="personal.review" icon="ScanSearch" />
          <TaskMetric label="Concluídas hoje" :value="personal.completedToday" icon="CircleCheckBig" tone="success" />
          <TaskMetric label="Erros atribuídos" :value="personal.errors" icon="TriangleAlert" tone="danger" />
        </div>
      </section>

      <section v-if="canReports" class="border-t border-white/10 pt-4">
        <div class="mb-2 flex items-center justify-between gap-3">
          <p class="bm-kicker">Visão de gestão</p>
          <p class="text-[10px] text-white/38">Volume não representa desempenho isoladamente.</p>
        </div>
        <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <TaskMetric label="Concluídas em 30 dias" :value="management.completedLast30Days" icon="BadgeCheck" />
          <TaskMetric label="Atrasadas" :value="management.overdue" icon="ClockAlert" tone="danger" />
          <TaskMetric label="Sem responsável" :value="management.unassigned" icon="UserRoundX" tone="warning" />
          <TaskMetric label="Reaberturas" :value="management.reopened" icon="RotateCcw" />
          <TaskMetric label="Tempo médio" :value="`${management.averageCompletionHours || 0}h`" icon="Timer" />
        </div>
        <div class="mt-3 grid gap-3 lg:grid-cols-2">
          <div class="bm-panel rounded-md p-3">
            <h2 class="text-xs font-black uppercase tracking-wider text-white/70">Pendências por colaborador</h2>
            <div class="mt-3 grid gap-2">
              <div v-for="row in management.byAssignee || []" :key="row.assignedTo || 'none'" class="flex items-center justify-between border-b border-white/8 pb-2 text-xs">
                <span>{{ row.account?.name || 'Sem responsável' }}</span>
                <strong>{{ row._count?._all || 0 }}</strong>
              </div>
              <p v-if="!management.byAssignee?.length" class="text-xs text-white/40">Sem dados.</p>
            </div>
          </div>
          <div class="bm-panel rounded-md p-3">
            <h2 class="text-xs font-black uppercase tracking-wider text-white/70">Volume por módulo</h2>
            <div class="mt-3 grid gap-2">
              <div v-for="row in management.byModule || []" :key="row.module" class="flex items-center justify-between border-b border-white/8 pb-2 text-xs">
                <span class="capitalize">{{ row.module }}</span>
                <strong>{{ row._count?._all || 0 }}</strong>
              </div>
              <p v-if="!management.byModule?.length" class="text-xs text-white/40">Sem dados.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="bm-panel rounded-md p-3">
        <h2 class="text-xs font-black uppercase tracking-wider text-white/70">Minha atividade recente</h2>
        <div class="mt-3 grid gap-2">
          <button
            v-for="item in personal.recent || []"
            :key="item.id"
            class="flex items-start justify-between gap-3 border-b border-white/8 pb-2 text-left text-xs"
            @click="openTask(item.task.id)"
          >
            <span><strong>{{ item.task.title }}</strong><small class="mt-1 block text-white/42">{{ item.description }}</small></span>
            <time class="shrink-0 text-[10px] text-white/35">{{ formatDate(item.createdAt) }}</time>
          </button>
          <p v-if="!personal.recent?.length" class="text-xs text-white/40">Nenhuma atividade recente.</p>
        </div>
      </section>
    </template>

    <template v-else-if="tab === 'tasks'">
      <div class="bm-panel grid gap-2 rounded-md p-3 md:grid-cols-2 xl:grid-cols-7">
        <input v-model="filters.search" class="bm-admin-input xl:col-span-2" placeholder="Buscar tarefa">
        <select v-model="filters.module" class="bm-admin-input">
          <option value="">Todos os módulos</option>
          <option v-for="item in modules" :key="item" :value="item">{{ item }}</option>
        </select>
        <select v-model="filters.status" class="bm-admin-input">
          <option value="">Todos os status</option>
          <option v-for="item in statuses" :key="item" :value="item">{{ label(item) }}</option>
        </select>
        <select v-model="filters.priority" class="bm-admin-input">
          <option value="">Prioridade</option>
          <option v-for="item in priorities" :key="item" :value="item">{{ label(item) }}</option>
        </select>
        <select v-model="filters.complexity" class="bm-admin-input">
          <option value="">Complexidade</option>
          <option v-for="item in complexities" :key="item" :value="item">{{ label(item) }}</option>
        </select>
        <UButton color="neutral" variant="soft" @click="loadTasks(1)">Filtrar</UButton>
      </div>

      <div class="grid gap-2">
        <button
          v-for="task in tasks.data"
          :key="task.id"
          class="bm-panel grid gap-3 rounded-md p-3 text-left transition hover:border-ember/35 lg:grid-cols-[minmax(0,1fr)_150px_130px_130px]"
          @click="openTask(task.id)"
        >
          <span class="min-w-0">
            <span class="flex flex-wrap items-center gap-2">
              <strong class="truncate text-sm">{{ task.title }}</strong>
              <span class="bm-task-chip">{{ task.module }}</span>
              <span class="bm-task-chip">{{ label(task.complexity) }}</span>
            </span>
            <small class="mt-1 line-clamp-2 block text-white/45">{{ task.description }}</small>
          </span>
          <span class="text-xs"><small class="block text-white/35">Responsável</small>{{ task.assignee?.name || 'Não atribuído' }}</span>
          <span class="text-xs"><small class="block text-white/35">Prazo</small>{{ task.dueAt ? formatDate(task.dueAt) : 'Sem prazo' }}</span>
          <span class="flex items-center justify-between gap-2 lg:justify-end">
            <span class="bm-task-chip" :data-priority="task.priority">{{ label(task.priority) }}</span>
            <span class="bm-task-status">{{ label(task.status) }}</span>
          </span>
        </button>
        <AdminEmptyState v-if="!loading && !tasks.data.length" title="Nenhuma tarefa encontrada" description="Ajuste os filtros ou crie a primeira tarefa administrativa." />
      </div>
      <CommunityPagination
        :page="tasks.page"
        :total-pages="tasks.totalPages"
        :total="tasks.total"
        @change="loadTasks"
      />
    </template>

    <template v-else>
      <div v-if="canReports" class="grid gap-3 lg:grid-cols-2">
        <ReportGroup title="Por complexidade" :rows="reports.complexity" field="complexity" />
        <ReportGroup title="Por prioridade" :rows="reports.priority" field="priority" />
        <ReportGroup title="Por módulo" :rows="reports.module" field="module" />
        <ReportGroup title="Por status" :rows="reports.status" field="status" />
      </div>
      <AdminEmptyState v-else title="Relatórios restritos" description="É necessária a permissão de relatórios da central de tarefas." />
    </template>

    <div v-if="showCreate" class="bm-task-overlay" @click.self="showCreate = false">
      <form class="bm-task-dialog max-w-3xl" @submit.prevent="createTask">
        <header class="flex items-center justify-between border-b border-white/10 pb-3">
          <div><p class="bm-kicker">Nova demanda</p><h2 class="font-display text-xl font-black">Criar tarefa</h2></div>
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" square @click="showCreate = false" />
        </header>
        <div class="grid gap-3 pt-4 md:grid-cols-2">
          <label class="md:col-span-2">Título<input v-model="form.title" class="bm-admin-input mt-1" required></label>
          <label class="md:col-span-2">Descrição<textarea v-model="form.description" class="bm-admin-input mt-1 min-h-24" required /></label>
          <label>Módulo<select v-model="form.module" class="bm-admin-input mt-1"><option v-for="item in modules" :key="item">{{ item }}</option></select></label>
          <label>Tipo<input v-model="form.type" class="bm-admin-input mt-1" required></label>
          <label>Prioridade<select v-model="form.priority" class="bm-admin-input mt-1"><option v-for="item in priorities" :key="item" :value="item">{{ label(item) }}</option></select></label>
          <label>Complexidade<select v-model="form.complexity" class="bm-admin-input mt-1"><option v-for="item in complexities" :key="item" :value="item">{{ label(item) }}</option></select></label>
          <label v-if="canAssign">Responsável<select v-model="form.assignedTo" class="bm-admin-input mt-1"><option value="">Não atribuído</option><option v-for="item in administrators" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
          <label>Prazo<input v-model="form.dueAt" type="datetime-local" class="bm-admin-input mt-1"></label>
          <label>Estimativa em minutos<input v-model.number="form.estimatedMinutes" type="number" min="0" class="bm-admin-input mt-1"></label>
          <label class="flex items-center gap-2 pt-5"><input v-model="form.approvalRequired" type="checkbox"> Exige aprovação</label>
          <label>Entidade relacionada<input v-model="form.entityType" class="bm-admin-input mt-1" placeholder="Ex.: RoadmapItem"></label>
          <label>ID da entidade<input v-model="form.entityId" class="bm-admin-input mt-1"></label>
        </div>
        <footer class="mt-4 flex justify-end gap-2 border-t border-white/10 pt-3">
          <UButton color="neutral" variant="soft" @click="showCreate = false">Cancelar</UButton>
          <UButton type="submit" color="primary" :loading="saving">Criar tarefa</UButton>
        </footer>
      </form>
    </div>

    <div v-if="selected" class="bm-task-overlay" @click.self="closeTask">
      <article class="bm-task-dialog max-w-7xl">
        <header class="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
          <div>
            <div class="flex flex-wrap gap-2"><span class="bm-task-chip">{{ selected.module }}</span><span class="bm-task-status">{{ label(selected.status) }}</span></div>
            <h2 class="mt-2 font-display text-xl font-black">{{ selected.title }}</h2>
            <p class="mt-1 text-xs text-white/50">{{ selected.description }}</p>
          </div>
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" square @click="closeTask" />
        </header>

        <div class="grid gap-4 pt-4 xl:grid-cols-[280px_minmax(0,1fr)_minmax(300px,0.8fr)]">
          <aside class="space-y-3 border-r border-white/10 pr-4">
            <TaskFacts :task="selected" />
            <div v-if="canOperate || canAssign || canReview" class="grid gap-2 border-t border-white/10 pt-3">
              <select v-if="canAssign" v-model="actionForm.assignedTo" class="bm-admin-input">
                <option value="">Selecionar responsável</option>
                <option v-for="item in administrators" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select>
              <textarea v-model="actionForm.reason" class="bm-admin-input min-h-16" placeholder="Justificativa ou observação" />
              <input v-model.number="actionForm.actualMinutes" type="number" min="0" class="bm-admin-input" placeholder="Tempo realizado em minutos">
              <textarea v-model="actionForm.result" class="bm-admin-input min-h-16" placeholder="Resultado do trabalho" />
              <div class="grid grid-cols-2 gap-2">
                <UButton v-if="canAssign" size="sm" color="neutral" variant="soft" @click="runAction('ASSIGN')">Atribuir</UButton>
                <UButton v-if="canOperate" size="sm" color="neutral" variant="soft" @click="runAction('CLAIM')">Assumir</UButton>
                <UButton v-if="canOperate" size="sm" color="primary" variant="soft" @click="runAction('START')">Iniciar</UButton>
                <UButton v-if="canOperate" size="sm" color="neutral" variant="soft" @click="runAction('PAUSE')">Pausar</UButton>
                <UButton v-if="canOperate" size="sm" color="primary" variant="soft" @click="runAction('SUBMIT_REVIEW')">Revisão</UButton>
                <UButton v-if="canOperate" size="sm" color="success" variant="soft" @click="runAction('COMPLETE')">Concluir</UButton>
                <UButton v-if="canReview" size="sm" color="success" @click="runAction('APPROVE')">Aprovar</UButton>
                <UButton v-if="canReview" size="sm" color="warning" variant="soft" @click="runAction('REJECT')">Rejeitar</UButton>
                <UButton v-if="canOperate" size="sm" color="neutral" variant="soft" @click="runAction('REOPEN')">Reabrir</UButton>
                <UButton v-if="canOperate" size="sm" color="error" variant="soft" @click="runAction('CANCEL')">Cancelar</UButton>
              </div>
            </div>
          </aside>

          <main class="min-w-0 space-y-4">
            <section>
              <h3 class="bm-task-heading">Comprovação automática</h3>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <TaskMetric label="Ações" :value="selected.proof?.totals?.actions" icon="MousePointerClick" />
                <TaskMetric label="Logs" :value="selected.proof?.totals?.workLogs" icon="ScrollText" />
                <TaskMetric label="Entidades" :value="selected.proof?.totals?.entitiesAccessed" icon="Boxes" />
                <TaskMetric label="Alterações" :value="selected.proof?.totals?.changes" icon="FileDiff" />
                <TaskMetric label="Minutos" :value="selected.proof?.totals?.minutes" icon="Timer" />
              </div>
            </section>
            <section>
              <h3 class="bm-task-heading">Evidências</h3>
              <div class="grid gap-2 sm:grid-cols-2">
                <a v-for="item in selected.evidence" :key="item.id" :href="item.url || undefined" :target="item.url?.startsWith('http') ? '_blank' : undefined" class="border border-white/10 p-3 text-xs">
                  <strong>{{ item.title }}</strong>
                  <small class="mt-1 block text-ember">{{ label(item.type) }}</small>
                  <span class="mt-1 block text-white/45">{{ item.description }}</span>
                </a>
              </div>
              <form v-if="canOperate" class="mt-3 grid gap-2 sm:grid-cols-2" @submit.prevent="submitEvidence">
                <select v-model="evidenceForm.type" class="bm-admin-input"><option v-for="item in evidenceTypes" :key="item">{{ item }}</option></select>
                <input v-model="evidenceForm.title" class="bm-admin-input" placeholder="Título" required>
                <input v-model="evidenceForm.url" class="bm-admin-input" placeholder="URL ou link interno">
                <input v-model="evidenceForm.description" class="bm-admin-input" placeholder="Descrição">
                <UButton type="submit" size="sm" color="neutral" variant="soft">Adicionar evidência</UButton>
              </form>
            </section>
            <section>
              <h3 class="bm-task-heading">Histórico</h3>
              <div class="max-h-72 space-y-2 overflow-y-auto pr-1">
                <div v-for="item in selected.history" :key="item.id" class="border-l border-ember/40 pl-3 text-xs">
                  <strong>{{ label(item.action) }}</strong>
                  <span class="ml-2 text-white/35">{{ formatDate(item.createdAt) }}</span>
                  <p class="mt-1 text-white/48">{{ item.description }}</p>
                </div>
              </div>
            </section>
          </main>

          <aside class="space-y-4 border-l border-white/10 pl-4">
            <section>
              <h3 class="bm-task-heading">Discussão interna</h3>
              <div class="max-h-72 space-y-2 overflow-y-auto pr-1">
                <div v-for="item in selected.comments" :key="item.id" class="border-b border-white/8 pb-2 text-xs">
                  <div class="flex justify-between gap-2"><strong>{{ item.author.name }}</strong><time class="text-white/32">{{ formatDate(item.createdAt) }}</time></div>
                  <p class="mt-1 whitespace-pre-wrap text-white/55">{{ item.content }}</p>
                  <small v-if="item.editedAt" class="text-white/30">editado</small>
                </div>
              </div>
              <form v-if="canOperate" class="mt-3 flex gap-2" @submit.prevent="submitComment">
                <textarea v-model="comment" class="bm-admin-input min-h-16 flex-1" placeholder="Comentário interno" required />
                <UButton type="submit" icon="i-lucide-send" color="primary" square />
              </form>
            </section>
            <section>
              <h3 class="bm-task-heading">Registros relacionados</h3>
              <div class="space-y-2">
                <div v-for="item in selected.links" :key="item.id" class="flex items-center justify-between gap-2 border-b border-white/8 pb-2 text-xs">
                  <span><strong>{{ item.label || item.entityType }}</strong><small class="block text-white/35">{{ item.entityId }}</small></span>
                  <UButton v-if="canManage" icon="i-lucide-unlink" color="error" variant="ghost" size="xs" square @click="deleteLink(item.id)" />
                </div>
              </div>
              <form v-if="canManage" class="mt-3 grid gap-2" @submit.prevent="submitLink">
                <select v-model="linkForm.module" class="bm-admin-input"><option v-for="item in modules" :key="item">{{ item }}</option></select>
                <input v-model="linkForm.entityType" class="bm-admin-input" placeholder="Tipo da entidade" required>
                <input v-model="linkForm.entityId" class="bm-admin-input" placeholder="ID da entidade" required>
                <input v-model="linkForm.label" class="bm-admin-input" placeholder="Rótulo">
                <UButton type="submit" size="sm" color="neutral" variant="soft">Relacionar</UButton>
              </form>
            </section>
          </aside>
        </div>
      </article>
    </div>

    <p v-if="errorMessage" class="fixed bottom-4 right-4 z-[90] max-w-md border border-red-400/35 bg-red-950/95 p-3 text-xs text-red-100">
      {{ errorMessage }}
    </p>
  </section>
</template>

<script setup lang="ts">
import TaskMetric from './TaskMetric.vue'
import ReportGroup from './ReportGroup.vue'
import TaskFacts from './TaskFacts.vue'
import { permissions } from '~/data/security'

const api = useAdminTasksApi()
const route = useRoute()
const router = useRouter()
const { hasPermission } = useAuth()
const validTabs = ['dashboard', 'tasks', 'reports'] as const
type TaskTab = typeof validTabs[number]
const initialTab = validTabs.includes(String(route.query.tab) as TaskTab)
  ? String(route.query.tab) as TaskTab
  : 'dashboard'
const tab = ref<TaskTab>(initialTab)
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const showCreate = ref(false)
const selected = ref<Record<string, any> | null>(null)
const personal = ref<Record<string, any>>({})
const management = ref<Record<string, any>>({})
const reports = ref<Record<string, any>>({})
const administrators = ref<Record<string, any>[]>([])
const tasks = ref({ data: [] as Record<string, any>[], total: 0, page: 1, pageSize: 20, totalPages: 1 })

const canCreate = computed(() => hasPermission(permissions.adminTasksCreate))
const canAssign = computed(() => hasPermission(permissions.adminTasksAssign))
const canOperate = computed(() => hasPermission(permissions.adminTasksOperate))
const canReview = computed(() => hasPermission(permissions.adminTasksReview))
const canManage = computed(() => hasPermission(permissions.adminTasksManage))
const canReports = computed(() => hasPermission(permissions.adminTasksReportsView))

const tabs = computed(() => [
  { key: 'dashboard', label: 'Visão geral' },
  { key: 'tasks', label: 'Tarefas' },
  ...(canReports.value ? [{ key: 'reports', label: 'Relatórios' }] : [])
])
const selectTab = async (value: string) => {
  if (!validTabs.includes(value as TaskTab)) return
  tab.value = value as TaskTab
  await router.replace({ query: { ...route.query, tab: value } })
  await loadAll()
}

watch(
  () => route.query.tab,
  async (value) => {
    const next = String(value || 'dashboard')
    if (!validTabs.includes(next as TaskTab) || tab.value === next) return
    tab.value = next as TaskTab
    await loadAll()
  }
)
const modules = ['roadmap', 'store', 'marketplace', 'community', 'audit', 'errors', 'support']
const statuses = ['BACKLOG', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING', 'IN_REVIEW', 'COMPLETED', 'CANCELED', 'REOPENED']
const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL']
const complexities = ['SIMPLE', 'STANDARD', 'COMPLEX', 'INVESTIGATION', 'CRITICAL']
const evidenceTypes = ['IMAGE', 'FILE', 'INTERNAL_LINK', 'DESCRIPTION', 'LOG', 'ENTITY_CHANGE', 'BEFORE_AFTER']
const filters = reactive({ search: '', module: '', status: '', priority: '', complexity: '' })
const initialForm = () => ({
  title: '', description: '', module: 'roadmap', type: 'GENERAL', priority: 'NORMAL',
  complexity: 'STANDARD', assignedTo: '', dueAt: '', estimatedMinutes: null as number | null,
  approvalRequired: false, entityType: '', entityId: ''
})
const form = reactive(initialForm())
const actionForm = reactive({ assignedTo: '', reason: '', result: '', actualMinutes: null as number | null })
const evidenceForm = reactive({ type: 'DESCRIPTION', title: '', url: '', description: '' })
const linkForm = reactive({ module: 'roadmap', entityType: '', entityId: '', label: '' })
const comment = ref('')

const labels: Record<string, string> = {
  BACKLOG: 'Backlog', OPEN: 'Aberta', ASSIGNED: 'Atribuída', IN_PROGRESS: 'Em andamento',
  WAITING: 'Aguardando', IN_REVIEW: 'Em revisão', COMPLETED: 'Concluída', CANCELED: 'Cancelada',
  REOPENED: 'Reaberta', LOW: 'Baixa', NORMAL: 'Normal', HIGH: 'Alta', URGENT: 'Urgente',
  CRITICAL: 'Crítica', SIMPLE: 'Simples', STANDARD: 'Padrão', COMPLEX: 'Complexa',
  INVESTIGATION: 'Investigação', IMAGE: 'Imagem', FILE: 'Arquivo', INTERNAL_LINK: 'Link interno',
  DESCRIPTION: 'Descrição', LOG: 'Log', ENTITY_CHANGE: 'Entidade alterada', BEFORE_AFTER: 'Antes e depois',
  CREATE: 'Criação', EDIT: 'Edição', COMMENT: 'Comentário', EVIDENCE: 'Evidência',
  START: 'Início', PAUSE: 'Pausa', SUBMIT_REVIEW: 'Enviada para revisão', COMPLETE: 'Conclusão',
  APPROVE: 'Aprovação', REJECT: 'Rejeição', REOPEN: 'Reabertura', CANCEL: 'Cancelamento',
  ASSIGN: 'Atribuição', CLAIM: 'Tarefa assumida', TRANSFER: 'Transferência'
}
const label = (value: unknown) => labels[String(value)] || String(value || '').replaceAll('_', ' ')
const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
const showError = (error: any) => {
  errorMessage.value = error?.data?.message || error?.message || 'Não foi possível concluir a operação.'
  setTimeout(() => { errorMessage.value = '' }, 5000)
}

const loadTasks = async (page = 1) => {
  loading.value = true
  try { tasks.value = await api.list({ ...filters, page, pageSize: 20 }) }
  catch (error) { showError(error) }
  finally { loading.value = false }
}
const loadAll = async () => {
  loading.value = true
  try {
    const calls: Promise<any>[] = [api.personalDashboard()]
    if (canReports.value) calls.push(api.managementDashboard(), api.reports())
    if (canAssign.value) calls.push(api.administrators())
    const result = await Promise.all(calls)
    personal.value = result[0] || {}
    let index = 1
    if (canReports.value) {
      management.value = result[index++] || {}
      reports.value = result[index++] || {}
    }
    if (canAssign.value) administrators.value = result[index] || []
    await loadTasks(tasks.value.page)
  } catch (error) { showError(error) }
  finally { loading.value = false }
}
const openCreate = () => {
  Object.assign(form, initialForm())
  showCreate.value = true
}
const createTask = async () => {
  saving.value = true
  try {
    const created: any = await api.create({ ...form, assignedTo: form.assignedTo || null, dueAt: form.dueAt || null })
    showCreate.value = false
    await loadAll()
    await openTask(created.id)
  } catch (error) { showError(error) }
  finally { saving.value = false }
}
const openTask = async (id: string) => {
  try {
    selected.value = await api.details(id)
    actionForm.assignedTo = selected.value.assignedTo || ''
    actionForm.reason = ''
    actionForm.result = selected.value.result || ''
    actionForm.actualMinutes = selected.value.actualMinutes || null
  } catch (error) { showError(error) }
}
const closeTask = () => { selected.value = null }
const reloadSelected = async () => {
  if (selected.value) selected.value = await api.details(selected.value.id)
  await loadAll()
}
const runAction = async (action: string) => {
  if (!selected.value) return
  try {
    await api.action(selected.value.id, { action, ...actionForm, assignedTo: actionForm.assignedTo || null })
    await reloadSelected()
  } catch (error) { showError(error) }
}
const submitComment = async () => {
  if (!selected.value || !comment.value.trim()) return
  try { await api.addComment(selected.value.id, { content: comment.value }); comment.value = ''; await reloadSelected() }
  catch (error) { showError(error) }
}
const submitEvidence = async () => {
  if (!selected.value) return
  try {
    await api.addEvidence(selected.value.id, evidenceForm)
    Object.assign(evidenceForm, { type: 'DESCRIPTION', title: '', url: '', description: '' })
    await reloadSelected()
  } catch (error) { showError(error) }
}
const submitLink = async () => {
  if (!selected.value) return
  try {
    await api.addLink(selected.value.id, linkForm)
    Object.assign(linkForm, { module: 'roadmap', entityType: '', entityId: '', label: '' })
    await reloadSelected()
  } catch (error) { showError(error) }
}
const deleteLink = async (linkId: string) => {
  if (!selected.value) return
  try { await api.removeLink(selected.value.id, linkId); await reloadSelected() }
  catch (error) { showError(error) }
}

onMounted(loadAll)
</script>

<style scoped>
.bm-kicker { font-size: 10px; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; color: #f6a623; }
.bm-task-chip, .bm-task-status { display: inline-flex; align-items: center; min-height: 22px; border: 1px solid rgb(255 255 255 / .12); padding: 2px 7px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; color: rgb(255 255 255 / .65); }
.bm-task-chip[data-priority="URGENT"], .bm-task-chip[data-priority="CRITICAL"] { border-color: rgb(248 113 113 / .4); color: #fecaca; }
.bm-task-heading { margin-bottom: 10px; border-bottom: 1px solid rgb(255 255 255 / .1); padding-bottom: 8px; font-size: 10px; font-weight: 900; letter-spacing: .15em; text-transform: uppercase; color: rgb(255 255 255 / .68); }
.bm-task-overlay { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; overflow-y: auto; background: rgb(0 0 0 / .78); padding: 16px; backdrop-filter: blur(12px); }
.bm-task-dialog { width: 100%; max-height: calc(100vh - 32px); overflow-y: auto; border: 1px solid rgb(255 255 255 / .14); background: rgb(10 11 14 / .98); padding: 16px; box-shadow: 0 24px 80px rgb(0 0 0 / .5); }
label { font-size: 11px; font-weight: 800; color: rgb(255 255 255 / .58); }
@media (max-width: 1279px) {
  .bm-task-dialog aside { border: 0; padding: 0; }
}
</style>

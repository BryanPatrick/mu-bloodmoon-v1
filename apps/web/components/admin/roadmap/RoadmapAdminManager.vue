<template>
  <div class="grid gap-5">
    <header class="flex flex-col gap-4 border-b border-white/10 pb-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p class="bm-kicker">Planejamento e entregas</p>
        <h1 class="mt-2 font-display text-4xl font-black uppercase">Roadmap Admin</h1>
        <p class="mt-2 max-w-3xl text-sm font-semibold leading-6 text-white/60">Crie, revise, aprove e publique iniciativas com responsáveis, tarefas e comprovação de trabalho.</p>
      </div>
      <button v-if="canCreate" class="bm-admin-primary" type="button" @click="openCreate"><Plus class="size-4" /> Nova iniciativa</button>
    </header>

    <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <article v-for="metric in metrics" :key="metric.label" class="bm-panel rounded-md p-4">
        <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{{ metric.label }}</p>
        <p class="mt-2 font-display text-3xl font-black">{{ metric.value }}</p>
      </article>
    </section>

    <section class="bm-panel grid gap-3 rounded-md p-4 lg:grid-cols-[1fr_repeat(3,180px)_auto]">
      <input v-model="query.search" class="field" placeholder="Buscar titulo, slug ou categoria" @input="debouncedLoad">
      <select v-model="query.workflowStatus" class="field" @change="load"><option value="">Todos os fluxos</option><option v-for="item in workflows" :key="item" :value="item">{{ workflowLabel[item] }}</option></select>
      <select v-model="query.horizon" class="field" @change="load"><option value="">Todos horizontes</option><option v-for="item in horizons" :key="item" :value="item">{{ horizonLabel[item] }}</option></select>
      <select v-model="query.status" class="field" @change="load"><option value="">Todos os status</option><option v-for="item in statuses" :key="item" :value="item">{{ statusLabel[item] }}</option></select>
      <label class="flex items-center gap-2 px-2 text-xs font-black text-white/55"><input v-model="query.includeDeleted" type="checkbox" @change="load"> Excluidas</label>
    </section>

    <section v-if="selectedIds.size" class="flex flex-wrap items-center gap-3 border border-ember/30 bg-ember/10 p-3">
      <strong class="text-xs">{{ selectedIds.size }} selecionadas</strong>
      <button class="bm-admin-action" type="button" @click="bulkTransition('ARCHIVE')">Arquivar em lote</button>
      <button class="bm-admin-action" type="button" @click="selectedIds.clear()">Limpar seleção</button>
    </section>

    <p v-if="notice" class="border px-4 py-3 text-sm font-bold" :class="noticeError ? 'border-red-400/30 bg-red-500/10 text-red-100' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'">{{ notice }}</p>

    <section class="bm-panel overflow-hidden rounded-md">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1050px] text-left text-xs">
          <thead class="border-b border-white/10 text-[10px] font-black uppercase tracking-[0.15em] text-white/40">
            <tr><th class="p-3"><input type="checkbox" :checked="allSelected" @change="toggleAll"></th><th>Ordem</th><th>Iniciativa</th><th>Horizonte</th><th>Status</th><th>Fluxo</th><th>Responsavel</th><th>Progresso</th><th class="pr-3 text-right">Acoes</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id" class="border-b border-white/[0.07] align-top hover:bg-white/[0.035]">
              <td class="p-3"><input type="checkbox" :checked="selectedIds.has(item.id)" @change="toggleSelected(item.id)"></td>
              <td class="py-3 text-ember">{{ item.sortOrder }}</td>
              <td class="max-w-[290px] py-3"><strong class="font-display text-base">{{ item.title }}</strong><p class="mt-1 line-clamp-2 text-white/45">{{ item.summary }}</p><p class="mt-1 text-[10px] text-white/25">v{{ item.version }} · {{ item.category }}</p></td>
              <td class="py-3">{{ horizonLabel[item.horizon] }}</td>
              <td class="py-3">{{ statusLabel[item.status] }}</td>
              <td class="py-3"><span class="rounded-sm bg-white/8 px-2 py-1 font-black">{{ workflowLabel[item.workflowStatus] }}</span></td>
              <td class="py-3">{{ item.owner?.name || item.ownerId || 'Nao atribuido' }}</td>
              <td class="w-28 py-3"><div class="h-1.5 bg-white/10"><span class="block h-full bg-ember" :style="{ width: `${item.progress}%` }" /></div><span class="mt-1 block text-[10px]">{{ item.progress }}%</span></td>
              <td class="py-3 pr-3"><div class="flex justify-end gap-1"><button v-if="canEdit" class="icon-button" title="Subir na ordem" type="button" @click="move(item, -1)"><ArrowUp class="size-4" /></button><button v-if="canEdit" class="icon-button" title="Descer na ordem" type="button" @click="move(item, 1)"><ArrowDown class="size-4" /></button><button class="icon-button" title="Visualizar e editar" type="button" @click="openEdit(item)"><Pencil class="size-4" /></button><button v-if="canCreate" class="icon-button" title="Duplicar" type="button" @click="duplicate(item)"><Copy class="size-4" /></button><button class="icon-button" title="Operacao e historico" type="button" @click="openOperations(item)"><Activity class="size-4" /></button></div></td>
            </tr>
          </tbody>
        </table>
      </div>
      <AdminEmptyState v-if="!loading && !items.length" title="Nenhuma iniciativa encontrada" description="Crie uma iniciativa ou ajuste os filtros." />
      <div class="flex items-center justify-between gap-4 p-4 text-xs text-white/45"><span>{{ total }} registros</span><div class="flex gap-2"><button class="bm-admin-action" :disabled="page <= 1" @click="page--; load()">Anterior</button><span class="px-2 py-2">{{ page }} / {{ totalPages }}</span><button class="bm-admin-action" :disabled="page >= totalPages" @click="page++; load()">Proxima</button></div></div>
    </section>

    <Teleport to="body">
      <div v-if="editorOpen" class="fixed inset-0 z-[120] overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6">
        <section class="mx-auto max-w-7xl border border-white/15 bg-zinc-950 p-5 shadow-2xl">
          <header class="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div><p class="bm-kicker">{{ editingId ? 'Editar iniciativa' : 'Nova iniciativa' }}</p><h2 class="mt-2 font-display text-3xl font-black">{{ form.title || 'Roadmap' }}</h2></div>
            <button class="icon-button" type="button" @click="closeEditor"><X class="size-5" /></button>
          </header>
          <form class="mt-5 grid gap-4 lg:grid-cols-4" @submit.prevent="save">
            <label class="label lg:col-span-2">Titulo<input v-model="form.title" class="field" required></label>
            <label class="label">Slug<input v-model="form.slug" class="field" placeholder="gerado pelo titulo"></label>
            <label class="label">Categoria<input v-model="form.category" class="field" required></label>
            <label class="label lg:col-span-4">Resumo<textarea v-model="form.summary" class="field min-h-20" required /></label>
            <label class="label lg:col-span-4">Descricao<textarea v-model="form.description" class="field min-h-32" required /></label>
            <label class="label lg:col-span-2">Objetivo<textarea v-model="form.objective" class="field min-h-24" /></label>
            <label class="label lg:col-span-2">Problema que resolve<textarea v-model="form.problem" class="field min-h-24" /></label>
            <label class="label lg:col-span-2">Beneficio ao jogador<textarea v-model="form.playerBenefit" class="field min-h-24" /></label>
            <label class="label">Escopo incluido, uma linha por item<textarea v-model="form.scopeIncluded" class="field min-h-24" /></label>
            <label class="label">Escopo excluido<textarea v-model="form.scopeExcluded" class="field min-h-24" /></label>
            <label class="label">Horizonte<select v-model="form.horizon" class="field"><option v-for="item in horizons" :key="item" :value="item">{{ horizonLabel[item] }}</option></select></label>
            <label class="label">Status<select v-model="form.status" class="field"><option v-for="item in statuses" :key="item" :value="item">{{ statusLabel[item] }}</option></select></label>
            <label class="label">Prioridade<select v-model="form.priority" class="field"><option v-for="item in priorities" :key="item">{{ item }}</option></select></label>
            <label class="label">Visibilidade<select v-model="form.visibility" class="field"><option value="PUBLIC">Publica</option><option value="UNLISTED">Nao listada</option><option value="ADMIN_ONLY">Somente administracao</option></select></label>
            <label class="label">Progresso<input v-model.number="form.progress" class="field" min="0" max="100" type="number"></label>
            <label class="label">Periodo estimado<input v-model="form.estimatedPeriod" class="field" placeholder="3 trimestre de 2026"></label>
            <label class="label">Responsavel<input v-model="form.ownerId" class="field" placeholder="ID do colaborador"></label>
            <label class="label">Prazo interno<input v-model="form.internalDeadline" class="field" type="datetime-local"></label>
            <label class="label">Situacao<select v-model="form.workSituation" class="field"><option value="ON_TRACK">No prazo</option><option value="AT_RISK">Em risco</option><option value="DELAYED">Atrasada</option><option value="BLOCKED">Bloqueada</option><option value="DONE">Concluida</option></select></label>
            <label class="label lg:col-span-2">Imagem<input v-model="form.image" class="field" placeholder="/api/media/imagem.webp"></label>
            <label class="label">Icone<input v-model="form.icon" class="field"></label>
            <label class="label">Tags, separadas por virgula<input v-model="form.tags" class="field"></label>
            <label class="label lg:col-span-2">Notas publicas<textarea v-model="form.publicNotes" class="field min-h-20" /></label>
            <label class="label lg:col-span-2">Notas internas<textarea v-model="form.internalNotes" class="field min-h-20" /></label>
            <label class="label lg:col-span-2">Descricao do trabalho<input v-model="form.workDescription" class="field" placeholder="O que foi realizado nesta edicao"></label>
            <label class="label">Evidencia<input v-model="form.evidence" class="field" placeholder="URL, ticket ou referencia"></label>
            <label class="label">Tempo em minutos<input v-model.number="form.durationMinutes" class="field" min="0" type="number"></label>
            <div class="flex flex-wrap gap-2 lg:col-span-4"><button class="bm-admin-primary" :disabled="saving" type="submit"><Save class="size-4" /> Salvar rascunho</button><button class="bm-admin-action" type="button" @click="closeEditor">Cancelar</button></div>
          </form>
        </section>
      </div>

      <div v-if="operationsOpen && active" class="fixed inset-0 z-[120] overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6">
        <section class="mx-auto max-w-6xl border border-white/15 bg-zinc-950 p-5">
          <header class="flex items-start justify-between gap-4 border-b border-white/10 pb-4"><div><p class="bm-kicker">Operacao da iniciativa</p><h2 class="mt-2 font-display text-3xl font-black">{{ active.title }}</h2></div><button class="icon-button" type="button" @click="operationsOpen=false"><X class="size-5" /></button></header>
          <div class="mt-5 grid gap-5 xl:grid-cols-3">
            <section class="bm-panel rounded-md p-4"><h3 class="font-display text-xl font-black">Workflow</h3><p class="mt-2 text-xs text-white/45">Atual: {{ workflowLabel[active.workflowStatus] }}</p><input v-model="transitionReason" class="field mt-4" placeholder="Motivo ou observacao"><input v-model="scheduleAt" class="field mt-2" type="datetime-local"><div class="mt-3 grid grid-cols-2 gap-2"><button v-if="canEdit" class="bm-admin-action" @click="runTransition('SUBMIT_REVIEW')">Enviar para revisao</button><button v-if="canReview" class="bm-admin-action" @click="runTransition('REJECT')">Rejeitar</button><button v-if="canApprove" class="bm-admin-action" @click="runTransition('APPROVE')">Aprovar</button><button v-if="canPublish" class="bm-admin-action" @click="runTransition('PUBLISH')">Publicar</button><button v-if="canPublish" class="bm-admin-action" @click="runTransition('SCHEDULE')">Agendar</button><button v-if="canPublish" class="bm-admin-action" @click="runTransition('UNPUBLISH')">Despublicar</button><button v-if="canEdit" class="bm-admin-action" @click="runTransition(active.deletedAt || active.workflowStatus === 'ARCHIVED' ? 'RESTORE' : 'ARCHIVE')">{{ active.deletedAt || active.workflowStatus === 'ARCHIVED' ? 'Restaurar' : 'Arquivar' }}</button><button v-if="canDelete" class="bm-admin-danger" @click="runTransition('DELETE')">Excluir</button></div></section>

            <section class="bm-panel rounded-md p-4"><h3 class="font-display text-xl font-black">Nova atualizacao</h3><input v-model="updateForm.title" class="field mt-3" placeholder="Titulo"><textarea v-model="updateForm.content" class="field mt-2 min-h-20" placeholder="Trabalho e mudancas realizadas" /><div class="mt-2 grid grid-cols-2 gap-2"><select v-model="updateForm.newStatus" class="field"><option value="">Manter status</option><option v-for="item in statuses" :key="item" :value="item">{{ statusLabel[item] }}</option></select><input v-model.number="updateForm.newProgress" class="field" min="0" max="100" type="number"></div><input v-model="updateForm.evidence" class="field mt-2" placeholder="Evidencia"><button class="bm-admin-primary mt-3" @click="addUpdate">Registrar atualizacao</button></section>

            <section class="bm-panel rounded-md p-4"><h3 class="font-display text-xl font-black">Nova tarefa</h3><input v-model="taskForm.title" class="field mt-3" placeholder="Titulo"><textarea v-model="taskForm.description" class="field mt-2 min-h-20" placeholder="Descricao" /><input v-model="taskForm.assigneeId" class="field mt-2" placeholder="Responsavel"><input v-model="taskForm.dueAt" class="field mt-2" type="datetime-local"><button class="bm-admin-primary mt-3" @click="addTask">Adicionar tarefa</button></section>
          </div>

          <div class="mt-5 grid gap-5 xl:grid-cols-3">
            <section class="bm-panel rounded-md p-4"><h3 class="font-display text-xl font-black">Tarefas relacionadas</h3><article v-for="task in active.tasks" :key="task.id" class="mt-3 flex items-center gap-3 border-t border-white/10 pt-3"><button class="icon-button" :title="task.status === 'DONE' ? 'Reabrir' : 'Concluir'" @click="toggleTask(task)"><Check class="size-4" /></button><div class="min-w-0 flex-1"><strong>{{ task.title }}</strong><p class="text-xs text-white/40">{{ task.assigneeId || 'Sem responsavel' }} · {{ task.status }}</p></div></article><AdminEmptyState v-if="!active.tasks?.length" title="Sem tarefas" description="Relacione o trabalho operacional desta iniciativa." /></section>
            <section class="bm-panel rounded-md p-4"><h3 class="font-display text-xl font-black">Noticias e patch notes</h3><div class="mt-3 grid grid-cols-[120px_1fr_auto] gap-2"><select v-model="relationForm.type" class="field"><option value="NEWS">Noticia</option><option value="PATCH_NOTE">Patch note</option></select><input v-model="relationForm.entityId" class="field" placeholder="ID do conteudo"><button class="icon-button" title="Relacionar" @click="addRelation"><Plus class="size-4" /></button></div><article v-for="relation in active.relations" :key="String(relation.id)" class="mt-3 flex items-center gap-2 border-t border-white/10 pt-3 text-xs"><span class="min-w-0 flex-1 truncate">{{ relation.type }} · {{ relation.label || relation.entityId }}</span><button class="icon-button" title="Remover relacao" @click="removeRelation(String(relation.id))"><X class="size-3" /></button></article><AdminEmptyState v-if="!active.relations?.length" title="Sem relacoes" description="Conecte noticias e notas de patch existentes." /></section>
            <section class="bm-panel rounded-md p-4"><h3 class="font-display text-xl font-black">Historico de alteracoes</h3><article v-for="event in history" :key="String(event.id)" class="mt-3 border-t border-white/10 pt-3 text-xs"><strong>{{ event.action }}</strong><p class="mt-1 text-white/40">{{ event.actorUsername }} · {{ formatDate(String(event.createdAt)) }}</p></article><AdminEmptyState v-if="!history.length" title="Sem historico" description="As proximas alteracoes auditadas aparecerao aqui." /></section>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { Activity, ArrowDown, ArrowUp, Check, Copy, Pencil, Plus, Save, X } from 'lucide-vue-next'
import type { RoadmapItem, RoadmapTask } from '~/composables/useRoadmapApi'
import { permissions } from '~/data/security'

const api = useRoadmapApi()
const route = useRoute()
const { hasPermission } = useAuth()
const canCreate = computed(() => hasPermission(permissions.adminRoadmapCreate))
const canEdit = computed(() => hasPermission(permissions.adminRoadmapEdit))
const canReview = computed(() => hasPermission(permissions.adminRoadmapReview))
const canApprove = computed(() => hasPermission(permissions.adminRoadmapApprove))
const canPublish = computed(() => hasPermission(permissions.adminRoadmapPublish))
const canDelete = computed(() => hasPermission(permissions.adminRoadmapDelete))
const horizons = ['NOW', 'NEXT', 'FUTURE', 'ANALYSIS', 'COMPLETED', 'CANCELLED'] as const
const statuses = ['PROPOSED', 'ANALYSIS', 'PLANNED', 'DESIGN', 'DEVELOPMENT', 'TESTING', 'CLOSED_BETA', 'PUBLIC_BETA', 'READY', 'RELEASED', 'PAUSED', 'POSTPONED', 'CANCELLED'] as const
const workflows = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED', 'REJECTED'] as const
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
const horizonLabel: Record<string, string> = { NOW: 'Agora', NEXT: 'Proximo', FUTURE: 'Futuro', ANALYSIS: 'Em analise', COMPLETED: 'Concluido', CANCELLED: 'Cancelado' }
const statusLabel: Record<string, string> = { PROPOSED: 'Proposto', ANALYSIS: 'Em analise', PLANNED: 'Planejado', DESIGN: 'Em design', DEVELOPMENT: 'Em desenvolvimento', TESTING: 'Em testes', CLOSED_BETA: 'Beta fechado', PUBLIC_BETA: 'Beta publico', READY: 'Pronto', RELEASED: 'Lancado', PAUSED: 'Pausado', POSTPONED: 'Adiado', CANCELLED: 'Cancelado' }
const workflowLabel: Record<string, string> = { DRAFT: 'Rascunho', IN_REVIEW: 'Em revisao', APPROVED: 'Aprovado', SCHEDULED: 'Agendado', PUBLISHED: 'Publicado', UNPUBLISHED: 'Despublicado', ARCHIVED: 'Arquivado', REJECTED: 'Rejeitado' }
const items = ref<RoadmapItem[]>([])
const summary = ref<Record<string, number | Array<Record<string, unknown>>>>({})
const total = ref(0), page = ref(1), totalPages = ref(1)
const loading = ref(false), saving = ref(false), notice = ref(''), noticeError = ref(false)
const query = reactive({
  search: '',
  workflowStatus: String(route.query.workflowStatus || ''),
  horizon: '',
  status: '',
  includeDeleted: false
})
const selectedIds = reactive(new Set<string>())
const editorOpen = ref(false), operationsOpen = ref(false), editingId = ref(''), active = ref<RoadmapItem | null>(null)
const history = ref<Array<Record<string, unknown>>>([])
const transitionReason = ref(''), scheduleAt = ref('')
const dirty = ref(false)
let debounce: ReturnType<typeof setTimeout> | undefined
const emptyForm = () => ({ title: '', slug: '', summary: '', description: '', objective: '', problem: '', playerBenefit: '', scopeIncluded: '', scopeExcluded: '', category: '', horizon: 'NOW', status: 'PROPOSED', priority: 'MEDIUM', progress: 0, estimatedPeriod: '', ownerId: '', internalDeadline: '', workSituation: 'ON_TRACK', image: '', icon: '', tags: '', publicNotes: '', internalNotes: '', workDescription: '', evidence: '', durationMinutes: 0, visibility: 'PUBLIC' })
const form = reactive(emptyForm())
const updateForm = reactive({ title: '', content: '', newStatus: '', newProgress: 0, evidence: '' })
const taskForm = reactive({ title: '', description: '', assigneeId: '', dueAt: '' })
const relationForm = reactive({ type: 'NEWS', entityId: '' })
const metrics = computed(() => [
  ['Iniciativas', 'total'], ['Rascunhos', 'drafts'], ['Em revisao', 'review'], ['Atrasadas', 'overdue'], ['Sem atualizacao', 'stale'],
  ['Em desenvolvimento', 'development'], ['Em testes', 'testing'], ['Concluidas', 'completed'], ['Canceladas', 'cancelled'], ['Tarefas pendentes', 'pendingTasks']
].map(([label, key]) => ({ label, value: Number(summary.value[key] || 0) })))
const allSelected = computed(() => items.value.length > 0 && items.value.every((item) => selectedIds.has(item.id)))
const load = async () => { loading.value = true; try { const [list, stats] = await Promise.all([api.list({ ...query, page: page.value, pageSize: 24 }), api.summary()]); items.value = list.items; total.value = list.total; totalPages.value = list.totalPages; summary.value = stats; noticeError.value = false } catch { notice.value = 'Nao foi possivel carregar o Roadmap Admin.'; noticeError.value = true } finally { loading.value = false } }
const debouncedLoad = () => { clearTimeout(debounce); debounce = setTimeout(() => { page.value = 1; load() }, 300) }
watch(
  () => route.query.workflowStatus,
  async (value) => {
    const next = String(value || '')
    if (query.workflowStatus === next) return
    query.workflowStatus = next
    page.value = 1
    await load()
  }
)
const toggleSelected = (id: string) => selectedIds.has(id) ? selectedIds.delete(id) : selectedIds.add(id)
const toggleAll = () => allSelected.value ? selectedIds.clear() : items.value.forEach((item) => selectedIds.add(item.id))
const openCreate = () => { editingId.value = ''; Object.assign(form, emptyForm()); dirty.value = false; editorOpen.value = true }
const openEdit = async (item: RoadmapItem) => { if (!canEdit.value) return openOperations(item); const detail = await api.detail(item.id); editingId.value = item.id; Object.assign(form, { ...emptyForm(), ...detail, scopeIncluded: (detail.scopeIncluded || []).join('\n'), scopeExcluded: (detail.scopeExcluded || []).join('\n'), tags: (detail.tags || []).join(', '), internalDeadline: detail.internalDeadline?.slice(0, 16) || '' }); dirty.value = false; editorOpen.value = true }
const closeEditor = () => { if (dirty.value && !confirm('Descartar alteracoes nao salvas?')) return; editorOpen.value = false; dirty.value = false }
watch(form, () => { if (editorOpen.value) dirty.value = true }, { deep: true })
const payload = () => ({ ...form, scopeIncluded: form.scopeIncluded.split('\n').map((v) => v.trim()).filter(Boolean), scopeExcluded: form.scopeExcluded.split('\n').map((v) => v.trim()).filter(Boolean), tags: form.tags.split(',').map((v) => v.trim()).filter(Boolean), internalDeadline: form.internalDeadline || null, image: form.image || null, ownerId: form.ownerId || null, evidence: form.evidence || undefined })
const save = async () => { saving.value = true; try { editingId.value ? await api.update(editingId.value, payload()) : await api.create(payload()); editorOpen.value = false; dirty.value = false; notice.value = 'Rascunho salvo e trabalho registrado.'; noticeError.value = false; await load() } catch (error) { notice.value = error instanceof Error ? error.message : 'Falha ao salvar.'; noticeError.value = true } finally { saving.value = false } }
const duplicate = async (item: RoadmapItem) => { await api.duplicate(item.id); notice.value = 'Iniciativa duplicada como rascunho.'; await load() }
const move = async (item: RoadmapItem, direction: number) => { const ordered = [...items.value].sort((a, b) => a.sortOrder - b.sortOrder); const index = ordered.findIndex((row) => row.id === item.id); const other = ordered[index + direction]; if (!other) return; await api.reorder([{ id: item.id, order: other.sortOrder }, { id: other.id, order: item.sortOrder }]); await load() }
const openOperations = async (item: RoadmapItem) => { active.value = await api.detail(item.id); history.value = await api.history(item.id); operationsOpen.value = true }
const runTransition = async (action: string) => { if (!active.value) return; if (['DELETE', 'REJECT'].includes(action) && !transitionReason.value.trim()) return alert('Informe o motivo.'); try { active.value = await api.transition(active.value.id, { action, reason: transitionReason.value, scheduledPublishAt: scheduleAt.value || undefined }); notice.value = 'Workflow atualizado e auditado.'; noticeError.value = false; await Promise.all([load(), openOperations(active.value)]) } catch (error) { notice.value = error instanceof Error ? error.message : 'Falha no workflow.'; noticeError.value = true } }
const bulkTransition = async (action: string) => { for (const id of selectedIds) await api.transition(id, { action, reason: 'Acao administrativa em lote.' }); selectedIds.clear(); await load() }
const addUpdate = async () => { if (!active.value) return; await api.addUpdate(active.value.id, { ...updateForm, newStatus: updateForm.newStatus || undefined, evidence: updateForm.evidence || undefined }); Object.assign(updateForm, { title: '', content: '', newStatus: '', newProgress: active.value.progress, evidence: '' }); await openOperations(active.value); await load() }
const addTask = async () => { if (!active.value) return; await api.createTask(active.value.id, { ...taskForm, assigneeId: taskForm.assigneeId || null, dueAt: taskForm.dueAt || null }); Object.assign(taskForm, { title: '', description: '', assigneeId: '', dueAt: '' }); await openOperations(active.value); await load() }
const toggleTask = async (task: RoadmapTask) => { await api.updateTask(task.id, { status: task.status === 'DONE' ? 'PENDING' : 'DONE' }); if (active.value) await openOperations(active.value); await load() }
const addRelation = async () => { if (!active.value || !relationForm.entityId.trim()) return; await api.addRelation(active.value.id, relationForm); relationForm.entityId = ''; await openOperations(active.value) }
const removeRelation = async (id: string) => { await api.removeRelation(id); if (active.value) await openOperations(active.value) }
const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
onMounted(load)
onBeforeUnmount(() => clearTimeout(debounce))
</script>

<style scoped>
.field { min-height: 40px; width: 100%; border: 1px solid rgb(255 255 255 / .12); border-radius: 4px; background: rgb(255 255 255 / .06); padding: 9px 11px; color: white; font-size: 12px; font-weight: 700; outline: none; }
.field:focus { border-color: rgb(230 95 58 / .7); }
.field option { background: #090909; }
.label { display: grid; gap: 6px; color: rgb(255 255 255 / .55); font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .12em; }
.icon-button { display: inline-grid; min-width: 34px; height: 34px; place-items: center; border: 1px solid rgb(255 255 255 / .12); background: rgb(255 255 255 / .06); color: rgb(255 255 255 / .72); }
.icon-button:hover { border-color: rgb(230 95 58 / .55); color: white; }
</style>

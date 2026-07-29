<template>
  <div class="grid gap-5">
    <header class="flex flex-col gap-4 border-b border-white/10 pb-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p class="bm-kicker">Operação social</p>
        <h1 class="mt-1 font-display text-3xl font-black uppercase">Comunidade Admin</h1>
        <p class="mt-2 max-w-3xl text-xs font-semibold leading-6 text-white/55">Moderação, gamificação e saúde da comunidade sem interferir na conta do jogo.</p>
      </div>
      <NuxtLink class="bm-button-glass inline-flex h-10 items-center rounded-md px-4 text-xs font-black" to="/comunidade">Abrir comunidade pública</NuxtLink>
    </header>

    <nav class="flex gap-2 overflow-x-auto pb-1" aria-label="Áreas da comunidade">
      <button v-for="tab in visibleTabs" :key="tab.key" class="flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-xs font-black transition" :class="activeTab === tab.key ? 'border-ember/50 bg-ember/15' : 'border-white/10 bg-white/5 text-white/50'" type="button" @click="selectTab(tab.key)">
        <component :is="tab.icon" class="size-4" />{{ tab.label }}
      </button>
    </nav>

    <p v-if="message" class="rounded-md border px-4 py-3 text-xs font-bold" :class="failed ? 'border-red-400/30 bg-red-500/10 text-red-100' : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'">{{ message }}</p>

    <section v-if="activeTab === 'dashboard'" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
      <article v-for="metric in dashboardMetrics" :key="metric.label" class="bm-panel min-h-24 rounded-md p-4">
        <p class="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">{{ metric.label }}</p>
        <strong class="mt-3 block font-display text-3xl">{{ metric.value }}</strong>
      </article>
    </section>

    <section v-else-if="['posts', 'comments', 'users', 'reports'].includes(activeTab)" class="grid gap-4">
      <CommunityToolbar v-model="search" :statuses="statusOptions" v-model:status="status" @reload="reload" />
      <div class="grid gap-3 xl:grid-cols-2">
        <article v-for="row in currentPage.data" :key="row.id" class="bm-panel rounded-md p-4">
          <template v-if="activeTab === 'posts'">
            <div class="flex justify-between gap-3"><span class="bm-status">{{ row.status }}</span><small class="text-white/35">@{{ row.author.username }}</small></div>
            <h2 class="mt-3 font-display text-xl">{{ row.title || 'Publicação sem título' }}</h2>
            <p class="mt-2 line-clamp-4 text-xs leading-5 text-white/58">{{ row.content }}</p>
            <p class="mt-3 text-[10px] text-white/35">{{ row._count.comments }} comentários · {{ row._count.reactions }} reações · {{ row._count.reports }} denúncias · {{ row._count.revisions }} revisões</p>
            <div v-if="canPosts" class="mt-4 grid grid-cols-3 gap-2">
              <CommunityAction label="Ocultar" @click="contentAction(row.id, 'HIDE')" /><CommunityAction label="Restaurar" @click="contentAction(row.id, 'RESTORE')" />
              <CommunityAction label="Fixar" @click="contentAction(row.id, 'PIN')" /><CommunityAction label="Destacar" @click="contentAction(row.id, 'FEATURE')" />
              <CommunityAction label="Limitar" @click="contentAction(row.id, 'LIMIT_REACH')" /><CommunityAction danger label="Remover" @click="contentAction(row.id, 'REMOVE')" />
              <CommunityAction label="Editar" @click="editPost(row)" />
            </div>
          </template>
          <template v-else-if="activeTab === 'comments'">
            <div class="flex justify-between gap-3"><span class="bm-status">{{ row.status }}</span><small class="text-white/35">@{{ row.author.username }}</small></div>
            <p class="mt-3 text-sm leading-6 text-white/65">{{ row.content }}</p>
            <p class="mt-3 text-[10px] text-white/35">{{ row._count.reports }} denúncias · {{ row._count.reactions }} reações</p>
            <div v-if="canComments" class="mt-4 grid grid-cols-3 gap-2"><CommunityAction label="Ocultar" @click="commentAction(row.id, 'HIDE')" /><CommunityAction label="Restaurar" @click="commentAction(row.id, 'RESTORE')" /><CommunityAction danger label="Remover" @click="commentAction(row.id, 'REMOVE')" /></div>
          </template>
          <template v-else-if="activeTab === 'users'">
            <div class="flex items-center justify-between gap-3"><div><h2 class="font-display text-xl">{{ row.displayName }}</h2><p class="text-[10px] text-white/35">@{{ row.account.username }}</p></div><span class="bm-status">{{ row.warningCount }} avisos</span></div>
            <p class="mt-3 text-xs text-white/50">{{ row.bio || 'Sem biografia.' }}</p>
            <div v-if="canUsers" class="mt-4 grid grid-cols-3 gap-2">
              <CommunityAction label="Advertir" @click="moderate(row.accountId, 'WARNING')" /><CommunityAction label="Suspender social" @click="moderate(row.accountId, 'SOCIAL_SUSPENSION')" />
              <CommunityAction label="Bloquear posts" @click="moderate(row.accountId, 'POST_BLOCK')" /><CommunityAction label="Bloquear comentários" @click="moderate(row.accountId, 'COMMENT_BLOCK')" />
              <CommunityAction label="Limitar mensagens" @click="moderate(row.accountId, 'MESSAGE_LIMIT')" /><CommunityAction label="Limitar alcance" @click="moderate(row.accountId, 'REACH_LIMIT')" />
              <CommunityAction label="Remover avatar" @click="moderate(row.accountId, 'AVATAR_REMOVAL')" /><CommunityAction label="Remover capa" @click="moderate(row.accountId, 'COVER_REMOVAL')" />
              <CommunityAction label="Restaurar acesso" @click="restoreUser(row.accountId)" />
            </div>
          </template>
          <template v-else>
            <div class="flex justify-between gap-3"><span class="bm-status">{{ row.status }}</span><span class="bm-status">{{ row.priority }}</span></div>
            <h2 class="mt-3 font-display text-xl">{{ row.reason }}</h2>
            <p class="mt-2 text-xs text-white/55">{{ row.description || row.post?.content || row.comment?.content }}</p>
            <p class="mt-3 text-[10px] text-white/35">Denunciante: {{ row.reporter.username }} · Alvo: {{ row.reportedUser?.username || '-' }}</p>
            <div v-if="canReports" class="mt-4 grid grid-cols-3 gap-2">
              <CommunityAction label="Atribuir a mim" @click="reportAction(row.id, 'ASSIGNED')" /><CommunityAction label="Investigar" @click="reportAction(row.id, 'INVESTIGATING')" />
              <CommunityAction label="Escalar" @click="reportAction(row.id, 'ESCALATED')" /><CommunityAction label="Resolver" @click="reportAction(row.id, 'RESOLVED')" />
              <CommunityAction label="Rejeitar" @click="reportAction(row.id, 'REJECTED')" /><CommunityAction label="Reabrir" @click="reportAction(row.id, 'REOPENED')" />
            </div>
          </template>
        </article>
      </div>
      <CommunityPagination v-bind="currentPage" @change="changePage" />
    </section>

    <section v-else-if="['achievements', 'quests', 'badges'].includes(activeTab)" class="grid gap-4 xl:grid-cols-[360px_1fr]">
      <form class="bm-panel grid h-fit gap-3 rounded-md p-4" @submit.prevent="saveCatalog">
        <div><p class="bm-kicker">{{ catalogEditingId ? 'Edição' : 'Novo registro' }}</p><h2 class="mt-1 font-display text-xl">{{ catalogTitle }}</h2></div>
        <input v-model="catalogForm.name" class="bm-admin-input" placeholder="Nome" required>
        <textarea v-model="catalogForm.description" class="bm-admin-input min-h-20 py-3" placeholder="Descrição" required />
        <template v-if="activeTab === 'achievements'">
          <input v-model="catalogForm.category" class="bm-admin-input" placeholder="Categoria" required>
          <select v-model="catalogForm.rarity" class="bm-admin-input"><option v-for="item in ['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY']" :key="item">{{ item }}</option></select>
          <input v-model.number="catalogForm.points" class="bm-admin-input" min="0" type="number" placeholder="Pontos">
        </template>
        <template v-if="activeTab === 'quests'">
          <textarea v-model="catalogForm.objectiveText" class="bm-admin-input min-h-16 py-3" placeholder="Objetivo" required />
          <textarea v-model="catalogForm.rewardText" class="bm-admin-input min-h-16 py-3" placeholder="Recompensa" required />
          <div class="grid grid-cols-2 gap-2"><input v-model="catalogForm.startsAt" class="bm-admin-input" type="datetime-local"><input v-model="catalogForm.endsAt" class="bm-admin-input" type="datetime-local"></div>
        </template>
        <template v-if="activeTab === 'badges'">
          <input v-model="catalogForm.imageUrl" class="bm-admin-input" placeholder="URL da imagem">
          <div class="grid grid-cols-2 gap-2"><input v-model.number="catalogForm.maxGrants" class="bm-admin-input" type="number" placeholder="Limite"><input v-model.number="catalogForm.validDays" class="bm-admin-input" type="number" placeholder="Validade (dias)"></div>
        </template>
        <UButton type="submit" color="error">{{ catalogEditingId ? 'Salvar alterações' : 'Criar' }}</UButton>
        <UButton v-if="catalogEditingId" color="neutral" variant="soft" @click="resetCatalog">Cancelar edição</UButton>
      </form>
      <div class="grid content-start gap-3">
        <CommunityToolbar v-model="search" @reload="reload" />
        <article v-for="row in currentPage.data" :key="row.id" class="bm-panel rounded-md p-4">
          <div class="flex items-start justify-between gap-3"><div><h2 class="font-display text-xl">{{ row.name }}</h2><p class="mt-1 text-xs text-white/48">{{ row.description }}</p></div><span class="bm-status">{{ row.status || row.rarity || (row.isActive ? 'ATIVO' : 'INATIVO') }}</span></div>
          <p class="mt-3 text-[10px] text-white/35">{{ row._count?.grants ?? row._count?.participants ?? 0 }} vínculos</p>
          <div class="mt-4 flex flex-wrap gap-2">
            <CommunityAction label="Editar" @click="beginCatalogEdit(row)" />
            <template v-if="activeTab === 'achievements'"><CommunityAction label="Ativar" @click="catalogAction(row.id, 'ACTIVATE')" /><CommunityAction label="Duplicar" @click="catalogAction(row.id, 'DUPLICATE')" /><CommunityAction label="Atribuir" @click="grant(row.id, 'achievement')" /></template>
            <template v-else-if="activeTab === 'quests'"><CommunityAction label="Publicar" @click="catalogAction(row.id, 'PUBLISH')" /><CommunityAction label="Encerrar" @click="catalogAction(row.id, 'END')" /><CommunityAction label="Duplicar" @click="catalogAction(row.id, 'DUPLICATE')" /><CommunityAction label="Participantes" @click="loadParticipants(row)" /></template>
            <template v-else><CommunityAction label="Atribuir" @click="grant(row.id, 'badge')" /><CommunityAction label="Remover atribuição" @click="revokeBadge(row.id)" /></template>
          </div>
        </article>
        <CommunityPagination v-bind="currentPage" @change="changePage" />
        <section v-if="activeTab === 'quests' && selectedQuest" class="bm-panel grid gap-3 rounded-md p-4">
          <div class="flex items-center justify-between gap-3"><div><p class="bm-kicker">Participantes</p><h3 class="mt-1 font-display text-xl">{{ selectedQuest.name }}</h3></div><button class="text-xs text-white/45" type="button" @click="selectedQuest=null; participants=[]">Fechar</button></div>
          <article v-for="participant in participants" :key="participant.id" class="grid items-center gap-3 rounded-md border border-white/8 p-3 sm:grid-cols-[1fr_auto]">
            <div><strong class="text-xs">{{ participant.account.name }} <span class="text-white/35">@{{ participant.account.username }}</span></strong><p class="mt-1 text-[10px] text-white/40">Progresso: {{ participant.progress }}% · Recompensa: {{ participant.rewardedAt ? 'validada' : 'pendente' }}</p></div>
            <div class="flex gap-2"><CommunityAction label="Atualizar progresso" @click="updateParticipant(participant)" /><CommunityAction v-if="!participant.rewardedAt" label="Validar recompensa" @click="validateReward(participant)" /></div>
          </article>
          <p v-if="!participants.length" class="text-xs text-white/40">Nenhum participante nesta quest.</p>
        </section>
      </div>
    </section>

    <section v-else-if="activeTab === 'policy'" class="bm-panel grid gap-5 rounded-md p-5 xl:grid-cols-2">
      <div><p class="bm-kicker">Segurança social</p><h2 class="mt-2 font-display text-2xl">Palavras, links e limites</h2><p class="mt-2 text-xs text-white/45">Uma entrada por linha para palavras e domínios.</p></div>
      <form class="grid gap-3" @submit.prevent="savePolicy">
        <textarea v-model="policyForm.blockedWords" class="bm-admin-input min-h-24 py-3" placeholder="Palavras bloqueadas" />
        <div class="grid gap-3 sm:grid-cols-2"><textarea v-model="policyForm.allowedDomains" class="bm-admin-input min-h-20 py-3" placeholder="Domínios permitidos" /><textarea v-model="policyForm.blockedDomains" class="bm-admin-input min-h-20 py-3" placeholder="Domínios proibidos" /></div>
        <div class="grid grid-cols-2 gap-3"><label class="text-[10px] text-white/45">Posts/h<input v-model.number="policyForm.maxPostsPerHour" class="bm-admin-input mt-1" type="number"></label><label class="text-[10px] text-white/45">Comentários/h<input v-model.number="policyForm.maxCommentsPerHour" class="bm-admin-input mt-1" type="number"></label><label class="text-[10px] text-white/45">Cooldown post<input v-model.number="policyForm.postCooldownSeconds" class="bm-admin-input mt-1" type="number"></label><label class="text-[10px] text-white/45">Cooldown comentário<input v-model.number="policyForm.commentCooldownSeconds" class="bm-admin-input mt-1" type="number"></label></div>
        <UButton type="submit" color="error">Salvar regras</UButton>
      </form>
    </section>

    <section v-else-if="activeTab === 'tasks'" class="grid gap-4">
      <div class="flex justify-end"><UButton color="error" @click="createTask">Nova tarefa</UButton></div>
      <article v-for="row in currentPage.data" :key="row.id" class="bm-panel grid gap-3 rounded-md p-4 xl:grid-cols-[1fr_auto]">
        <div><span class="bm-status">{{ row.status }}</span><h2 class="mt-2 font-display text-xl">{{ row.title }}</h2><p class="mt-1 text-xs text-white/45">{{ row.description }}</p></div>
        <CommunityAction label="Atualizar" @click="editTask(row)" />
      </article>
      <CommunityPagination v-bind="currentPage" @change="changePage" />
    </section>

    <section v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article v-for="metric in analyticsMetrics" :key="metric.label" class="bm-panel rounded-md p-4"><p class="text-[9px] uppercase tracking-widest text-white/40">{{ metric.label }}</p><strong class="mt-2 block font-display text-3xl">{{ metric.value }}</strong></article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Award, BarChart3, BadgeCheck, BookOpenCheck, FileWarning, Flag, LayoutDashboard, MessageCircle, ScrollText, Settings, Users } from 'lucide-vue-next'
import { permissions } from '~/data/security'

const api = useCommunityApi()
const route = useRoute()
const router = useRouter()
const { hasPermission } = useAuth()
const activeTab = ref(String(route.query.tab || 'dashboard'))
const search = ref('')
const status = ref('')
const page = ref(1)
const message = ref('')
const failed = ref(false)
const dashboard = ref<Record<string, number>>({})
const analyticsData = ref<Record<string, any>>({})
const currentPage = ref<any>({ data: [], total: 0, page: 1, pageSize: 25, totalPages: 1 })
const canPosts = computed(() => hasPermission(permissions.adminCommunityPostsModerate))
const canComments = computed(() => hasPermission(permissions.adminCommunityCommentsModerate))
const canUsers = computed(() => hasPermission(permissions.adminCommunityUsersModerate))
const canReports = computed(() => hasPermission(permissions.adminCommunityReportsModerate))
const canAchievements = computed(() => hasPermission(permissions.adminCommunityAchievementsManage))
const canQuests = computed(() => hasPermission(permissions.adminCommunityQuestsManage))
const canBadges = computed(() => hasPermission(permissions.adminCommunityBadgesManage))
const canPolicy = computed(() => hasPermission(permissions.adminCommunityPolicyManage))
const canTasks = computed(() => hasPermission(permissions.adminCommunityTasksManage))
const canAnalytics = computed(() => hasPermission(permissions.adminCommunityReportsView))
const tabs = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true }, { key: 'posts', label: 'Publicações', icon: ScrollText, show: true },
  { key: 'comments', label: 'Comentários', icon: MessageCircle, show: true }, { key: 'users', label: 'Usuários sociais', icon: Users, show: true },
  { key: 'reports', label: 'Denúncias', icon: Flag, show: true }, { key: 'achievements', label: 'Conquistas', icon: Award, show: canAchievements },
  { key: 'quests', label: 'Quests', icon: BookOpenCheck, show: canQuests }, { key: 'badges', label: 'Badges', icon: BadgeCheck, show: canBadges },
  { key: 'policy', label: 'Regras e spam', icon: Settings, show: canPolicy }, { key: 'tasks', label: 'Tarefas', icon: FileWarning, show: canTasks },
  { key: 'analytics', label: 'Relatórios', icon: BarChart3, show: canAnalytics }
]
const visibleTabs = computed(() => tabs.filter((tab) => typeof tab.show === 'boolean' ? tab.show : tab.show.value))
const statusOptions = computed(() => activeTab.value === 'posts' || activeTab.value === 'comments' ? ['PUBLISHED','HIDDEN','REMOVED'] : activeTab.value === 'reports' ? ['NEW','ASSIGNED','INVESTIGATING','WAITING_FOR_USER','RESOLVED','REJECTED','ESCALATED','REOPENED'] : [])
const dashboardMetrics = computed(() => Object.entries(dashboard.value).map(([label, value]) => ({ label: ({ activeUsers:'Usuários ativos',newPosts:'Novos posts',comments:'Comentários',reports:'Denúncias',hiddenContent:'Conteúdo oculto',suspendedUsers:'Suspensos sociais',achievementsGranted:'Conquistas',activeQuests:'Quests ativas',spamDetected:'Spam detectado',tasks:'Minhas tarefas',errors:'Erros' } as any)[label] || label, value })))
const analyticsMetrics = computed(() => Object.entries(analyticsData.value).filter(([, value]) => typeof value === 'number').map(([label,value]) => ({ label, value })))
const catalogEditingId = ref<string|null>(null)
const catalogForm = reactive<any>({ name:'',description:'',category:'',rarity:'COMMON',points:0,objectiveText:'',rewardText:'',startsAt:'',endsAt:'',imageUrl:'',maxGrants:null,validDays:null })
const catalogTitle = computed(() => activeTab.value === 'achievements' ? 'Conquista' : activeTab.value === 'quests' ? 'Quest do site' : 'Badge')
const policyForm = reactive<any>({ blockedWords:'',allowedDomains:'',blockedDomains:'',maxPostsPerHour:10,maxCommentsPerHour:40,postCooldownSeconds:30,commentCooldownSeconds:10 })
const selectedQuest = ref<any>(null)
const participants = ref<any[]>([])
const askReason = () => window.prompt('Justificativa obrigatória:')
const run = async (operation: () => Promise<any>, success = 'Operação concluída.') => { try { failed.value=false; await operation(); message.value=success; await reload() } catch (error:any) { failed.value=true; message.value=error?.data?.message || 'Não foi possível concluir.' } }
const loadCurrent = async () => {
  const query = { page: page.value, search: search.value, status: status.value }
  if (activeTab.value === 'dashboard') dashboard.value = await api.adminDashboard()
  else if (activeTab.value === 'posts') currentPage.value = await api.adminPosts(query)
  else if (activeTab.value === 'comments') currentPage.value = await api.adminComments(query)
  else if (activeTab.value === 'users') currentPage.value = await api.adminUsers(query)
  else if (activeTab.value === 'reports') currentPage.value = await api.adminReports(query)
  else if (activeTab.value === 'achievements') currentPage.value = await api.adminAchievements(query)
  else if (activeTab.value === 'quests') currentPage.value = await api.adminQuests(query)
  else if (activeTab.value === 'badges') currentPage.value = await api.adminBadges(query)
  else if (activeTab.value === 'tasks') currentPage.value = await api.adminTasks(query)
  else if (activeTab.value === 'analytics') analyticsData.value = await api.analytics()
  else if (activeTab.value === 'policy') {
    const data:any = await api.policy()
    Object.assign(policyForm, data, { blockedWords:(data.blockedWords||[]).join('\n'),allowedDomains:(data.allowedDomains||[]).join('\n'),blockedDomains:(data.blockedDomains||[]).join('\n') })
  }
}
const reload = async () => { await loadCurrent() }
const selectTab = async (key:string) => { activeTab.value=key; page.value=1; search.value=''; status.value=''; resetCatalog(); await router.replace({ query:{ tab:key } }); await loadCurrent() }
watch(
  () => route.query.tab,
  async (value) => {
    const next = String(value || 'dashboard')
    if (activeTab.value === next) return
    activeTab.value = next
    page.value = 1
    search.value = ''
    status.value = ''
    resetCatalog()
    await loadCurrent()
  }
)
const changePage = async (value:number) => { page.value=value; await loadCurrent() }
const contentAction = (id:string,action:string) => { const reason=askReason(); if(reason) run(() => api.adminPostAction(id,{action,reason})) }
const commentAction = (id:string,action:string) => { const reason=askReason(); if(reason) run(() => api.adminCommentAction(id,{action,reason})) }
const editPost = (row:any) => { const content=window.prompt('Novo conteúdo:',row.content); const reason=askReason(); if(content&&reason) run(() => api.adminPostAction(row.id,{action:'EDIT',content,title:row.title,reason})) }
const moderate = (id:string,type:string) => { const reason=askReason(); if(!reason)return; const expiresAt=['SOCIAL_SUSPENSION','POST_BLOCK','COMMENT_BLOCK','MESSAGE_LIMIT','REACH_LIMIT'].includes(type) ? window.prompt('Expira em (ISO, opcional):') : undefined; run(() => api.adminModerateUser(id,{type,reason,expiresAt})) }
const restoreUser = (id:string) => { const reason=askReason(); if(reason) run(() => api.adminRestoreUser(id,reason)) }
const reportAction = (id:string,nextStatus:string) => { const reason=askReason(); if(reason) run(() => api.adminReportAction(id,{status:nextStatus,reason})) }
const resetCatalog = () => { catalogEditingId.value=null; Object.assign(catalogForm,{name:'',description:'',category:'',rarity:'COMMON',points:0,objectiveText:'',rewardText:'',startsAt:'',endsAt:'',imageUrl:'',maxGrants:null,validDays:null}) }
const beginCatalogEdit = (row:any) => { catalogEditingId.value=row.id; Object.assign(catalogForm,row,{objectiveText:row.objective?.description||'',rewardText:row.reward?.description||'',startsAt:row.startsAt?.slice(0,16)||'',endsAt:row.endsAt?.slice(0,16)||''}) }
const saveCatalog = async () => {
  if(activeTab.value==='achievements') await run(() => api.saveAchievement(catalogEditingId.value,{...catalogForm,isActive:false}), 'Conquista salva.')
  else if(activeTab.value==='quests') await run(() => api.saveQuest(catalogEditingId.value,{...catalogForm,objective:{description:catalogForm.objectiveText},reward:{description:catalogForm.rewardText},status:'DRAFT'}), 'Quest salva.')
  else await run(() => api.saveBadge(catalogEditingId.value,{...catalogForm,isActive:true}), 'Badge salvo.')
  resetCatalog()
}
const catalogAction = (id:string,action:string) => { const reason=askReason(); if(!reason)return; const call=activeTab.value==='achievements' ? api.achievementAction(id,action,reason) : api.questAction(id,action,reason); run(() => call) }
const grant = (id:string,kind:string) => { const accountId=window.prompt('ID da conta:'); const reason=askReason(); if(!accountId||!reason)return; run(() => kind==='achievement' ? api.grantAchievement(id,{accountId,reason}) : api.grantBadge(id,{accountId,reason})) }
const revokeBadge = (id:string) => { const accountId=window.prompt('ID da conta:'); const reason=askReason(); if(accountId&&reason) run(() => api.revokeBadge(id,accountId,reason)) }
const loadParticipants = async (quest:any) => { selectedQuest.value=quest; participants.value=await api.questParticipants(quest.id) }
const updateParticipant = (participant:any) => { const value=window.prompt('Progresso entre 0 e 100:',String(participant.progress)); const reason=askReason(); if(value!==null&&reason) run(async () => { await api.updateQuestProgress(selectedQuest.value.id,participant.accountId,{progress:Number(value),completed:Number(value)>=100,reason}); participants.value=await api.questParticipants(selectedQuest.value.id) },'Progresso atualizado.') }
const validateReward = (participant:any) => { const reason=askReason(); if(reason) run(async () => { await api.validateQuestReward(selectedQuest.value.id,participant.accountId,reason); participants.value=await api.questParticipants(selectedQuest.value.id) },'Recompensa validada.') }
const savePolicy = () => run(() => api.updatePolicy({...policyForm,blockedWords:policyForm.blockedWords.split('\n').filter(Boolean),allowedDomains:policyForm.allowedDomains.split('\n').filter(Boolean),blockedDomains:policyForm.blockedDomains.split('\n').filter(Boolean)}),'Regras salvas.')
const createTask = () => { const title=window.prompt('Título da tarefa:'); const description=window.prompt('Descrição:'); if(title) run(() => api.saveTask(null,{title,description,entityType:'COMMUNITY',status:'PENDING',priority:'NORMAL'})) }
const editTask = (row:any) => { const statusValue=window.prompt('Status:',row.status); if(statusValue) run(() => api.saveTask(row.id,{...row,status:statusValue})) }
onMounted(loadCurrent)
</script>

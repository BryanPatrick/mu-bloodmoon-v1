<template>
  <section class="guild-tabs">
    <nav role="tablist" aria-label="Seções da guilda">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.key"
        :class="{ 'is-active': activeTab === tab.key }"
        @click="selectTab(tab.key)"
      >
        <component :is="tab.icon" class="size-4" />
        {{ tab.label }}
        <span v-if="tab.preview" class="guild-tabs__soon">Preview</span>
      </button>
    </nav>

    <div class="guild-tabs__panel">
      <!-- Visão Geral -->
      <div v-if="activeTab === 'overview'" class="guild-tab-overview">
        <p>{{ guild.description || 'Esta guilda ainda não escreveu uma descrição.' }}</p>

        <div v-if="!myMembership" class="guild-join-box">
          <template v-if="!user">
            <p>Entre na sua conta para solicitar participação nesta guilda.</p>
            <NuxtLink to="/login" class="guild-btn">Entrar</NuxtLink>
          </template>
          <template v-else-if="guild.recruitment === 'CLOSED'">
            <p>O recrutamento desta guilda está fechado no momento.</p>
          </template>
          <template v-else-if="guild.recruitment === 'INVITE_ONLY'">
            <p>Esta guilda aceita apenas convites de membros atuais.</p>
          </template>
          <template v-else>
            <label>Personagem</label>
            <select v-model="joinCharacterId">
              <option value="" disabled>Selecione um personagem</option>
              <option v-for="character in myCharacters" :key="character.id" :value="character.id">{{ character.name }} ({{ character.className }})</option>
            </select>
            <textarea v-model="joinMessage" rows="2" placeholder="Mensagem (opcional)" />
            <button type="button" class="guild-btn" :disabled="!joinCharacterId || joining" @click="submitJoin">
              {{ guild.recruitment === 'OPEN' ? 'Entrar na guilda' : 'Solicitar entrada' }}
            </button>
            <p v-if="joinError" class="guild-error">{{ joinError }}</p>
          </template>
        </div>
        <div v-else class="guild-join-box">
          <p>Você é <strong>{{ roleLabel(myMembership.roleKey) }}</strong> nesta guilda.</p>
          <button type="button" class="guild-btn is-outline" :disabled="leaving" @click="submitLeave">Sair da guilda</button>
          <p v-if="leaveError" class="guild-error">{{ leaveError }}</p>
        </div>

        <div v-if="canManage && pendingJoinRequests.length" class="guild-pending-requests">
          <p class="bm-kicker">Solicitações pendentes</p>
          <article v-for="request in pendingJoinRequests" :key="request.id">
            <span>{{ request.character?.name }} <small>@{{ request.account?.username }}</small></span>
            <p v-if="request.message">{{ request.message }}</p>
            <div class="guild-pending-requests__actions">
              <button type="button" @click="decideJoinRequest(request.id, 'approve')">Aprovar</button>
              <button type="button" class="is-outline" @click="decideJoinRequest(request.id, 'reject')">Rejeitar</button>
            </div>
          </article>
        </div>
      </div>

      <!-- Membros -->
      <div v-else-if="activeTab === 'members'" class="guild-tab-members">
        <div v-if="loading.members" class="guild-tab-empty">Carregando membros...</div>
        <table v-else-if="members.length">
          <thead><tr><th>Personagem</th><th>Papel</th><th>XP</th><th>Contribuição</th><th v-if="canManage"></th></tr></thead>
          <tbody>
            <tr v-for="member in members" :key="member.id">
              <td>{{ member.character?.name }} <small>@{{ member.account?.username }}</small></td>
              <td><span class="guild-role-badge" :class="`is-${member.roleKey?.toLowerCase()}`">{{ roleLabel(member.roleKey) }}</span></td>
              <td>{{ member.memberXp }}</td>
              <td>{{ member.contributionScore }}</td>
              <td v-if="canManage && member.roleKey !== 'LEADER'">
                <button type="button" class="guild-link-btn" @click="promptKick(member)">Remover</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="guild-tab-empty">Nenhum membro encontrado.</p>
      </div>

      <!-- Guild Level -->
      <div v-else-if="activeTab === 'level'" class="guild-tab-text">
        <p class="bm-kicker">Progressão da guilda</p>
        <h2>Nível {{ guild.guildLevel }} · {{ guild.guildXp }} Guild XP</h2>
        <p>O Guild Level representa a progressão coletiva da organização, separada da experiência pessoal de cada membro. Os limiares de cada nível são configurados pela administração e ainda não possuem números de balanceamento definitivos.</p>
      </div>

      <!-- Guild XP -->
      <div v-else-if="activeTab === 'xp'" class="guild-tab-text">
        <p class="bm-kicker">Guild XP</p>
        <h2>Como a guilda evolui</h2>
        <p>Depositar recursos na Tesouraria nunca gera Guild XP automaticamente. A única forma prevista de conversão é através de um <strong>Resource Sink</strong> irreversível e auditado — recursos são destruídos em troca de um valor fixo de Guild XP.</p>
        <p><em>Esta conversão ainda não foi implementada nesta etapa.</em> Nenhuma regra está ativa.</p>
      </div>

      <!-- Requests -->
      <div v-else-if="activeTab === 'requests'" class="guild-tab-requests">
        <form v-if="myMembership" class="guild-inline-form" @submit.prevent="submitRequest">
          <select v-model="requestForm.type">
            <option value="ITEM">Item</option>
            <option value="JEWEL">Jewel</option>
            <option value="ZEN">Zen</option>
            <option value="WCOIN">WCoin</option>
            <option value="EQUIPMENT">Equipamento</option>
            <option value="LOOKING_FOR_ITEM">Procurando item</option>
            <option value="OTHER">Outro</option>
          </select>
          <input v-model="requestForm.title" type="text" placeholder="Título" maxlength="191">
          <button type="submit" class="guild-btn" :disabled="!requestForm.title">Criar solicitação</button>
        </form>
        <div v-if="loading.requests" class="guild-tab-empty">Carregando solicitações...</div>
        <article v-for="item in requests" v-else :key="item.id" class="guild-list-item">
          <header><strong>{{ item.title }}</strong><span class="guild-status-badge">{{ item.status }}</span></header>
          <p v-if="item.description">{{ item.description }}</p>
          <p v-if="item.disclaimer" class="guild-disclaimer">{{ item.disclaimer }}</p>
        </article>
        <p v-if="!loading.requests && !requests.length" class="guild-tab-empty">Nenhuma solicitação registrada ainda.</p>
      </div>

      <!-- Projects -->
      <div v-else-if="activeTab === 'projects'" class="guild-tab-requests">
        <form v-if="canManage" class="guild-inline-form" @submit.prevent="submitProject">
          <input v-model="projectForm.title" type="text" placeholder="Título do projeto" maxlength="191">
          <button type="submit" class="guild-btn" :disabled="!projectForm.title">Criar projeto</button>
        </form>
        <div v-if="loading.projects" class="guild-tab-empty">Carregando projetos...</div>
        <article v-for="item in projects" v-else :key="item.id" class="guild-list-item">
          <header><strong>{{ item.title }}</strong><span class="guild-status-badge">{{ item.status }}</span></header>
          <p v-if="item.description">{{ item.description }}</p>
          <p v-if="item.goal" class="guild-project-goal">Meta: {{ item.goal }}</p>
        </article>
        <p v-if="!loading.projects && !projects.length" class="guild-tab-empty">Nenhum projeto planejado ainda.</p>
      </div>

      <!-- Treasury (Tier B) -->
      <div v-else-if="activeTab === 'treasury'" class="guild-tab-treasury">
        <p class="guild-tier-note">Dados reais e auditáveis, mas nenhuma movimentação é possível nesta etapa. Depósito nunca gera Guild XP.</p>
        <div v-if="loading.treasury" class="guild-tab-empty">Carregando tesouraria...</div>
        <table v-else-if="treasuryBalances.length">
          <thead><tr><th>Recurso</th><th>Disponível</th><th>Reservado</th></tr></thead>
          <tbody>
            <tr v-for="balance in treasuryBalances" :key="balance.id">
              <td>{{ balance.resourceKey }}</td>
              <td>{{ balance.availableAmount }}</td>
              <td>{{ balance.reservedAmount }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Vault (Tier B) -->
      <div v-else-if="activeTab === 'vault'" class="guild-tab-treasury">
        <p class="guild-tier-note">Cofre real e auditável, ainda sem itens e sem movimentação nesta etapa.</p>
        <div v-if="loading.vault" class="guild-tab-empty">Carregando cofre...</div>
        <p v-else-if="!vaultItems.length" class="guild-tab-empty">O cofre desta guilda está vazio.</p>
      </div>

      <!-- Tier C previews -->
      <GuildPlaceholderView v-else-if="activeTab === 'feed'" title="Feed da Guilda" description="O feed exclusivo da guilda ainda não está conectado às publicações da comunidade." />
      <GuildPlaceholderView v-else-if="activeTab === 'events'" title="Eventos da Guilda" description="Calendário de eventos internos (Castle Siege, caças, treinos) chegará em uma próxima etapa." />
      <GuildPlaceholderView v-else-if="activeTab === 'guides'" title="Guias da Guilda" description="Espaço para guias e estratégias compartilhadas entre os membros." />
      <div v-else-if="activeTab === 'achievements'" class="guild-tab-text">
        <p class="bm-kicker">Conquistas dos membros</p>
        <p>Conquistas individuais ainda não foram conectadas ao perfil da guilda.</p>
        <p class="bm-kicker" style="margin-top:16px">Conquistas da guilda</p>
        <p>Conquistas coletivas (marcos, eventos, temporadas) ainda não possuem um motor de regras.</p>
      </div>
      <GuildPlaceholderView v-else-if="activeTab === 'statistics'" title="Estatísticas da Guilda" description="Analytics de atividade, PvP e progressão ainda não foram construídos." />
      <div v-else-if="activeTab === 'alliance'" class="guild-tab-text">
        <span class="guild-tabs__soon" style="margin-bottom:10px;display:inline-flex">Em breve</span>
        <h2>Alianças entre guildas</h2>
        <p>No futuro, múltiplas guildas poderão formar uma Aliança com eventos, projetos e fila de recrutamento compartilhados — mantendo Cofre, Tesouraria, Tesoureiro e permissões próprios de cada guilda.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  Award, BookOpen, Calendar, ChartColumn, Coins, Handshake,
  Info, MessagesSquare, Package, TrendingUp, Users
} from 'lucide-vue-next'

const props = defineProps<{ guild: Record<string, any>, slug: string }>()
const emit = defineEmits<{ refresh: [] }>()

const route = useRoute()
const router = useRouter()
const api = useGuildsApi()
const charactersApi = useCharactersApi()
const { user } = useAuth()

const tabs = [
  { key: 'overview', label: 'Visão Geral', icon: Info },
  { key: 'members', label: 'Membros', icon: Users },
  { key: 'level', label: 'Guild Level', icon: TrendingUp },
  { key: 'xp', label: 'Guild XP', icon: Award },
  { key: 'requests', label: 'Solicitações', icon: Package },
  { key: 'projects', label: 'Projetos', icon: ChartColumn },
  { key: 'treasury', label: 'Tesouraria', icon: Coins, preview: true },
  { key: 'vault', label: 'Cofre', icon: Package, preview: true },
  { key: 'feed', label: 'Feed', icon: MessagesSquare, preview: true },
  { key: 'events', label: 'Eventos', icon: Calendar, preview: true },
  { key: 'guides', label: 'Guias', icon: BookOpen, preview: true },
  { key: 'achievements', label: 'Conquistas', icon: Award, preview: true },
  { key: 'statistics', label: 'Estatísticas', icon: ChartColumn, preview: true },
  { key: 'alliance', label: 'Alianças', icon: Handshake, preview: true }
] as const

const activeTab = ref((route.query.tab as string) || 'overview')
const selectTab = (key: string) => {
  activeTab.value = key
  router.replace({ query: { ...route.query, tab: key } })
}

const myMembership = computed(() => props.guild.members?.find((member: any) => member.account?.id === user.value?.id))
const canManage = computed(() => ['LEADER', 'OFFICER'].includes(myMembership.value?.roleKey))

const roleLabel = (key: string) => ({
  LEADER: 'Líder', OFFICER: 'Oficial', TREASURER: 'Tesoureiro', MEMBER: 'Membro', RECRUIT: 'Recruta'
} as Record<string, string>)[key] || key

const loading = reactive({ members: false, requests: false, projects: false, treasury: false, vault: false })
const members = ref<any[]>([])
const requests = ref<any[]>([])
const projects = ref<any[]>([])
const treasuryBalances = ref<any[]>([])
const vaultItems = ref<any[]>([])
const pendingJoinRequests = ref<any[]>([])
const loaded = new Set<string>()

const loadTab = async (key: string) => {
  if (loaded.has(key)) return
  if (key === 'members') {
    loading.members = true
    try { members.value = (await api.members(props.slug, { pageSize: 100 })).data } finally { loading.members = false }
  } else if (key === 'requests') {
    loading.requests = true
    try { requests.value = (await api.requests(props.slug, { pageSize: 50 })).data } finally { loading.requests = false }
  } else if (key === 'projects') {
    loading.projects = true
    try { projects.value = (await api.projects(props.slug, { pageSize: 50 })).data } finally { loading.projects = false }
  } else if (key === 'treasury') {
    loading.treasury = true
    try { treasuryBalances.value = (await api.treasury(props.slug)).balances } finally { loading.treasury = false }
  } else if (key === 'vault') {
    loading.vault = true
    try { vaultItems.value = (await api.vault(props.slug)).items } finally { loading.vault = false }
  } else {
    return
  }
  loaded.add(key)
}

watch(activeTab, (key) => loadTab(key), { immediate: true })

const refreshPendingJoinRequests = async () => {
  if (!canManage.value) { pendingJoinRequests.value = []; return }
  pendingJoinRequests.value = await api.joinRequests(props.slug).catch(() => [])
}
watch(canManage, refreshPendingJoinRequests, { immediate: true })

const myCharacters = ref<any[]>([])
watchEffect(async () => {
  if (!user.value || myMembership.value) return
  try { myCharacters.value = (await charactersApi.list()).data } catch { myCharacters.value = [] }
})

const joinCharacterId = ref('')
const joinMessage = ref('')
const joining = ref(false)
const joinError = ref('')
const submitJoin = async () => {
  if (!joinCharacterId.value || joining.value) return
  joining.value = true
  joinError.value = ''
  try {
    await api.join(props.slug, { characterId: joinCharacterId.value, message: joinMessage.value })
    emit('refresh')
    joinCharacterId.value = ''
    joinMessage.value = ''
  } catch (err: any) {
    joinError.value = err?.data?.message || 'Não foi possível processar sua entrada nesta guilda.'
  } finally {
    joining.value = false
  }
}

const leaving = ref(false)
const leaveError = ref('')
const submitLeave = async () => {
  if (leaving.value) return
  leaving.value = true
  leaveError.value = ''
  try {
    await api.leave(props.slug)
    emit('refresh')
  } catch (err: any) {
    leaveError.value = err?.data?.message || 'Não foi possível sair da guilda.'
  } finally {
    leaving.value = false
  }
}

const decideJoinRequest = async (id: string, decision: 'approve' | 'reject') => {
  try {
    if (decision === 'approve') await api.approveJoinRequest(props.slug, id)
    else await api.rejectJoinRequest(props.slug, id)
    await refreshPendingJoinRequests()
    emit('refresh')
  } catch { /* surfaced via unchanged list -- best-effort MVP action */ }
}

const promptKick = async (member: any) => {
  const reason = typeof window !== 'undefined' ? window.prompt('Motivo da remoção:') : ''
  if (!reason) return
  try {
    await api.kickMember(props.slug, member.id, { reason })
    loaded.delete('members')
    await loadTab('members')
  } catch { /* best-effort MVP action */ }
}

const requestForm = reactive({ type: 'ITEM', title: '' })
const submitRequest = async () => {
  if (!requestForm.title) return
  await api.createRequest(props.slug, { ...requestForm })
  requestForm.title = ''
  loaded.delete('requests')
  await loadTab('requests')
}

const projectForm = reactive({ title: '' })
const submitProject = async () => {
  if (!projectForm.title) return
  await api.createProject(props.slug, { ...projectForm })
  projectForm.title = ''
  loaded.delete('projects')
  await loadTab('projects')
}
</script>

<style scoped>
.guild-tabs { border: 1px solid var(--bm-border); border-radius: 10px; background: var(--bm-surface-strong); box-shadow: var(--shadow-panel); }
.guild-tabs nav { display: flex; overflow-x: auto; border-bottom: 1px solid var(--bm-border); padding-inline: 8px; }
.guild-tabs nav button { display: flex; flex: none; align-items: center; gap: 7px; min-height: 46px; border-bottom: 2px solid transparent; padding: 0 14px; color: var(--bm-muted); font-size: 0.68rem; font-weight: 900; white-space: nowrap; text-transform: uppercase; background: transparent; }
.guild-tabs nav button.is-active { border-color: var(--bm-red); color: var(--bm-wine); }
.guild-tabs__soon { border-radius: 3px; border: 1px solid var(--bm-border-strong); padding: 1px 5px; margin-left: 2px; font-size: 0.5rem; color: var(--bm-muted); text-transform: uppercase; }
.guild-tabs__panel { padding: 18px; }
.guild-tab-empty { padding: 30px; text-align: center; color: var(--bm-muted); font-size: 0.74rem; }
.guild-tab-text h2 { margin-top: 6px; font-family: Cinzel, serif; font-size: 1.05rem; color: var(--bm-heading); }
.guild-tab-text p { margin-top: 8px; color: var(--bm-muted); font-size: 0.76rem; line-height: 1.65; }
.guild-tab-overview > p { color: var(--bm-muted); font-size: 0.8rem; line-height: 1.65; }
.guild-join-box { display: grid; gap: 8px; margin-top: 16px; max-width: 360px; padding: 14px; border: 1px solid var(--bm-border); border-radius: 8px; background: var(--bm-surface-soft); }
.guild-join-box select, .guild-join-box textarea { border: 1px solid var(--bm-border); border-radius: 4px; background: var(--bm-surface); color: var(--bm-text); padding: 8px; font-size: 0.76rem; }
.guild-btn { display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--bm-red); border-radius: 4px; background: var(--bm-red); color: #fff; padding: 8px 16px; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; text-decoration: none; }
.guild-btn:disabled { opacity: 0.45; }
.guild-btn.is-outline { background: transparent; color: var(--bm-wine); }
.guild-error { color: var(--bm-red); font-size: 0.68rem; }
.guild-pending-requests { margin-top: 20px; display: grid; gap: 8px; }
.guild-pending-requests article { border: 1px solid var(--bm-border); border-radius: 6px; padding: 10px 12px; font-size: 0.74rem; }
.guild-pending-requests__actions { display: flex; gap: 8px; margin-top: 8px; }
.guild-pending-requests__actions button { border: 1px solid var(--bm-border-strong); border-radius: 4px; padding: 4px 10px; font-size: 0.66rem; font-weight: 800; background: var(--bm-red); color: #fff; }
.guild-pending-requests__actions button.is-outline { background: transparent; color: var(--bm-wine); }
table { width: 100%; border-collapse: collapse; font-size: 0.74rem; }
th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--bm-border); }
th { color: var(--bm-muted); text-transform: uppercase; font-size: 0.6rem; }
td small { display: block; color: var(--bm-muted); font-size: 0.62rem; }
.guild-role-badge { border-radius: 3px; border: 1px solid var(--bm-border-strong); padding: 2px 7px; font-size: 0.6rem; font-weight: 800; text-transform: uppercase; }
.guild-role-badge.is-leader { border-color: var(--bm-red); color: var(--bm-red); }
.guild-link-btn { color: var(--bm-red); font-size: 0.68rem; font-weight: 800; background: none; border: none; }
.guild-inline-form { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.guild-inline-form select, .guild-inline-form input { border: 1px solid var(--bm-border); border-radius: 4px; background: var(--bm-surface); color: var(--bm-text); padding: 8px; font-size: 0.76rem; }
.guild-list-item { border: 1px solid var(--bm-border); border-radius: 6px; padding: 12px; margin-bottom: 8px; }
.guild-list-item header { display: flex; justify-content: space-between; align-items: center; }
.guild-list-item p { margin-top: 5px; color: var(--bm-muted); font-size: 0.72rem; }
.guild-disclaimer { font-style: italic; }
.guild-project-goal { font-weight: 700; }
.guild-status-badge { border: 1px solid var(--bm-border-strong); border-radius: 3px; padding: 2px 7px; font-size: 0.58rem; font-weight: 800; color: var(--bm-muted); text-transform: uppercase; }
.guild-tier-note { margin-bottom: 12px; color: var(--bm-muted); font-size: 0.7rem; font-style: italic; }
@media (max-width: 640px) {
  .guild-tabs nav button { min-width: 100px; justify-content: center; }
  table { display: block; overflow-x: auto; }
}
</style>

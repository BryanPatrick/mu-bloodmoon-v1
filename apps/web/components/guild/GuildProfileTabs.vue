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
            <p>Esta guilda aceita apenas convites de membros atuais. Convites recebidos aparecem no seu painel.</p>
          </template>
          <template v-else-if="joinRequested">
            <p class="guild-join-box__pending">Solicitação enviada -- aguardando aprovação de um líder ou oficial.</p>
          </template>
          <template v-else>
            <label>Personagem</label>
            <select v-model="joinCharacterId">
              <option value="" disabled>Selecione um personagem</option>
              <option v-for="character in myCharacters" :key="character.id" :value="character.id">{{ character.name }} ({{ character.class }})</option>
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

        <div v-if="canManage" class="guild-invite-box">
          <p class="bm-kicker">Convidar jogador</p>
          <input
            v-model="inviteSearch"
            type="text"
            placeholder="Buscar personagem por nome..."
            @input="scheduleInviteSearch"
          >
          <p v-if="inviteSearching" class="guild-invite-box__status">Buscando...</p>
          <p v-else-if="inviteSearch.trim().length >= 2 && !inviteResults.length" class="guild-invite-box__status">Nenhum personagem elegível encontrado.</p>
          <ul v-if="inviteResults.length" class="guild-invite-box__results">
            <li v-for="candidate in inviteResults" :key="candidate.id">
              <span>{{ candidate.name }} <small>({{ candidate.className }}, lvl {{ candidate.level }}) @{{ candidate.account?.username }}</small></span>
              <button type="button" :disabled="invitingId === candidate.id" @click="submitInvite(candidate.id)">
                {{ invitingId === candidate.id ? 'Enviando...' : 'Convidar' }}
              </button>
            </li>
          </ul>
          <p v-if="inviteError" class="guild-error">{{ inviteError }}</p>
          <p v-if="inviteSuccess" class="guild-invite-box__success">{{ inviteSuccess }}</p>

          <div v-if="pendingInvites.length" class="guild-pending-requests">
            <p class="bm-kicker">Convites pendentes</p>
            <article v-for="invite in pendingInvites" :key="invite.id">
              <span>{{ invite.character?.name }}</span>
              <div class="guild-pending-requests__actions">
                <button type="button" class="is-outline" :disabled="cancellingInviteId === invite.id" @click="submitCancelInvite(invite.id)">
                  {{ cancellingInviteId === invite.id ? 'Cancelando...' : 'Cancelar convite' }}
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>

      <!-- Membros -->
      <div v-else-if="activeTab === 'members'" class="guild-tab-members">
        <div v-if="loading.members" class="guild-tab-empty">Carregando membros...</div>
        <div v-else-if="tabErrors.members" class="guild-tab-empty">
          <p>{{ tabErrors.members }}</p>
          <button type="button" class="guild-link-btn" @click="retryTab('members')">Tentar novamente</button>
        </div>
        <table v-else-if="members.length" class="guild-members-table">
          <thead><tr><th>Personagem</th><th>Papel</th><th>XP</th><th>Contribuição</th><th v-if="canManage">Ações</th></tr></thead>
          <tbody>
            <tr v-for="member in members" :key="member.id">
              <td data-label="Personagem">{{ member.character?.name }} <small>@{{ member.account?.username }}</small></td>
              <td data-label="Papel"><span class="guild-role-badge" :class="`is-${member.roleKey?.toLowerCase()}`">{{ roleLabel(member.roleKey) }}</span></td>
              <td data-label="XP">{{ member.memberXp }}</td>
              <td data-label="Contribuição">{{ member.contributionScore }}</td>
              <td v-if="canManage" data-label="Ações" class="guild-member-actions">
                <template v-if="canManageMember(member)">
                  <div v-if="kickTarget?.id === member.id" class="guild-member-kick-confirm">
                    <textarea v-model="kickReason" rows="2" placeholder="Motivo da remoção (mín. 3 caracteres)" />
                    <div class="guild-member-kick-confirm__actions">
                      <button type="button" class="guild-link-btn is-danger" :disabled="kickingId === member.id" @click="confirmKick">
                        {{ kickingId === member.id ? 'Removendo...' : 'Confirmar remoção' }}
                      </button>
                      <button type="button" class="guild-link-btn is-quiet" :disabled="kickingId === member.id" @click="cancelKick">Cancelar</button>
                    </div>
                    <p v-if="kickError" class="guild-error">{{ kickError }}</p>
                  </div>
                  <template v-else>
                    <div v-if="isLeader" class="guild-member-actions__role">
                      <select v-model="roleDrafts[member.id]" :disabled="roleChangingId === member.id">
                        <option v-for="option in assignableRoles" :key="option" :value="option">{{ roleLabel(option) }}</option>
                      </select>
                      <button
                        type="button"
                        class="guild-link-btn"
                        :disabled="roleChangingId === member.id || roleDrafts[member.id] === member.roleKey"
                        @click="submitRoleChange(member)"
                      >
                        {{ roleChangingId === member.id ? 'Salvando...' : 'Aplicar' }}
                      </button>
                    </div>
                    <!-- Deliberately outside the role <select>: this is a
                    leadership transfer, not an ordinary role change, and the
                    spec calls for it to read as visibly different/critical
                    rather than buried as just another dropdown option. -->
                    <button v-if="isLeader" type="button" class="guild-transfer-btn" @click="startTransfer(member)">
                      Transferir liderança
                    </button>
                    <button type="button" class="guild-link-btn is-danger" @click="startKick(member)">Remover</button>
                  </template>
                </template>
                <span v-else class="guild-member-actions__none">—</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="guild-tab-empty">Nenhum membro encontrado.</p>
        <p v-if="memberActionError" class="guild-error">{{ memberActionError }}</p>

        <GuildLeadershipTransferModal
          v-if="transferTarget"
          :guild="guild"
          :slug="slug"
          :member="transferTarget"
          @close="transferTarget = null"
          @transferred="onLeadershipTransferred"
        />
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
        <div v-else-if="tabErrors.requests" class="guild-tab-empty">
          <p>{{ tabErrors.requests }}</p>
          <button type="button" class="guild-link-btn" @click="retryTab('requests')">Tentar novamente</button>
        </div>
        <template v-else>
          <article v-for="item in requests" :key="item.id" class="guild-list-item">
            <header><strong>{{ item.title }}</strong><span class="guild-status-badge">{{ item.status }}</span></header>
            <p v-if="item.description">{{ item.description }}</p>
            <p v-if="item.disclaimer" class="guild-disclaimer">{{ item.disclaimer }}</p>
          </article>
          <p v-if="!requests.length" class="guild-tab-empty">Nenhuma solicitação registrada ainda.</p>
        </template>
      </div>

      <!-- Projects -->
      <div v-else-if="activeTab === 'projects'" class="guild-tab-requests">
        <form v-if="canManage" class="guild-inline-form" @submit.prevent="submitProject">
          <input v-model="projectForm.title" type="text" placeholder="Título do projeto" maxlength="191">
          <button type="submit" class="guild-btn" :disabled="!projectForm.title">Criar projeto</button>
        </form>
        <div v-if="loading.projects" class="guild-tab-empty">Carregando projetos...</div>
        <div v-else-if="tabErrors.projects" class="guild-tab-empty">
          <p>{{ tabErrors.projects }}</p>
          <button type="button" class="guild-link-btn" @click="retryTab('projects')">Tentar novamente</button>
        </div>
        <template v-else>
          <article v-for="item in projects" :key="item.id" class="guild-list-item">
            <header><strong>{{ item.title }}</strong><span class="guild-status-badge">{{ item.status }}</span></header>
            <p v-if="item.description">{{ item.description }}</p>
            <p v-if="item.goal" class="guild-project-goal">Meta: {{ item.goal }}</p>
          </article>
          <p v-if="!projects.length" class="guild-tab-empty">Nenhum projeto planejado ainda.</p>
        </template>
      </div>

      <!-- Treasury (Tier B) -->
      <div v-else-if="activeTab === 'treasury'" class="guild-tab-treasury">
        <p class="guild-tier-note">Dados reais e auditáveis, mas nenhuma movimentação é possível nesta etapa. Depósito nunca gera Guild XP.</p>
        <div v-if="loading.treasury" class="guild-tab-empty">Carregando tesouraria...</div>
        <div v-else-if="tabErrors.treasury" class="guild-tab-empty">
          <p>{{ tabErrors.treasury }}</p>
          <button type="button" class="guild-link-btn" @click="retryTab('treasury')">Tentar novamente</button>
        </div>
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
        <!-- Guild Step 5 audit finding: this branch had no fallback at all --
        every guild is seeded with 7 balance rows at creation, so it never
        fires in practice, but a genuinely empty treasury rendered nothing,
        not even a message. -->
        <p v-else class="guild-tab-empty">Nenhum saldo registrado ainda.</p>
      </div>

      <!-- Vault (Tier B) -->
      <div v-else-if="activeTab === 'vault'" class="guild-tab-treasury">
        <p class="guild-tier-note">Cofre real e auditável, ainda sem itens e sem movimentação nesta etapa.</p>
        <div v-if="loading.vault" class="guild-tab-empty">Carregando cofre...</div>
        <div v-else-if="tabErrors.vault" class="guild-tab-empty">
          <p>{{ tabErrors.vault }}</p>
          <button type="button" class="guild-link-btn" @click="retryTab('vault')">Tentar novamente</button>
        </div>
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
// Guild Step 5 audit finding: the previous try/finally (no catch) per tab
// silently cleared the loading flag on a fetch failure and left the panel
// blank -- indistinguishable from a real empty state, with no way to retry
// short of switching tabs away and back. Centralized here so every tab gets
// the same load/error/retry contract instead of five near-duplicate blocks.
const tabErrors = reactive<Record<string, string>>({ members: '', requests: '', projects: '', treasury: '', vault: '' })
const TAB_LOADERS: Record<string, { load: () => Promise<any>, assign: (data: any) => void }> = {
  members: { load: () => api.members(props.slug, { pageSize: 100 }), assign: (data) => { members.value = data.data } },
  requests: { load: () => api.requests(props.slug, { pageSize: 50 }), assign: (data) => { requests.value = data.data } },
  projects: { load: () => api.projects(props.slug, { pageSize: 50 }), assign: (data) => { projects.value = data.data } },
  treasury: { load: () => api.treasury(props.slug), assign: (data) => { treasuryBalances.value = data.balances } },
  vault: { load: () => api.vault(props.slug), assign: (data) => { vaultItems.value = data.items } }
}

const loadTab = async (key: string) => {
  if (loaded.has(key)) return
  const loader = TAB_LOADERS[key]
  if (!loader) return
  loading[key as keyof typeof loading] = true
  tabErrors[key] = ''
  try {
    loader.assign(await loader.load())
    loaded.add(key)
  } catch (err: any) {
    tabErrors[key] = err?.data?.message || 'Não foi possível carregar esta seção.'
  } finally {
    loading[key as keyof typeof loading] = false
  }
}
const retryTab = (key: string) => { loaded.delete(key); loadTab(key) }

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
// join() returns { status: 'JOINED' | 'REQUESTED', ... } -- OPEN recruitment
// resolves immediately into a real membership (the parent's refresh() picks
// that up via myMembership, switching this box to the "you are a member"
// branch on its own), but APPROVAL_REQUIRED only ever creates a pending
// GuildJoinRequest with no membership to reflect -- without this flag the
// box would silently reset back to the exact same "select a character" form
// after a successful submission, indistinguishable from having done nothing.
const joinRequested = ref(false)
const submitJoin = async () => {
  if (!joinCharacterId.value || joining.value) return
  joining.value = true
  joinError.value = ''
  try {
    const result = await api.join(props.slug, { characterId: joinCharacterId.value, message: joinMessage.value }) as any
    emit('refresh')
    joinCharacterId.value = ''
    joinMessage.value = ''
    if (result?.status === 'REQUESTED') joinRequested.value = true
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

const pendingInvites = ref<any[]>([])
const refreshPendingInvites = async () => {
  if (!canManage.value) { pendingInvites.value = []; return }
  pendingInvites.value = await api.guildInvites(props.slug).catch(() => [])
}
watch(canManage, refreshPendingInvites, { immediate: true })

const inviteSearch = ref('')
const inviteResults = ref<any[]>([])
const inviteSearching = ref(false)
const inviteError = ref('')
const inviteSuccess = ref('')
const invitingId = ref('')
const cancellingInviteId = ref('')
let inviteSearchTimer: ReturnType<typeof setTimeout> | undefined

const runInviteSearch = async () => {
  const term = inviteSearch.value.trim()
  inviteError.value = ''
  inviteSuccess.value = ''
  if (term.length < 2) { inviteResults.value = []; inviteSearching.value = false; return }
  inviteSearching.value = true
  try {
    inviteResults.value = await api.inviteCandidates(props.slug, term)
  } catch {
    inviteResults.value = []
  } finally {
    inviteSearching.value = false
  }
}
// Debounced search-as-you-type: avoids firing a request per keystroke while
// still feeling immediate (300ms is imperceptible as a delay but collapses
// a burst of keystrokes into one request).
const scheduleInviteSearch = () => {
  if (inviteSearchTimer) clearTimeout(inviteSearchTimer)
  inviteSearchTimer = setTimeout(runInviteSearch, 300)
}

const submitInvite = async (characterId: string) => {
  if (invitingId.value) return
  invitingId.value = characterId
  inviteError.value = ''
  inviteSuccess.value = ''
  try {
    await api.inviteToGuild(props.slug, { characterId })
    inviteSuccess.value = 'Convite enviado.'
    inviteResults.value = inviteResults.value.filter((candidate) => candidate.id !== characterId)
    await refreshPendingInvites()
  } catch (err: any) {
    inviteError.value = err?.data?.message || 'Não foi possível enviar o convite.'
  } finally {
    invitingId.value = ''
  }
}

const submitCancelInvite = async (id: string) => {
  if (cancellingInviteId.value) return
  cancellingInviteId.value = id
  try {
    await api.cancelInvite(props.slug, id)
    await refreshPendingInvites()
  } catch { /* best-effort MVP action, list stays unchanged on failure */ } finally {
    cancellingInviteId.value = ''
  }
}

// Backend authority: updateMemberRole (guilds.service.ts) is LEADER-only --
// stricter than kickMember, which also allows OFFICER. isLeader mirrors that
// exactly rather than reusing canManage, so an OFFICER never sees a role
// control that would just 403 on submit.
const isLeader = computed(() => myMembership.value?.roleKey === 'LEADER')

// A member row only shows an actions menu when there is something the
// acting user is actually authorized to do -- never a disabled control with
// no explanation. Both role changes and kicks are backend-blocked against
// the LEADER row (kicking the leader is rejected outright; changing the
// leader's own role away from LEADER is a leadership-transfer action
// reserved for a future step), and self-service actions belong to "Sair da
// guilda" above, not this menu.
const canManageMember = (member: any) => member.roleKey !== 'LEADER' && member.id !== myMembership.value?.id

// Never includes LEADER: promoting a member to LEADER is a leadership
// transfer (guilds.service.ts treats it as one, demoting the prior leader
// in the same transaction), explicitly deferred to a later step. Hiding it
// here, not just relying on the backend to reject it, keeps the control
// itself from implying an action this step doesn't support.
const assignableRoles = ['OFFICER', 'TREASURER', 'MEMBER', 'RECRUIT']
const roleDrafts = reactive<Record<string, string>>({})
watch(members, (list) => {
  const next: Record<string, string> = {}
  for (const member of list) next[member.id] = assignableRoles.includes(member.roleKey) ? member.roleKey : 'MEMBER'
  Object.assign(roleDrafts, next)
}, { immediate: true })

const roleChangingId = ref('')
const memberActionError = ref('')
const submitRoleChange = async (member: any) => {
  const nextRole = roleDrafts[member.id]
  if (!nextRole || nextRole === member.roleKey || roleChangingId.value) return
  roleChangingId.value = member.id
  memberActionError.value = ''
  try {
    await api.updateMemberRole(props.slug, member.id, { roleKey: nextRole })
    loaded.delete('members')
    await loadTab('members')
  } catch (err: any) {
    memberActionError.value = err?.data?.message || 'Não foi possível alterar o papel deste membro.'
    roleDrafts[member.id] = member.roleKey
  } finally {
    roleChangingId.value = ''
  }
}

const kickTarget = ref<any>(null)
const kickReason = ref('')
const kickingId = ref('')
const kickError = ref('')
const startKick = (member: any) => {
  kickTarget.value = member
  kickReason.value = ''
  kickError.value = ''
}
const cancelKick = () => {
  kickTarget.value = null
  kickReason.value = ''
  kickError.value = ''
}
const confirmKick = async () => {
  if (!kickTarget.value || kickingId.value) return
  const reason = kickReason.value.trim()
  if (reason.length < 3) { kickError.value = 'Informe um motivo (mínimo 3 caracteres).'; return }
  kickingId.value = kickTarget.value.id
  kickError.value = ''
  try {
    await api.kickMember(props.slug, kickTarget.value.id, { reason })
    kickTarget.value = null
    kickReason.value = ''
    loaded.delete('members')
    await loadTab('members')
  } catch (err: any) {
    kickError.value = err?.data?.message || 'Não foi possível remover este membro.'
  } finally {
    kickingId.value = ''
  }
}

const transferTarget = ref<any>(null)
const startTransfer = (member: any) => { transferTarget.value = member }
// The modal itself calls the API; this only runs on confirmed success. Two
// refreshes, not one: loadTab('members') re-pulls the member list (role
// badges update immediately), and emit('refresh') re-pulls the parent's
// whole `guild` object -- which is what myMembership/isLeader/canManage are
// computed from here, and what gates the "Editar perfil" button and
// GuildProfileHeader's own canManage prop up in [slug].vue. Without the
// second refresh, an ex-leader would keep seeing LEADER-only controls (the
// role select, the transfer button itself) until an unrelated page reload --
// exactly the stale-privileged-UI state this step rules out.
const onLeadershipTransferred = async () => {
  loaded.delete('members')
  await loadTab('members')
  emit('refresh')
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
.guild-join-box__pending { color: #1f8a4c; font-size: 0.76rem; font-weight: 700; }
.guild-pending-requests { margin-top: 20px; display: grid; gap: 8px; }
.guild-pending-requests article { border: 1px solid var(--bm-border); border-radius: 6px; padding: 10px 12px; font-size: 0.74rem; }
.guild-pending-requests__actions { display: flex; gap: 8px; margin-top: 8px; }
.guild-pending-requests__actions button { border: 1px solid var(--bm-border-strong); border-radius: 4px; padding: 4px 10px; font-size: 0.66rem; font-weight: 800; background: var(--bm-red); color: #fff; }
.guild-pending-requests__actions button.is-outline { background: transparent; color: var(--bm-wine); }
.guild-invite-box { margin-top: 20px; display: grid; gap: 8px; max-width: 420px; padding: 14px; border: 1px solid var(--bm-border); border-radius: 8px; background: var(--bm-surface-soft); }
.guild-invite-box > input { border: 1px solid var(--bm-border); border-radius: 4px; background: var(--bm-surface); color: var(--bm-text); padding: 8px; font-size: 0.76rem; }
.guild-invite-box__status { color: var(--bm-muted); font-size: 0.68rem; }
.guild-invite-box__success { color: #1f8a4c; font-size: 0.68rem; font-weight: 800; }
.guild-invite-box__results { display: grid; gap: 6px; }
.guild-invite-box__results li { display: flex; align-items: center; justify-content: space-between; gap: 8px; border: 1px solid var(--bm-border); border-radius: 6px; padding: 7px 10px; font-size: 0.72rem; }
.guild-invite-box__results li small { display: block; color: var(--bm-muted); font-size: 0.62rem; }
.guild-invite-box__results li button { flex: none; border: 1px solid var(--bm-border-strong); border-radius: 4px; padding: 4px 10px; font-size: 0.64rem; font-weight: 800; background: var(--bm-red); color: #fff; }
.guild-invite-box__results li button:disabled { opacity: 0.5; }
table { width: 100%; border-collapse: collapse; font-size: 0.74rem; }
th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--bm-border); }
th { color: var(--bm-muted); text-transform: uppercase; font-size: 0.6rem; }
td small { display: block; color: var(--bm-muted); font-size: 0.62rem; }
.guild-role-badge { border-radius: 3px; border: 1px solid var(--bm-border-strong); padding: 2px 7px; font-size: 0.6rem; font-weight: 800; text-transform: uppercase; }
.guild-role-badge.is-leader { border-color: var(--bm-red); color: var(--bm-red); }
.guild-link-btn { color: var(--bm-wine); font-size: 0.68rem; font-weight: 800; background: none; border: none; }
.guild-link-btn.is-quiet { color: var(--bm-muted); }
/* Reserved for destructive actions only (Remover, Confirmar remoção) --
   the plain .guild-link-btn base above is neutral on purpose so it stays
   usable for benign actions (Aplicar, Tentar novamente) without those
   reading as dangerous alongside the ones that actually are. */
.guild-link-btn.is-danger { color: var(--bm-red); }
.guild-link-btn:disabled { opacity: 0.5; }
.guild-member-actions { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.guild-member-actions__role { display: flex; align-items: center; gap: 6px; }
.guild-member-actions__role select { border: 1px solid var(--bm-border); border-radius: 4px; background: var(--bm-surface); color: var(--bm-text); padding: 4px 6px; font-size: 0.66rem; }
.guild-member-actions__none { color: var(--bm-muted); }
/* Visually distinct from .guild-link-btn (plain text links used for Aplicar/
   Remover) on purpose: a leadership transfer is a different class of action,
   and margin-top plus its own bordered/filled treatment keeps it from
   sitting flush against Remover, where a mistap on mobile would be costly. */
.guild-transfer-btn { margin-top: 4px; border: 1px solid var(--bm-red); border-radius: 4px; background: transparent; padding: 5px 10px; color: var(--bm-red); font-size: 0.64rem; font-weight: 900; text-transform: uppercase; }
.guild-transfer-btn:hover { background: var(--bm-red); color: #fff; }
.guild-member-kick-confirm { display: grid; gap: 6px; width: min(260px, 100%); }
.guild-member-kick-confirm textarea { border: 1px solid var(--bm-border); border-radius: 4px; background: var(--bm-surface); color: var(--bm-text); padding: 6px 8px; font-size: 0.7rem; resize: vertical; }
.guild-member-kick-confirm__actions { display: flex; gap: 10px; }
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
  /* Members specifically: a horizontally-scrolled table is still an
     illegible table on a phone. Reflow into stacked cards instead -- one
     <tr> per member, each <td> a labeled row via its own data-label. */
  .guild-members-table { display: block; overflow-x: visible; }
  .guild-members-table thead { display: none; }
  .guild-members-table tbody { display: block; }
  .guild-members-table tr { display: block; margin-bottom: 10px; border: 1px solid var(--bm-border); border-radius: 8px; padding: 10px 12px; }
  .guild-members-table td { display: flex; align-items: center; justify-content: space-between; gap: 10px; border-bottom: none; padding: 5px 0; }
  .guild-members-table td::before { content: attr(data-label); flex: none; color: var(--bm-muted); font-size: 0.58rem; font-weight: 900; text-transform: uppercase; }
  .guild-members-table td.guild-member-actions { flex-direction: column; align-items: stretch; }
  .guild-members-table td.guild-member-actions::before { margin-bottom: 2px; }
}
</style>

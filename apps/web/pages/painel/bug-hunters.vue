<template>
  <ManagementShell>
    <section class="grid gap-5">
      <header class="border-b border-white/10 pb-5">
        <p class="bm-kicker">Bug Hunters</p>
        <h1 class="mt-2 font-display text-3xl font-black uppercase">Relatar um problema</h1>
        <p class="mt-2 max-w-2xl text-sm font-semibold text-white/60">
          Conte o que aconteceu com o maximo de detalhe possivel -- isso ajuda a equipe a reproduzir e corrigir mais rapido.
          Enviar um relato nao garante recompensa; recompensas de Bug Hunter sao avaliadas separadamente pela equipe.
        </p>
      </header>

      <form v-if="!selected" class="bm-panel grid gap-3 rounded-md p-4" @submit.prevent="submit">
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="grid gap-1 text-sm">
            <span class="font-bold text-white/70">Categoria</span>
            <select v-model="form.category" class="bm-admin-field" required>
              <option value="" disabled>Selecione</option>
              <option v-for="c in categories" :key="c" :value="c">{{ categoryLabels[c] }}</option>
            </select>
          </label>
          <label class="grid gap-1 text-sm">
            <span class="font-bold text-white/70">Severidade percebida por voce</span>
            <select v-model="form.playerSeverity" class="bm-admin-field" required>
              <option value="" disabled>Selecione</option>
              <option v-for="s in severities" :key="s" :value="s">{{ severityLabels[s] }}</option>
            </select>
          </label>
        </div>

        <label class="grid gap-1 text-sm">
          <span class="font-bold text-white/70">Titulo</span>
          <input v-model="form.title" class="bm-admin-field" maxlength="191" minlength="4" placeholder="Resumo curto do problema" required>
        </label>
        <label class="grid gap-1 text-sm">
          <span class="font-bold text-white/70">Descricao</span>
          <textarea v-model="form.description" class="bm-admin-field min-h-24" minlength="10" placeholder="O que aconteceu?" required/>
        </label>
        <label class="grid gap-1 text-sm">
          <span class="font-bold text-white/70">Passos para reproduzir</span>
          <textarea v-model="form.stepsToReproduce" class="bm-admin-field min-h-20" minlength="5" placeholder="1. ... 2. ... 3. ..." required/>
        </label>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="grid gap-1 text-sm">
            <span class="font-bold text-white/70">Comportamento esperado</span>
            <textarea v-model="form.expectedBehavior" class="bm-admin-field min-h-16" minlength="5" required/>
          </label>
          <label class="grid gap-1 text-sm">
            <span class="font-bold text-white/70">Comportamento observado</span>
            <textarea v-model="form.actualBehavior" class="bm-admin-field min-h-16" minlength="5" required/>
          </label>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="grid gap-1 text-sm">
            <span class="font-bold text-white/70">Personagem (opcional)</span>
            <input v-model="form.characterName" class="bm-admin-field" maxlength="80">
          </label>
          <label class="grid gap-1 text-sm">
            <span class="font-bold text-white/70">Link de evidencia (opcional, https://)</span>
            <input v-model="form.attachmentRef" class="bm-admin-field" placeholder="https://...">
          </label>
        </div>
        <label class="grid gap-1 text-sm">
          <span class="font-bold text-white/70">Contexto adicional (opcional)</span>
          <textarea v-model="form.contextNote" class="bm-admin-field min-h-14"/>
        </label>
        <label class="flex items-start gap-2 text-xs text-white/60">
          <input v-model="form.consentAcknowledged" class="mt-0.5" required type="checkbox">
          <span>Estou ciente de que este relato podera ser revisado pela equipe do Blood Moon.</span>
        </label>

        <p v-if="feedback" class="text-sm font-bold" :class="feedbackOk ? 'text-emerald-300' : 'text-ember'">{{ feedback }}</p>
        <div class="flex justify-end">
          <button class="bm-admin-primary" type="submit">Enviar relato</button>
        </div>
      </form>

      <div class="flex items-center justify-between">
        <h2 class="font-display text-xl font-black uppercase">Meus relatos</h2>
        <button v-if="selected" class="bm-admin-chip" type="button" @click="selected = null">← Novo relato / lista</button>
      </div>

      <div v-if="!selected" class="grid gap-2">
        <p v-if="!reports.length" class="text-sm text-white/50">Nenhum relato enviado ainda.</p>
        <button v-for="r in reports" :key="r.id" class="bm-panel grid gap-1 rounded-md p-3 text-left" type="button" @click="open(r.id)">
          <div class="flex items-center justify-between gap-3">
            <strong class="text-sm">{{ r.title }}</strong>
            <span class="bm-admin-chip">{{ statusLabels[r.status] || r.status }}</span>
          </div>
          <p class="text-xs text-white/50">{{ categoryLabels[r.category] || r.category }} · SEVERIDADE INFORMADA PELO JOGADOR: {{ severityLabels[r.playerSeverity] }} · {{ new Date(r.createdAt).toLocaleDateString('pt-BR') }}</p>
        </button>
      </div>

      <article v-else class="bm-panel grid gap-4 rounded-md p-4">
        <header class="grid gap-1">
          <div class="flex items-center justify-between gap-3">
            <h3 class="font-display text-lg font-black">{{ selected.title }}</h3>
            <span class="bm-admin-chip">{{ statusLabels[selected.status] || selected.status }}</span>
          </div>
          <p class="text-xs text-white/50">{{ categoryLabels[selected.category] }} · SEVERIDADE INFORMADA PELO JOGADOR: {{ severityLabels[selected.playerSeverity] }}</p>
        </header>
        <dl class="grid gap-3 text-sm">
          <div><dt class="font-bold text-white/70">Descricao</dt><dd class="text-white/60">{{ selected.description }}</dd></div>
          <div><dt class="font-bold text-white/70">Passos para reproduzir</dt><dd class="whitespace-pre-line text-white/60">{{ selected.stepsToReproduce }}</dd></div>
          <div><dt class="font-bold text-white/70">Esperado</dt><dd class="text-white/60">{{ selected.expectedBehavior }}</dd></div>
          <div><dt class="font-bold text-white/70">Observado</dt><dd class="text-white/60">{{ selected.actualBehavior }}</dd></div>
        </dl>

        <div class="grid gap-2 border-t border-white/10 pt-3">
          <h4 class="text-xs font-black uppercase tracking-wide text-white/50">Historico</h4>
          <p v-if="!selected.events.length" class="text-xs text-white/40">Sem atualizacoes ainda.</p>
          <div v-for="ev in selected.events" :key="ev.id" class="rounded-md bg-white/[0.04] p-2 text-xs">
            <div class="flex items-center justify-between gap-2 text-white/45">
              <span>{{ eventLabels[ev.type] || ev.type }}{{ ev.actor ? ` · ${ev.actor.username}` : '' }}</span>
              <span>{{ new Date(ev.createdAt).toLocaleString('pt-BR') }}</span>
            </div>
            <p v-if="ev.message" class="mt-1 text-white/70">{{ ev.message }}</p>
          </div>
        </div>

        <form v-if="selected.status === 'NEEDS_INFO'" class="grid gap-2 border-t border-white/10 pt-3" @submit.prevent="sendInfo">
          <p class="text-xs font-bold text-amber-300">A equipe pediu mais informacoes.</p>
          <textarea v-model="infoMessage" class="bm-admin-field min-h-16" minlength="2" placeholder="Adicione as informacoes solicitadas" required/>
          <div class="flex justify-end"><button class="bm-admin-primary" type="submit">Enviar</button></div>
        </form>
      </article>
    </section>
  </ManagementShell>
</template>
<script setup lang="ts">
import { bugReportCategories, bugReportSeverities, type BugReportDetail, type BugReportSummary } from '~/composables/useBugHuntersApi'

const api = useBugHuntersApi()
const categories = bugReportCategories
const severities = bugReportSeverities
const categoryLabels: Record<string, string> = {
  LAUNCHER: 'Launcher', LOGIN_ACCOUNT: 'Login / Conta', GAMEPLAY: 'Jogabilidade', MAP_MONSTER: 'Mapa / Monstro',
  ITEM: 'Item', EVENT: 'Evento', QUEST: 'Quest', VIP: 'VIP', STORE_PAYMENT: 'Loja / Pagamento',
  MARKETPLACE: 'Marketplace', GUILD: 'Guilda', COMMUNITY: 'Comunidade', PORTAL: 'Portal', PERFORMANCE: 'Desempenho', OTHER: 'Outro'
}
const severityLabels: Record<string, string> = { LOW: 'Baixa', MEDIUM: 'Media', HIGH: 'Alta', CRITICAL: 'Critica' }
const statusLabels: Record<string, string> = {
  OPEN: 'Aberto', TRIAGE: 'Em triagem', NEEDS_INFO: 'Aguardando informacoes', CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'Em andamento', RESOLVED: 'Resolvido', CLOSED: 'Encerrado', DUPLICATE: 'Duplicado', NOT_A_BUG: 'Nao e um bug'
}
const eventLabels: Record<string, string> = {
  CREATED: 'Relato enviado', STATUS_CHANGED: 'Status alterado', STAFF_REPLY: 'Resposta da equipe', PLAYER_INFO_ADDED: 'Voce enviou mais informacoes'
}

const reports = ref<BugReportSummary[]>([])
const selected = ref<BugReportDetail | null>(null)
const feedback = ref(''); const feedbackOk = ref(false)
const infoMessage = ref('')

const form = reactive({
  category: '', title: '', description: '', stepsToReproduce: '', expectedBehavior: '', actualBehavior: '',
  playerSeverity: '', characterName: '', contextNote: '', attachmentRef: '', consentAcknowledged: false
})

const load = async () => { try { reports.value = await api.ownReports() } catch { reports.value = [] } }

const submit = async () => {
  feedback.value = ''
  try {
    await api.createReport({ ...form })
    Object.assign(form, { category: '', title: '', description: '', stepsToReproduce: '', expectedBehavior: '', actualBehavior: '', characterName: '', contextNote: '', attachmentRef: '', playerSeverity: '', consentAcknowledged: false })
    feedback.value = 'Relato enviado. Obrigado por ajudar o Blood Moon!'; feedbackOk.value = true
    await load()
  } catch { feedback.value = 'Nao foi possivel enviar o relato. Revise os campos e tente novamente.'; feedbackOk.value = false }
}

const open = async (id: string) => { try { selected.value = await api.ownReport(id) } catch { selected.value = null } }

const sendInfo = async () => {
  if (!selected.value) return
  try { await api.addPlayerInfo(selected.value.id, infoMessage.value); infoMessage.value = ''; await open(selected.value.id) } catch { /* keep current state */ }
}

onMounted(load)
useSeoMeta({ title: 'Bug Hunters' })
</script>

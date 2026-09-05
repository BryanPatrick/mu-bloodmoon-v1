<template>
  <ManagementShell>
    <section class="grid gap-6">
      <header>
        <p class="bm-kicker">Conta</p>
        <h1 class="mt-2 font-display text-3xl font-bold">Privacidade e meus dados</h1>
        <p class="bm-muted mt-2 max-w-2xl text-sm">
          Aqui você pode visualizar e exportar seus dados, e solicitar a exclusão da sua conta.
          Algumas opções ainda estão planejadas e serão liberadas em breve — elas aparecem marcadas como
          <span class="font-bold text-amber-200">EM BREVE</span> abaixo.
        </p>
      </header>

      <!-- Meus dados -->
      <article class="bm-panel grid gap-4 p-5">
        <h2 class="font-display text-xl font-bold">Meus dados</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-md border border-white/10 bg-black/20 p-4">
            <p class="text-sm font-bold">Visualizar meus dados</p>
            <p class="bm-muted mt-1 text-xs">Veja um resumo dos dados que temos sobre sua conta, personagens e histórico.</p>
            <button class="bm-admin-action mt-3" type="button" @click="showExportPreview = !showExportPreview">
              {{ showExportPreview ? 'Ocultar' : 'Visualizar agora' }}
            </button>
          </div>
          <div class="rounded-md border border-white/10 bg-black/20 p-4">
            <p class="text-sm font-bold">Solicitar cópia dos meus dados</p>
            <p class="bm-muted mt-1 text-xs">Baixe uma cópia em formato de arquivo (JSON) com os mesmos dados.</p>
            <button class="bm-admin-action mt-3" type="button" :disabled="exporting" @click="downloadExport">
              {{ exporting ? 'Preparando...' : 'Baixar meus dados' }}
            </button>
          </div>
          <div class="rounded-md border border-white/10 bg-black/10 p-4 opacity-70">
            <p class="text-sm font-bold">Corrigir informações</p>
            <p class="bm-muted mt-1 text-xs">Correção self-service de dados cadastrais.</p>
            <span class="mt-3 inline-block rounded-md border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-100">EM BREVE</span>
            <p class="bm-muted mt-2 text-xs">Por enquanto, abra um chamado de suporte para corrigir um dado incorreto.</p>
          </div>
          <div class="rounded-md border border-white/10 bg-black/10 p-4 opacity-70">
            <p class="text-sm font-bold">Gerenciar consentimentos</p>
            <p class="bm-muted mt-1 text-xs">Controle de preferências de comunicação e consentimentos.</p>
            <span class="mt-3 inline-block rounded-md border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-100">EM BREVE</span>
          </div>
        </div>

        <div v-if="showExportPreview" class="rounded-md border border-white/10 bg-black/30 p-4">
          <p v-if="exportError" class="text-sm font-bold text-blood-100">{{ exportError }}</p>
          <pre v-else-if="exportData" class="max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs text-white/70">{{ JSON.stringify(exportData, null, 2) }}</pre>
          <p v-else class="text-sm text-white/55">Carregando...</p>
        </div>
      </article>

      <!-- Solicitações -->
      <article class="bm-panel grid gap-4 p-5">
        <h2 class="font-display text-xl font-bold">Minhas solicitações</h2>

        <div v-if="loadingStatus" class="text-sm text-white/55">Carregando status...</div>

        <template v-else>
          <!-- Nenhuma solicitação -->
          <div v-if="status.status === 'NONE'" class="rounded-md border border-white/10 bg-black/20 p-4">
            <p class="text-sm font-bold">Nenhuma solicitação de exclusão em andamento.</p>
          </div>

          <!-- Aguardando confirmação por e-mail -->
          <div v-else-if="status.status === 'REQUESTED'" class="rounded-md border border-cyan-300/25 bg-cyan-400/5 p-4">
            <p class="text-sm font-black text-cyan-100">Aguardando confirmação por e-mail</p>
            <p class="bm-muted mt-2 text-xs">
              Enviamos um e-mail com um link de confirmação. Se você não confirmar, nada acontece — a solicitação simplesmente expira.
            </p>
          </div>

          <!-- Em período de carência -->
          <div v-else-if="status.status === 'CONFIRMED'" class="rounded-md border border-amber-300/25 bg-amber-400/5 p-4">
            <p class="text-sm font-black text-amber-100">Em período de carência</p>
            <p class="bm-muted mt-2 text-xs">
              Sua exclusão está confirmada e será executada em
              <strong class="text-white">{{ status.scheduledExecutionAt ? formatDate(status.scheduledExecutionAt) : '—' }}</strong>.
              Até lá, você pode cancelar a qualquer momento.
            </p>
            <button class="bm-admin-danger mt-4" type="button" :disabled="cancelling" @click="cancelDeletion">
              {{ cancelling ? 'Cancelando...' : 'Cancelar exclusão' }}
            </button>
          </div>

          <!-- Cancelada -->
          <div v-else-if="status.status === 'CANCELLED'" class="rounded-md border border-white/10 bg-black/20 p-4">
            <p class="text-sm font-bold">Sua última solicitação de exclusão foi cancelada.</p>
            <p class="bm-muted mt-2 text-xs">Você pode iniciar uma nova solicitação a qualquer momento, abaixo.</p>
          </div>

          <!-- Concluída -->
          <div v-else-if="status.status === 'EXECUTED'" class="rounded-md border border-blood-400/25 bg-blood-900/10 p-4">
            <p class="text-sm font-black text-blood-100">Conta excluída</p>
            <p class="bm-muted mt-2 text-xs">A exclusão da sua conta foi concluída.</p>
          </div>
        </template>
      </article>

      <!-- Excluir minha conta -->
      <article v-if="!loadingStatus && (status.status === 'NONE' || status.status === 'CANCELLED')" class="bm-panel grid gap-4 border-blood-500/30 p-5">
        <h2 class="font-display text-xl font-bold text-blood-100">Excluir minha conta</h2>
        <p class="bm-muted text-sm">
          A exclusão é permanente após o período de carência. Antes de continuar, gostaríamos de entender o motivo —
          isso é totalmente opcional e nunca vai impedir sua exclusão.
        </p>
        <button class="bm-admin-danger w-fit" type="button" @click="startFlow">Iniciar exclusão da minha conta</button>
      </article>
    </section>

    <!-- Fluxo: questionário -> confirmações -->
    <Teleport to="body">
      <div v-if="flowStep" class="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" role="presentation">
        <section class="bm-panel w-full max-w-2xl rounded-md p-6" role="dialog" aria-modal="true" aria-labelledby="deletion-flow-title">
          <!-- Etapa 1: questionário de saída -->
          <div v-if="flowStep === 'questionnaire'">
            <p class="bm-kicker">Antes de continuar</p>
            <h2 id="deletion-flow-title" class="mt-2 font-display text-2xl font-black">Por que você está saindo?</h2>
            <p class="bm-muted mt-2 text-sm">Selecione um ou mais motivos (opcional). Isso nos ajuda a melhorar o servidor.</p>

            <div class="mt-4 grid gap-2 sm:grid-cols-2">
              <div v-for="reason in reasonOptions" :key="reason.code" class="rounded-md border border-white/10 bg-black/20 p-3">
                <label class="flex items-center gap-2 text-sm font-bold">
                  <input v-model="selectedReasons" type="checkbox" :value="reason.code" class="size-4 accent-blood-700">
                  {{ reason.label }}
                </label>
                <!-- Pergunta de acompanhamento contextual por motivo (opcional) -->
                <input
                  v-if="selectedReasons.includes(reason.code) && reason.followUp"
                  v-model="reasonDetails[reason.code]"
                  type="text"
                  maxlength="500"
                  class="mt-2 w-full rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs outline-none focus:border-blood-400"
                  :placeholder="reason.followUp"
                >
              </div>
            </div>

            <textarea
              v-model="otherText"
              class="mt-4 w-full rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400"
              rows="3"
              placeholder="Quer contar mais alguma coisa? (opcional)"
            />

            <!-- Ofertas contextuais de retenção -- nunca bloqueiam, sempre com saída -->
            <div v-if="retentionOffer" class="mt-4 rounded-md border border-cyan-300/25 bg-cyan-400/5 p-4">
              <p class="text-sm font-bold text-cyan-100">{{ retentionOffer.title }}</p>
              <p class="bm-muted mt-1 text-xs">{{ retentionOffer.description }}</p>
              <div v-if="retentionOffer.showTicketAction" class="mt-3 flex flex-wrap gap-3">
                <button class="bm-admin-action" type="button" :disabled="creatingTicket" @click="openSupportTicket">
                  {{ creatingTicket ? 'Enviando...' : 'Criar chamado' }}
                </button>
                <NuxtLink to="/painel/suporte" class="bm-button-glass rounded-md px-4 py-2 text-xs font-black" @click="retentionInteraction.helpAccepted = true">
                  Pedir ajuda
                </NuxtLink>
              </div>
              <p v-if="ticketCreatedFeedback" class="mt-3 text-xs font-bold text-cyan-200">Chamado criado — nossa equipe vai te responder em breve.</p>
            </div>

            <div class="mt-6 flex flex-wrap justify-end gap-3">
              <button class="bm-button-glass rounded-md px-4 py-3 text-sm font-black" type="button" @click="closeFlow">Cancelar</button>
              <button class="bm-admin-danger rounded-md px-4 py-3 text-sm font-black" type="button" @click="continueToConfirmations">
                Continuar com a exclusão
              </button>
            </div>
          </div>

          <!-- Etapa 2: consequências e confirmações explícitas -->
          <div v-else-if="flowStep === 'confirmations'">
            <p class="bm-kicker">Última etapa</p>
            <h2 class="mt-2 font-display text-2xl font-black text-blood-100">Confirme que você entende</h2>

            <div class="mt-4 rounded-md border border-blood-400/25 bg-blood-900/10 p-4 text-sm">
              <p class="font-bold text-blood-100">A exclusão definitiva pode remover permanentemente:</p>
              <ul class="mt-2 list-inside list-disc space-y-1 text-white/70">
                <li>Personagens e progresso (níveis, resets)</li>
                <li>Itens e conteúdo do warehouse</li>
                <li>Estado operacional da conta no jogo</li>
              </ul>
              <p class="mt-3 text-xs text-white/55">
                Alguns registros podem ser mantidos quando exigido por obrigações legais/fiscais, prevenção a fraude,
                segurança, ou exercício/defesa de direitos. Dados de análise de produto podem permanecer apenas de
                forma devidamente anonimizada, quando aplicável.
                <span class="font-bold text-amber-200/80">[LEGAL_REVIEW_REQUIRED]</span>
              </p>
            </div>

            <div class="mt-4 grid gap-3">
              <label class="flex items-start gap-3 text-sm font-bold">
                <input v-model="ack.characters" type="checkbox" class="mt-0.5 size-4 accent-blood-700">
                Entendo que meus personagens e progresso serão excluídos.
              </label>
              <label class="flex items-start gap-3 text-sm font-bold">
                <input v-model="ack.warehouse" type="checkbox" class="mt-0.5 size-4 accent-blood-700">
                Entendo que meus itens e warehouse serão excluídos.
              </label>
              <label class="flex items-start gap-3 text-sm font-bold">
                <input v-model="ack.irreversible" type="checkbox" class="mt-0.5 size-4 accent-blood-700">
                Entendo que, após a conclusão definitiva, os dados operacionais removidos não poderão ser restaurados.
              </label>
              <label class="flex items-start gap-3 text-sm font-bold">
                <input v-model="ack.continueFlag" type="checkbox" class="mt-0.5 size-4 accent-blood-700">
                Quero continuar com a solicitação de exclusão.
              </label>
            </div>

            <p v-if="submitError" class="mt-4 rounded-md border border-blood-500/40 bg-blood-900/20 p-3 text-sm font-bold text-blood-100">{{ submitError }}</p>

            <div class="mt-6 flex flex-wrap justify-end gap-3">
              <button class="bm-button-glass rounded-md px-4 py-3 text-sm font-black" type="button" @click="flowStep = 'questionnaire'">Voltar</button>
              <button
                class="bm-admin-danger rounded-md px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
                :disabled="!allAcknowledged || submitting"
                @click="submitDeletionRequest"
              >
                {{ submitting ? 'Enviando...' : 'Solicitar exclusão' }}
              </button>
            </div>
          </div>
        </section>
      </div>
    </Teleport>
  </ManagementShell>
</template>

<script setup lang="ts">
import type { DeletionStatusResponse, ExitFeedbackReasonCode, ExitRetentionInteraction, ExportedAccountData } from '~/composables/usePrivacyApi'

const privacyApi = usePrivacyApi()
const supportApi = useSupportApi()

useSeoMeta({ title: 'Privacidade e meus dados' })

const status = ref<DeletionStatusResponse>({ status: 'NONE' })
const loadingStatus = ref(true)
const cancelling = ref(false)

const loadStatus = async () => {
  loadingStatus.value = true
  try { status.value = await privacyApi.status() }
  catch { status.value = { status: 'NONE' } }
  finally { loadingStatus.value = false }
}
onMounted(loadStatus)

const cancelDeletion = async () => {
  cancelling.value = true
  try { await privacyApi.cancelDeletion(); await loadStatus() }
  finally { cancelling.value = false }
}

// Meus dados / exportação
const showExportPreview = ref(false)
const exportData = ref<ExportedAccountData | null>(null)
const exportError = ref('')
const exporting = ref(false)

watch(showExportPreview, async (open) => {
  if (!open || exportData.value) return
  try { exportData.value = await privacyApi.exportMyData() }
  catch { exportError.value = 'Não foi possível carregar seus dados agora.' }
})

const downloadExport = async () => {
  exporting.value = true
  try {
    const data = exportData.value ?? await privacyApi.exportMyData()
    exportData.value = data
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `blood-moon-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch {
    exportError.value = 'Não foi possível gerar o arquivo agora.'
  } finally {
    exporting.value = false
  }
}

// Fluxo de exclusão
const flowStep = ref<'questionnaire' | 'confirmations' | null>(null)
const selectedReasons = ref<ExitFeedbackReasonCode[]>([])
const otherText = ref('')
const submitting = ref(false)
const submitError = ref('')

// Part 11: cada motivo pode ter uma pergunta de acompanhamento contextual
// (opcional) -- armazenada em reasonDetails[code] e enviada como o campo
// `detail` já suportado por reasons[] no backend (account-deletion.contract.ts),
// sem precisar de uma nova coluna.
const reasonOptions: Array<{ code: ExitFeedbackReasonCode, label: string, followUp?: string }> = [
  { code: 'LACK_OF_TIME', label: 'Falta de tempo para jogar' },
  { code: 'PROGRESSION', label: 'Progressão', followUp: 'O que tornou a progressão lenta ou frustrante? (opcional)' },
  { code: 'BALANCING', label: 'Balanceamento', followUp: 'Qual classe/mecânica pareceu desbalanceada? (opcional)' },
  { code: 'BUGS', label: 'Bugs', followUp: 'Qual bug? Quanto mais detalhe, melhor conseguimos corrigir. (opcional)' },
  { code: 'PERFORMANCE_CONNECTION', label: 'Desempenho/conexão', followUp: 'Lag, quedas de conexão, ou outra coisa? (opcional)' },
  { code: 'PLAYER_COMMUNITY_ISSUE', label: 'Problema com outro jogador/comunidade', followUp: 'Quer registrar o que aconteceu? (opcional)' },
  { code: 'STAFF_SUPPORT_ISSUE', label: 'Problema com equipe/suporte', followUp: 'O que não foi resolvido como esperado? (opcional)' },
  { code: 'SHOP_VIP_ECONOMY', label: 'Loja/VIP/economia', followUp: 'O que te incomodou na loja, VIP ou economia? (opcional)' },
  { code: 'ANOTHER_SERVER', label: 'Estou indo para outro servidor' },
  { code: 'ACCOUNT_ISSUE', label: 'Problema na minha conta', followUp: 'Acesso, segurança, cobrança? (opcional)' },
  { code: 'PRIVACY_SECURITY', label: 'Privacidade/segurança', followUp: 'Quer contar o que aconteceu? (opcional)' },
  { code: 'OTHER', label: 'Outro motivo' }
]
const reasonDetails = reactive<Partial<Record<ExitFeedbackReasonCode, string>>>({})

// Part 12: rastreamento observacional da oferta de retenção -- nunca lido de
// volta para bloquear nada, só enviado junto com o feedback.
const retentionInteraction = reactive<ExitRetentionInteraction>({
  offered: false, offerCodes: [], helpAccepted: false, ticketCreated: false, continuedAnyway: false
})
const creatingTicket = ref(false)
const ticketCreatedFeedback = ref(false)

// Oferta de retenção contextual -- nunca bloqueia, sempre com saída (Bryan:
// "não pode se tornar um dark pattern"). Mostrada só quando há sinal
// específico de algo que suporte poderia resolver. showTicketAction=false
// para NO_TIME -- ficar inativo não precisa de chamado.
const retentionOffer = computed(() => {
  if (selectedReasons.value.includes('BUGS') || selectedReasons.value.includes('STAFF_SUPPORT_ISSUE')) {
    return { codes: ['BUGS', 'STAFF_SUPPORT_ISSUE'] as ExitFeedbackReasonCode[], title: 'Podemos ajudar com isso?', description: 'Se for um bug ou um problema com suporte, muitas vezes conseguimos resolver rápido — sem precisar excluir a conta.', showTicketAction: true }
  }
  if (selectedReasons.value.includes('ACCOUNT_ISSUE')) {
    return { codes: ['ACCOUNT_ISSUE'] as ExitFeedbackReasonCode[], title: 'Problema na conta?', description: 'Nossa equipe de suporte pode ajudar a resolver problemas de acesso, segurança ou cobrança.', showTicketAction: true }
  }
  if (selectedReasons.value.includes('LACK_OF_TIME')) {
    return { codes: ['LACK_OF_TIME'] as ExitFeedbackReasonCode[], title: 'Você não precisa excluir para ficar inativo', description: 'Deixar a conta parada não custa nada e você pode voltar quando quiser — a exclusão é permanente, ficar inativo não.', showTicketAction: false }
  }
  return null
})

watch(retentionOffer, (offer) => {
  if (!offer) return
  retentionInteraction.offered = true
  for (const code of offer.codes) if (!retentionInteraction.offerCodes.includes(code)) retentionInteraction.offerCodes.push(code)
}, { immediate: true })

const openSupportTicket = async () => {
  creatingTicket.value = true
  retentionInteraction.helpAccepted = true
  try {
    await supportApi.createTicket({
      subject: 'Antes de excluir minha conta',
      message: otherText.value || 'Gostaria de conversar antes de excluir minha conta.',
      category: 'SUPPORT'
    })
    retentionInteraction.ticketCreated = true
    ticketCreatedFeedback.value = true
  } catch { /* best-effort -- never blocks the deletion flow */ }
  finally { creatingTicket.value = false }
}

// Marca "continuou mesmo assim" só quando havia uma oferta visível no
// momento em que o jogador decidiu prosseguir.
const continueToConfirmations = () => {
  if (retentionOffer.value) retentionInteraction.continuedAnyway = true
  flowStep.value = 'confirmations'
}

const ack = reactive({ characters: false, warehouse: false, irreversible: false, continueFlag: false })
// continueFlag avoids the reserved-ish name `continue`
const allAcknowledged = computed(() => ack.characters && ack.warehouse && ack.irreversible && ack.continueFlag)

const startFlow = () => {
  selectedReasons.value = []
  otherText.value = ''
  for (const key of Object.keys(reasonDetails) as ExitFeedbackReasonCode[]) delete reasonDetails[key]
  Object.assign(retentionInteraction, { offered: false, offerCodes: [], helpAccepted: false, ticketCreated: false, continuedAnyway: false })
  ticketCreatedFeedback.value = false
  Object.assign(ack, { characters: false, warehouse: false, irreversible: false, continueFlag: false })
  submitError.value = ''
  flowStep.value = 'questionnaire'
}
const closeFlow = () => { flowStep.value = null }

const submitDeletionRequest = async () => {
  submitting.value = true
  submitError.value = ''
  try {
    await privacyApi.requestDeletion({
      reasons: selectedReasons.value.map(code => ({ code, detail: reasonDetails[code]?.trim() || undefined })),
      otherText: otherText.value || undefined,
      retentionInteraction: retentionInteraction.offered ? { ...retentionInteraction } : undefined
    })
    flowStep.value = null
    await loadStatus()
  } catch {
    submitError.value = 'Não foi possível enviar sua solicitação agora. Tente novamente em instantes.'
  } finally {
    submitting.value = false
  }
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
</script>

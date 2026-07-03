<template>
  <ManagementShell>
    <div v-if="hasPermission(permissions.adminAuditView)" class="grid gap-6">
      <div class="flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="bm-kicker">Seguranca</p>
          <h1 class="mt-3 font-display text-4xl font-black uppercase sm:text-5xl">Auditoria</h1>
          <p class="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/70">
            Registro das principais acoes administrativas e tentativas de acesso do site.
          </p>
        </div>

        <div class="bm-glass flex flex-col gap-3 rounded-md p-3 sm:flex-row">
          <input
            v-model="query"
            class="h-11 min-w-0 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-blood-400/70 sm:w-72"
            placeholder="Buscar evento"
            type="search"
          >
          <select
            v-model="activeAction"
            class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70"
          >
            <option class="bg-zinc-950 text-white" value="Todos">Todos</option>
            <option v-for="action in eventActions" :key="action" class="bg-zinc-950 text-white" :value="action">{{ action }}</option>
          </select>
        </div>
      </div>

      <p v-if="loadError" class="rounded-md border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs font-bold text-amber-100">
        API de auditoria indisponivel no momento. Exibindo fallback local temporario para desenvolvimento.
      </p>

      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article v-for="card in summaryCards" :key="card.label" class="bm-panel rounded-md p-4">
          <p class="text-[11px] font-black uppercase tracking-[0.24em] text-white/45">{{ card.label }}</p>
          <p class="mt-3 font-display text-3xl font-black text-white">{{ card.value }}</p>
        </article>
      </section>

      <section v-if="filteredLogs.length" class="overflow-hidden rounded-md border border-white/10 bg-white/[0.035]">
        <div class="hidden grid-cols-[170px_1fr_150px_120px] gap-4 border-b border-white/10 bg-white/[0.05] px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/45 lg:grid">
          <span>Data</span>
          <span>Evento</span>
          <span>Usuario</span>
          <span>Perfil</span>
        </div>

        <article
          v-for="event in filteredLogs"
          :key="event.id"
          class="grid gap-3 border-b border-white/10 px-4 py-4 last:border-b-0 lg:grid-cols-[170px_1fr_150px_120px] lg:items-start"
        >
          <div>
            <p class="text-xs font-black uppercase tracking-[0.16em] text-white/45 lg:hidden">Data</p>
            <p class="text-sm font-bold text-white/75">{{ formatDate(event.createdAt) }}</p>
          </div>

          <div>
            <p class="text-xs font-black uppercase tracking-[0.16em] text-ember">{{ event.action }}</p>
            <p class="mt-1 text-sm font-semibold leading-6 text-white/75">{{ event.message }}</p>
            <div v-if="event.metadata" class="mt-2 flex flex-wrap gap-2">
              <span v-for="(value, key) in event.metadata" :key="key" class="rounded-sm bg-black/25 px-2 py-1 text-[11px] font-bold text-white/58">
                {{ key }}: {{ value }}
              </span>
            </div>
          </div>

          <div>
            <p class="text-xs font-black uppercase tracking-[0.16em] text-white/45 lg:hidden">Usuario</p>
            <p class="text-sm font-bold text-white">{{ event.actorUsername }}</p>
          </div>

          <div>
            <p class="text-xs font-black uppercase tracking-[0.16em] text-white/45 lg:hidden">Perfil</p>
            <p class="text-sm font-bold text-white/70">{{ event.severity }}</p>
          </div>
        </article>
      </section>

      <section v-else class="grid min-h-[280px] place-items-center rounded-md border border-dashed border-white/15 bg-white/[0.035] p-8 text-center">
        <div class="max-w-xl">
          <p class="bm-kicker">Sem registros</p>
          <h2 class="mt-3 font-display text-3xl font-black uppercase">Nenhum evento encontrado</h2>
          <p class="mt-3 text-sm font-semibold leading-7 text-white/65">
            Os eventos de login, logout e alteracoes administrativas vao aparecer aqui conforme o sistema for usado.
          </p>
        </div>
      </section>
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import { permissions } from '~/data/security'
import type { AuditEvent } from '~/composables/useAuth'
import type { AdminAuditApiEvent } from '~/composables/useAdminAuditApi'

const { getAuditLogs, hasPermission, loadSession } = useAuth()
const { events: fetchAuditEvents } = useAdminAuditApi()

useSeoMeta({ title: 'Auditoria' })

type AuditRow = {
  id: string
  createdAt: string
  action: string
  message: string
  actorUsername: string
  severity: string
  metadata?: Record<string, unknown>
}

const logs = ref<AuditRow[]>([])
const totalEvents = ref(0)
const totalWarnings = ref(0)
const totalErrors = ref(0)
const totalAuthFailures = ref(0)
const loadError = ref('')
const query = ref('')
const activeAction = ref('Todos')

onMounted(async () => {
  loadSession()
  await loadAuditEvents()
})

const eventActions = computed(() => Array.from(new Set(logs.value.map((event) => event.action))).sort())

const filteredLogs = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase()

  return logs.value.filter((event) => {
    const matchesType = activeAction.value === 'Todos' || event.action === activeAction.value
    const matchesQuery = !normalizedQuery || [event.action, event.message, event.actorUsername, event.severity]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)

    return matchesType && matchesQuery
  })
})

const summaryCards = computed(() => [
  { label: 'Eventos', value: totalEvents.value.toString() },
  { label: 'Alertas/erros', value: (totalWarnings.value + totalErrors.value).toString() },
  { label: 'Falhas de login', value: totalAuthFailures.value.toString() },
  { label: 'Eventos filtrados', value: filteredLogs.value.length.toString() }
])

const normalizeMetadata = (metadata: unknown) =>
  metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : undefined

const eventMessage = (event: AdminAuditApiEvent) => {
  const target = event.targetId ? ` em ${event.targetType}:${event.targetId}` : ` em ${event.targetType}`
  return `${event.action}${target}`
}

const mapApiEvent = (event: AdminAuditApiEvent): AuditRow => ({
  id: event.id,
  createdAt: event.createdAt,
  action: event.action,
  message: eventMessage(event),
  actorUsername: event.actorUsername || 'system',
  severity: event.severity,
  metadata: normalizeMetadata(event.metadata)
})

const mapLocalEvent = (event: AuditEvent): AuditRow => ({
  id: event.id,
  createdAt: event.createdAt,
  action: event.type,
  message: event.message,
  actorUsername: event.user,
  severity: event.role,
  metadata: event.meta
})

const loadAuditEvents = async () => {
  try {
    const response = await fetchAuditEvents({ pageSize: 100 })
    logs.value = response.items.map(mapApiEvent)
    totalEvents.value = response.summary.total
    totalWarnings.value = response.summary.warnings
    totalErrors.value = response.summary.errors
    totalAuthFailures.value = response.summary.authFailures
    loadError.value = ''
  } catch {
    const localLogs = getAuditLogs().map(mapLocalEvent)
    logs.value = localLogs
    totalEvents.value = localLogs.length
    totalWarnings.value = 0
    totalErrors.value = 0
    totalAuthFailures.value = localLogs.filter((event) => event.action === 'auth.login.failed').length
    loadError.value = 'api-offline'
  }
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
</script>

<template>
  <ManagementShell>
    <div v-if="hasPermission(permissions.adminDashboardView)" class="grid gap-5">
      <section class="border-b border-white/10 pb-5">
        <p class="bm-kicker">Migracao modular</p>
        <h1 class="mt-[6px] font-display text-4xl font-black uppercase text-white">Fontes Web</h1>
        <p class="mt-3 max-w-5xl text-sm font-semibold leading-7 text-white/68">
          Inventario da base web atual. Esta tela serve para enxergar o que existe, decidir o que reaproveitar e
          migrar cada parte para modulos independentes do Blood Moon.
        </p>
      </section>

      <section v-if="isLoading" class="bm-panel rounded-md p-5 text-sm font-bold text-white/60">
        Carregando catalogo da base atual...
      </section>

      <section v-else-if="errorMessage" class="rounded-md border border-blood-400/35 bg-blood-700/15 p-5 text-sm font-bold text-blood-100">
        {{ errorMessage }}
      </section>

      <template v-else>
        <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <article v-for="card in summaryCards" :key="card.label" class="bm-panel rounded-md p-4">
            <p class="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">{{ card.label }}</p>
            <p class="mt-3 font-display text-3xl font-black text-white">{{ card.value }}</p>
            <p class="mt-2 text-xs font-bold leading-5 text-white/50">{{ card.description }}</p>
          </article>
        </section>

        <section class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <article class="bm-panel rounded-md p-5">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="bm-kicker">Etapas</p>
                <h2 class="mt-[6px] font-display text-2xl font-black uppercase text-white">Plano de migracao</h2>
                <p class="mt-2 text-sm font-semibold leading-6 text-white/60">
                  Tudo aqui deve virar modulo reaproveitavel: origem atual, API segura, tela admin e depois publicacao.
                </p>
              </div>
              <span class="rounded-sm border border-ember/35 bg-ember/15 px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-ember">
                {{ migrationBoard.length }} grupos
              </span>
            </div>

            <div class="mt-5 grid gap-3">
              <article v-for="group in migrationBoard" :key="group.key" class="rounded-md border border-white/10 bg-black/20 p-4">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p class="text-[10px] font-black uppercase tracking-[0.22em]" :class="priorityClass(group.priority)">
                      {{ priorityLabel(group.priority) }}
                    </p>
                    <h3 class="mt-2 font-display text-xl font-black uppercase text-white">{{ group.title }}</h3>
                    <p class="mt-2 text-xs font-bold leading-5 text-white/55">{{ group.description }}</p>
                  </div>
                  <span class="rounded-sm bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
                    {{ group.items.length }} itens
                  </span>
                </div>

                <div class="mt-4 grid gap-2">
                  <div
                    v-for="item in group.items"
                    :key="`${group.key}-${item.label}`"
                    class="grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3 md:grid-cols-[1fr_1fr_150px]"
                  >
                    <div>
                      <p class="text-sm font-black text-white">{{ item.label }}</p>
                      <p class="mt-1 text-[11px] font-bold leading-4 text-white/42">{{ item.source }}</p>
                    </div>
                    <p class="text-xs font-bold leading-5 text-white/58">{{ item.target }}</p>
                    <span class="h-fit rounded-sm px-2 py-1 text-center text-[10px] font-black uppercase tracking-[0.12em]" :class="statusClass(item.status)">
                      {{ statusLabel(item.status) }}
                    </span>
                  </div>
                </div>
              </article>
            </div>
          </article>

          <article class="bm-panel rounded-md p-5">
            <p class="bm-kicker">Base atual</p>
            <h2 class="mt-[6px] font-display text-2xl font-black uppercase text-white">Origem detectada</h2>
            <div class="mt-5 grid gap-3">
              <div v-for="item in cmsFacts" :key="item.label" class="rounded-md border border-white/10 bg-black/18 p-3">
                <p class="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{{ item.label }}</p>
                <p class="mt-2 text-sm font-black text-white">{{ item.value }}</p>
              </div>
            </div>

            <div class="mt-5 rounded-md border border-ember/25 bg-ember/10 p-4">
              <p class="text-[11px] font-black uppercase tracking-[0.18em] text-ember">Regra</p>
              <p class="mt-2 text-xs font-bold leading-5 text-white/62">
                Nada da base atual deve acessar banco direto pelo cliente. Tudo vira API com permissao, validacao,
                transacao, auditoria e rollback.
              </p>
            </div>
          </article>
        </section>

        <section class="bm-panel rounded-md p-5">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p class="bm-kicker">Normalizacao</p>
              <h2 class="mt-[6px] font-display text-2xl font-black uppercase text-white">Dominios da nossa base</h2>
              <p class="mt-2 text-sm font-semibold leading-6 text-white/60">
                Primeira separacao por dominio para migrar com seguranca para API, CMS e Wiki.
              </p>
            </div>
            <span class="rounded-sm bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
              {{ normalizedDomains.length }} dominios
            </span>
          </div>

          <div class="mt-5 grid gap-3 xl:grid-cols-5">
            <article v-for="domain in normalizedDomains" :key="domain.key" class="rounded-md border border-white/10 bg-black/20 p-4">
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-ember">{{ domain.key }}</p>
              <h3 class="mt-2 text-sm font-black text-white">{{ domain.title }}</h3>
              <p class="mt-2 text-xs font-bold leading-5 text-white/52">{{ domain.description }}</p>
              <p class="mt-3 font-display text-2xl font-black text-white">{{ domain.entities.length }}</p>
              <p class="text-[10px] font-black uppercase tracking-[0.16em] text-white/42">itens mapeados</p>
            </article>
          </div>
        </section>

        <section class="grid gap-4 xl:grid-cols-2">
          <article class="bm-panel rounded-md p-5">
            <div class="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p class="bm-kicker">Dados tecnicos</p>
                <h2 class="mt-[6px] font-display text-2xl font-black uppercase text-white">ServerData para importar</h2>
              </div>
              <span class="rounded-sm bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
                {{ serverDataRows.length }} arquivos
              </span>
            </div>
            <div class="mt-5 overflow-hidden rounded-md border border-white/10">
              <div class="grid grid-cols-[1fr_100px] bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
                <span>Arquivo</span>
                <span>KB</span>
              </div>
              <div class="max-h-[380px] overflow-y-auto">
                <div v-for="row in serverDataRows" :key="row.name" class="grid grid-cols-[1fr_100px] border-t border-white/10 px-4 py-3">
                  <span class="text-sm font-black text-white">{{ row.name }}</span>
                  <span class="text-xs font-bold text-white/55">{{ kb(row.bytes) }}</span>
                </div>
              </div>
            </div>
          </article>

          <article class="bm-panel rounded-md p-5">
            <div class="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p class="bm-kicker">Assets</p>
                <h2 class="mt-[6px] font-display text-2xl font-black uppercase text-white">Imagens por grupo</h2>
              </div>
              <span class="rounded-sm bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
                {{ totalItemImages.toLocaleString('pt-BR') }} imagens
              </span>
            </div>
            <div class="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <article v-for="group in itemImageGroups" :key="group.name" class="rounded-md border border-white/10 bg-black/20 p-3">
                <p class="text-[10px] font-black uppercase tracking-[0.18em] text-ember">Grupo {{ group.name }}</p>
                <p class="mt-2 font-display text-2xl font-black text-white">{{ group.files }}</p>
                <p class="mt-1 text-xs font-bold text-white/45">arquivos webp</p>
              </article>
            </div>
          </article>
        </section>

        <section class="grid gap-4 xl:grid-cols-2">
          <LegacyTable title="Controllers" kicker="PHP atual" :rows="controllers" />
          <LegacyTable title="Models" kicker="PHP atual" :rows="models" />
          <LegacyTable title="Modulos" kicker="Base atual" :rows="plugins" value-label="Arquivos" value-key="files" />
          <article class="bm-panel rounded-md p-5">
            <p class="bm-kicker">Reaproveitamento</p>
            <h2 class="mt-[6px] font-display text-2xl font-black uppercase text-white">Como usar no novo sistema</h2>
            <div class="mt-5 grid gap-3">
              <article v-for="item in reusePlan" :key="item.area" class="rounded-md border border-white/10 bg-black/18 p-4">
                <p class="text-sm font-black text-white">{{ item.area }}</p>
                <p class="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-ember">{{ item.source }}</p>
                <p class="mt-2 text-xs font-bold leading-5 text-white/55">{{ item.use }}</p>
              </article>
            </div>
          </article>
        </section>
      </template>
    </div>

    <div v-else class="bm-panel rounded-md p-6">
      <p class="bm-kicker">Administracao</p>
      <h1 class="mt-2 font-display text-4xl font-black uppercase">Acesso restrito</h1>
      <p class="mt-3 text-sm font-semibold leading-7 text-white/68">
        O inventario da base atual fica disponivel apenas para contas administrativas.
      </p>
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import { permissions } from '~/data/security'
import type {
  WebSourceFileRow,
  WebSourceMigrationGroup,
  WebSourceNormalizedDomain,
  WebSourceReusePlanItem,
  WebSourceSummary
} from '~/composables/useWebSourceApi'

useSeoMeta({ title: 'Fontes Web' })

const { hasPermission, loadSession } = useAuth()
const webSourceApi = useWebSourceApi()
const isLoading = ref(true)
const errorMessage = ref('')

const summary = ref<WebSourceSummary | null>(null)
const migrationBoard = ref<WebSourceMigrationGroup[]>([])
const serverDataRows = ref<WebSourceFileRow[]>([])
const itemImageGroups = ref<WebSourceFileRow[]>([])
const controllers = ref<WebSourceFileRow[]>([])
const models = ref<WebSourceFileRow[]>([])
const plugins = ref<WebSourceFileRow[]>([])
const reusePlan = ref<WebSourceReusePlanItem[]>([])
const normalizedDomains = ref<WebSourceNormalizedDomain[]>([])

const summaryCards = computed(() => [
  { label: 'Arquivos', value: summary.value?.totals.files.toLocaleString('pt-BR') || '0', description: 'Arquivos extraidos da base atual.' },
  { label: 'Pastas', value: summary.value?.totals.dirs.toLocaleString('pt-BR') || '0', description: 'Estrutura navegavel da base web.' },
  { label: 'Modulos', value: summary.value?.sections.plugins || 0, description: 'Modulos atuais para avaliar e recriar.' },
  { label: 'Imagens', value: totalItemImages.value.toLocaleString('pt-BR'), description: 'Assets de itens em grupos catalogados.' },
  { label: 'Pendencias', value: summary.value?.migration.needsReview || 0, description: 'Fluxos que exigem revisao de seguranca.' }
])

const cmsFacts = computed(() => [
  { label: 'Base', value: summary.value?.cms.name || 'Sistema web atual' },
  { label: 'Pacote', value: summary.value?.cms.package || 'catalogado' },
  { label: 'Versao', value: summary.value?.cms.version || 'nao identificado' },
  { label: 'PHP', value: summary.value?.cms.php || 'nao identificado' }
])

const totalItemImages = computed(() =>
  itemImageGroups.value.reduce((sum, group) => sum + Number(group.files || 0), 0)
)

const kb = (bytes?: number) => {
  if (!bytes) return '0'
  return Math.max(1, Math.round(bytes / 1024)).toLocaleString('pt-BR')
}

const priorityLabel = (priority: WebSourceMigrationGroup['priority']) => ({
  high: 'Alta prioridade',
  medium: 'Media prioridade',
  low: 'Baixa prioridade'
}[priority])

const priorityClass = (priority: WebSourceMigrationGroup['priority']) => ({
  high: 'text-blood-100',
  medium: 'text-ember',
  low: 'text-white/45'
}[priority])

const statusLabel = (status: string) => ({
  cataloged: 'Catalogado',
  'ready-to-map': 'Mapear',
  'needs-review': 'Revisar',
  future: 'Futuro'
}[status] || status)

const statusClass = (status: string) => ({
  cataloged: 'border border-white/10 bg-white/10 text-white/60',
  'ready-to-map': 'border border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
  'needs-review': 'border border-ember/30 bg-ember/12 text-ember',
  future: 'border border-white/10 bg-white/5 text-white/42'
}[status] || 'border border-white/10 bg-white/10 text-white/60')

onMounted(async () => {
  loadSession()

  if (!hasPermission(permissions.adminDashboardView)) {
    isLoading.value = false
    return
  }

  try {
    const [summaryData, boardData, serverData, imageGroups, controllerRows, modelRows, pluginRows, planRows, normalizedData] = await Promise.all([
      webSourceApi.summary(),
      webSourceApi.migrationBoard(),
      webSourceApi.serverData(),
      webSourceApi.itemImageGroups(),
      webSourceApi.controllers(),
      webSourceApi.models(),
      webSourceApi.plugins(),
      webSourceApi.reusePlan(),
      webSourceApi.normalizedDomains()
    ])

    summary.value = summaryData
    migrationBoard.value = boardData
    serverDataRows.value = serverData
    itemImageGroups.value = imageGroups
    controllers.value = controllerRows
    models.value = modelRows
    plugins.value = pluginRows
    reusePlan.value = planRows
    normalizedDomains.value = normalizedData.domains
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Nao foi possivel carregar o catalogo da base atual.'
  } finally {
    isLoading.value = false
  }
})
</script>

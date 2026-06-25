<template>
  <ManagementShell>
    <div v-if="hasPermission(permissions.adminSystemManage)" class="grid gap-6">
      <div class="border-b border-white/10 pb-6">
        <p class="bm-kicker">Administracao</p>
        <h1 class="mt-3 font-display text-4xl font-black uppercase sm:text-5xl">Sistema</h1>
        <p class="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/70">
          Ferramentas de manutencao da base local para teste, revisao de fluxo e preparacao do futuro backend.
        </p>
      </div>

      <section class="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <div class="bm-panel rounded-md p-5">
          <div class="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-xs font-black uppercase tracking-[0.28em] text-ember">Backup</p>
              <h2 class="mt-2 font-display text-2xl font-black">Exportar base local</h2>
            </div>
            <button class="rounded-md bg-blood-700 px-4 py-3 text-sm font-black text-white transition hover:bg-blood-600" type="button" @click="refreshExport">
              Gerar JSON
            </button>
          </div>

          <textarea
            v-model="exportText"
            class="mt-5 min-h-[420px] w-full rounded-md border border-white/10 bg-black/35 p-4 font-mono text-xs leading-5 text-white outline-none focus:border-blood-400/70"
            spellcheck="false"
          />
        </div>

        <div class="grid gap-6">
          <section class="bm-panel rounded-md p-5">
            <p class="text-xs font-black uppercase tracking-[0.28em] text-ember">Importar</p>
            <h2 class="mt-2 font-display text-2xl font-black">Restaurar JSON</h2>
            <p class="mt-3 text-sm font-semibold leading-7 text-white/62">
              Cole um JSON exportado daqui para restaurar a base local.
            </p>
            <textarea
              v-model="importText"
              class="mt-5 min-h-48 w-full rounded-md border border-white/10 bg-black/35 p-4 font-mono text-xs leading-5 text-white outline-none focus:border-blood-400/70"
              placeholder="Cole o JSON aqui"
              spellcheck="false"
            />
            <button class="mt-4 rounded-md bg-blood-700 px-4 py-3 text-sm font-black text-white transition hover:bg-blood-600" type="button" @click="restoreImport">
              Importar base
            </button>
          </section>

          <section class="bm-panel rounded-md p-5">
            <p class="text-xs font-black uppercase tracking-[0.28em] text-ember">Reset</p>
            <h2 class="mt-2 font-display text-2xl font-black">Reiniciar dados locais</h2>
            <p class="mt-3 text-sm font-semibold leading-7 text-white/62">
              Volta contas, personagens, produtos e pacotes para o estado inicial. Auditoria e sessao nao sao apagadas por este botao.
            </p>
            <button class="mt-4 rounded-md border border-blood-500/40 bg-blood-900/30 px-4 py-3 text-sm font-black text-blood-100" type="button" @click="resetLocalBase">
              Resetar base local
            </button>
          </section>
        </div>
      </section>

      <p v-if="message" class="rounded-md border px-4 py-3 text-sm font-bold" :class="messageClass">
        {{ message }}
      </p>
    </div>
  </ManagementShell>
</template>

<script setup lang="ts">
import { permissions } from '~/data/security'

const { hasPermission, loadSession, recordAudit } = useAuth()
const { exportManagement, importManagement, loadManagement, resetManagement } = useManagement()

useSeoMeta({ title: 'Sistema' })

const exportText = ref('')
const importText = ref('')
const message = ref('')
const isSuccess = ref(true)

onMounted(() => {
  loadSession()
  loadManagement()
  refreshExport()
})

const messageClass = computed(() =>
  isSuccess.value
    ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
    : 'border-blood-400/25 bg-blood-700/10 text-blood-100'
)

const refreshExport = () => {
  exportText.value = exportManagement()
  isSuccess.value = true
  message.value = 'JSON de backup atualizado.'
}

const restoreImport = () => {
  const result = importManagement(importText.value)
  isSuccess.value = result.ok
  message.value = result.message

  if (result.ok) {
    recordAudit({
      type: 'admin.system.import',
      message: 'Base local importada pelo painel administrativo.'
    })
    refreshExport()
    importText.value = ''
  }
}

const resetLocalBase = () => {
  const confirmed = window.confirm('Resetar a base local de gerenciamento?')
  if (!confirmed) {
    return
  }

  resetManagement()
  recordAudit({
    type: 'admin.system.reset',
    message: 'Base local reiniciada pelo painel administrativo.'
  })
  refreshExport()
  isSuccess.value = true
  message.value = 'Base local reiniciada.'
}
</script>

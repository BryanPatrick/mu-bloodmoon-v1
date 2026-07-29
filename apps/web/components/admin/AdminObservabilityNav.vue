<template>
  <nav class="bm-panel flex gap-2 overflow-x-auto rounded-md p-2" aria-label="Auditoria e monitoramento">
    <NuxtLink
      v-for="item in visibleItems"
      :key="item.to"
      :to="item.to"
      class="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-black transition"
      :class="route.path === item.to ? 'bg-ember text-black' : 'bg-white/[0.055] text-white/65 hover:bg-white/10 hover:text-white'"
    >
      <component :is="item.icon" class="size-4" />
      {{ item.label }}
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
import {
  Activity,
  AlertTriangle,
  BellRing,
  ClipboardCheck,
  Download,
  FileClock,
  FileSearch,
  SlidersHorizontal
} from 'lucide-vue-next'
import { permissions, type Permission } from '~/data/security'

const route = useRoute()
const { hasPermission } = useAuth()

const items: Array<{ label: string; to: string; icon: unknown; permission: Permission }> = [
  { label: 'Ações administrativas', to: '/painel/admin/auditoria', icon: FileSearch, permission: permissions.adminAuditView },
  { label: 'Histórico', to: '/painel/admin/historico', icon: FileClock, permission: permissions.adminAuditHistoryView },
  { label: 'Logs de trabalho', to: '/painel/admin/logs-trabalho', icon: ClipboardCheck, permission: permissions.adminWorkLogsView },
  { label: 'Eventos comerciais', to: '/painel/admin/eventos-operacionais', icon: Activity, permission: permissions.adminOperationalLogsView },
  { label: 'Central de erros', to: '/painel/admin/erros', icon: AlertTriangle, permission: permissions.adminErrorsView },
  { label: 'Alertas críticos', to: '/painel/admin/alertas', icon: BellRing, permission: permissions.adminAlertsView },
  { label: 'Exportações', to: '/painel/admin/exportacoes', icon: Download, permission: permissions.adminLogsExport },
  { label: 'Retenção', to: '/painel/admin/retencao', icon: SlidersHorizontal, permission: permissions.adminRetentionManage }
]

const visibleItems = computed(() => items.filter((item) => hasPermission(item.permission)))
</script>

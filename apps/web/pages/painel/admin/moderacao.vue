<template>
  <ManagementShell>
    <section class="grid gap-4">
      <header><p class="bm-kicker">Operacao</p><h1 class="mt-2 font-display text-3xl font-black uppercase">Moderacao</h1></header>
      <form class="bm-panel grid gap-3 rounded-md p-4 md:grid-cols-[1fr_180px_1fr_auto]" @submit.prevent="apply">
        <select v-model="form.accountId" class="bm-admin-field" required><option value="">Selecione uma conta</option><option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.username }} ({{ account.role }})</option></select>
        <select v-model="form.type" class="bm-admin-field"><option value="NOTE">Observacao</option><option value="WARNING">Advertencia</option><option value="BLOCK">Bloqueio</option><option value="UNBLOCK">Desbloqueio</option><option value="BAN">Banimento</option></select>
        <input v-model="form.reason" class="bm-admin-field" minlength="5" placeholder="Justificativa" required>
        <button class="bm-admin-primary" type="submit">Registrar</button>
      </form>
      <p v-if="message" class="text-sm font-bold text-ember">{{ message }}</p>
      <article v-for="row in rows" :key="row.id" class="bm-panel flex flex-wrap items-center justify-between gap-3 rounded-md p-4"><div><strong>{{ row.account?.username }}</strong><p class="mt-1 text-xs text-white/50">{{ row.reason }}</p></div><div class="text-right"><span class="text-xs font-black text-ember">{{ row.type }}</span><p class="mt-1 text-xs text-white/40">por {{ row.actor?.username || 'sistema' }}</p></div></article>
    </section>
  </ManagementShell>
</template>
<script setup lang="ts">
import type { ModerationRecord } from '~/composables/useSupportApi'
type AccountOption = { id: string, username: string, role: string }
const api = useSupportApi(); const accountsApi = useAdminAccountsApi(); const rows = ref<ModerationRecord[]>([]); const accounts = ref<AccountOption[]>([]); const message = ref(''); const form = reactive({ accountId: '', type: 'NOTE', reason: '' })
const load = async () => { try { const [history, result] = await Promise.all([api.moderation(), accountsApi.list({ pageSize: 100 })]) as [ModerationRecord[], { data: AccountOption[] }]; rows.value = history; accounts.value = result.data } catch { rows.value = []; message.value = 'Nao foi possivel carregar a moderacao.' } }
const apply = async () => { try { await api.moderate(form); Object.assign(form, { accountId: '', type: 'NOTE', reason: '' }); message.value = 'Acao registrada e auditada.'; await load() } catch { message.value = 'Nao foi possivel registrar a acao. Verifique sua permissao.' } }
onMounted(load); useSeoMeta({ title: 'Moderacao' })
</script>

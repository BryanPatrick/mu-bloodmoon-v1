<template>
  <dl class="grid gap-2 text-xs">
    <div><dt>Responsável</dt><dd>{{ task.assignee?.name || 'Não atribuído' }}</dd></div>
    <div><dt>Prioridade</dt><dd>{{ label(task.priority) }}</dd></div>
    <div><dt>Complexidade</dt><dd>{{ label(task.complexity) }}</dd></div>
    <div><dt>Prazo</dt><dd>{{ task.dueAt ? date(task.dueAt) : 'Sem prazo' }}</dd></div>
    <div><dt>Estimativa</dt><dd>{{ task.estimatedMinutes ?? '-' }} min</dd></div>
    <div><dt>Tempo realizado</dt><dd>{{ task.actualMinutes ?? '-' }} min</dd></div>
    <div><dt>Reaberturas / rejeições</dt><dd>{{ task.reopenedCount }} / {{ task.rejectedCount }}</dd></div>
    <div><dt>Revisão obrigatória</dt><dd>{{ task.approvalRequired ? 'Sim' : 'Não' }}</dd></div>
    <div v-if="task.entityType"><dt>Entidade principal</dt><dd>{{ task.entityType }} · {{ task.entityId }}</dd></div>
  </dl>
</template>
<script setup lang="ts">
defineProps<{ task: Record<string, any> }>()
const label = (value: unknown) => String(value || '').replaceAll('_', ' ')
const date = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
</script>
<style scoped>
div { display: grid; gap: 2px; border-bottom: 1px solid rgb(255 255 255 / .08); padding-bottom: 7px; }
dt { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; color: rgb(255 255 255 / .35); }
dd { color: rgb(255 255 255 / .75); }
</style>

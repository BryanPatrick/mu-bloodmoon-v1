<template>
  <ManagementShell>
    <AdminActivityLog
      kind="work"
      eyebrow="Auditoria"
      title="Logs de trabalho"
      description="Comprovação automática e manual das atividades executadas pelos administradores."
      empty-title="Nenhum trabalho registrado"
      empty-description="As ações administrativas passam a gerar registros automaticamente."
    />
  </ManagementShell>
</template>

<script setup lang="ts">
useSeoMeta({ title: 'Logs de trabalho' })
</script>

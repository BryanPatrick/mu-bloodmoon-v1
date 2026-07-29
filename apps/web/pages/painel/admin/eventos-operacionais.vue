<template>
  <ManagementShell>
    <AdminActivityLog
      kind="events"
      eyebrow="Operação"
      title="Eventos comerciais"
      description="Linha operacional de pedidos, pagamentos, entregas, escrow, anúncios e integrações."
      empty-title="Nenhum evento operacional"
      empty-description="Eventos de loja e marketplace serão registrados conforme os fluxos forem executados."
    />
  </ManagementShell>
</template>

<script setup lang="ts">
useSeoMeta({ title: 'Eventos comerciais' })
</script>

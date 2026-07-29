<template>
  <section class="bm-panel rounded-md p-3">
    <h2 class="text-xs font-black uppercase tracking-wider text-white/70">{{ title }}</h2>
    <div class="mt-3 grid gap-2">
      <div v-for="row in rows || []" :key="row[field]" class="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-white/8 pb-2 text-xs">
        <span>{{ format(row[field]) }}</span>
        <strong>{{ row._count?._all || 0 }}</strong>
        <small class="w-16 text-right text-white/35">{{ row._sum?.actualMinutes || 0 }} min</small>
      </div>
      <p v-if="!rows?.length" class="text-xs text-white/40">Sem dados.</p>
    </div>
  </section>
</template>
<script setup lang="ts">
defineProps<{ title: string; rows?: Record<string, any>[]; field: string }>()
const format = (value: unknown) => String(value || 'Não definido').replaceAll('_', ' ')
</script>

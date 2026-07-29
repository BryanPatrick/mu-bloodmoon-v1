<template>
  <div class="rounded-md border border-white/10 bg-white/[0.035] p-3">
    <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">{{ label }}</p>
    <p class="mt-1 break-words text-xs font-bold text-white/80" :class="{ 'font-mono': mono }">{{ value }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string; mono?: boolean }>()
</script>

<template>
  <div v-if="value !== null && value !== undefined" class="rounded-md border border-white/10 bg-black/20 p-3">
    <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white/40">{{ title }}</p>
    <pre class="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-5 text-white/65">{{ formatted }}</pre>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ title: string; value: unknown }>()
const formatted = computed(() => JSON.stringify(props.value, null, 2))
</script>

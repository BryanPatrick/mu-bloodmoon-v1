<template>
  <div
    class="grid min-h-64 place-items-center rounded-lg border border-dashed border-black/15 bg-white/40 p-8 text-center"
  >
    <div>
      <PackageSearch class="mx-auto size-9 text-black/20" />
      <p class="bm-kicker mt-3">{{ source }}</p>
      <h2 class="mt-2 font-display text-xl font-bold">Nenhum item encontrado</h2>
      <p class="bm-muted mt-2 text-sm">{{ description }}</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { PackageSearch } from 'lucide-vue-next'
defineProps<{ source: string; description: string }>()
</script>

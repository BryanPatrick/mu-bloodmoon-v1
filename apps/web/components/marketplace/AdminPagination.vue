<template>
  <footer v-if="total > 0" class="bm-glass flex items-center justify-between gap-3 rounded-md px-4 py-3 text-[10px] font-bold text-white/50">
    <span>{{ total }} registros</span>
    <div class="flex items-center gap-2">
      <UButton color="neutral" variant="soft" size="xs" :disabled="page <= 1" @click="$emit('change', page - 1)">
        Anterior
      </UButton>
      <span>{{ page }} / {{ totalPages }}</span>
      <UButton color="neutral" variant="soft" size="xs" :disabled="page >= totalPages" @click="$emit('change', page + 1)">
        Proxima
      </UButton>
    </div>
  </footer>
</template>

<script setup lang="ts">
defineProps<{ page: number, totalPages: number, total: number }>()
defineEmits<{ change: [page: number] }>()
</script>

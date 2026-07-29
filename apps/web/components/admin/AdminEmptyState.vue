<template>
  <div class="grid min-h-52 place-items-center rounded-md border border-dashed border-white/15 bg-white/[0.025] p-8 text-center">
    <div class="max-w-lg">
      <component :is="icon" v-if="icon" class="mx-auto size-7 text-white/35" />
      <p class="mt-3 font-display text-xl font-black uppercase">{{ title }}</p>
      <p class="mt-2 text-sm font-semibold leading-6 text-white/55">{{ description }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description: string
  icon?: unknown
}>()
</script>

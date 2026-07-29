<template>
  <header class="grid gap-4 border-b border-white/10 pb-5 lg:grid-cols-[1fr_auto] lg:items-end">
    <div>
      <p class="bm-kicker">{{ eyebrow }}</p>
      <h1 class="mt-2 font-display text-3xl font-black uppercase">{{ title }}</h1>
      <p class="mt-2 max-w-3xl text-sm font-semibold leading-6 text-white/62">{{ description }}</p>
    </div>
    <slot />
  </header>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  description: string
}>()
</script>

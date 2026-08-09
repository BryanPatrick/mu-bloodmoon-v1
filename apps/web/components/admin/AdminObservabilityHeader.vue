<template>
  <header class="grid gap-4 border-b border-[var(--bm-border)] pb-5 lg:grid-cols-[1fr_auto] lg:items-end">
    <div>
      <p class="bm-kicker">{{ eyebrow }}</p>
      <h1 class="bm-heading mt-2 text-3xl uppercase">{{ title }}</h1>
      <p class="bm-copy mt-2 max-w-3xl leading-6">{{ description }}</p>
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

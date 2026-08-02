<template>
  <section class="bm-page-hero">
    <div :class="containerClass" class="py-12 sm:py-16">
      <p class="bm-kicker">{{ kicker }}</p>
      <h1 class="mt-3 max-w-4xl font-display text-4xl font-bold sm:text-5xl">{{ title }}</h1>
      <p class="bm-muted mt-4 max-w-2xl text-sm leading-7 sm:text-base">{{ description }}</p>
      <slot />
    </div>
  </section>
</template>
<script setup lang="ts">
const props = withDefaults(defineProps<{ kicker: string; title: string; description: string; wide?: boolean }>(), { wide: false })
const containerClass = computed(() => (props.wide ? 'bm-guide-container' : 'bm-container'))
</script>

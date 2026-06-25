<template>
  <section class="bm-page-hero border-b border-white/10 bg-hero-blood bg-cover bg-center">
    <div :class="containerClass" class="flex flex-col justify-center py-[6px]">
      <p class="bm-kicker">{{ kicker }}</p>
      <h1 class="mt-[6px] max-w-3xl font-display text-3xl font-extrabold text-white sm:text-5xl">{{ title }}</h1>
      <p class="mt-[6px] max-w-2xl text-sm leading-6 text-zinc-300">{{ description }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  kicker: string
  title: string
  description: string
  wide?: boolean
}>(), {
  wide: false
})

const containerClass = computed(() => (props.wide ? 'bm-guide-container' : 'bm-container'))
</script>

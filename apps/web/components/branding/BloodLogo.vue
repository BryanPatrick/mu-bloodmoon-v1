<template>
  <NuxtLink to="/" class="flex items-center" aria-label="Blood Moon Home">
    <img
      src="/images/logo-bloodmoon.png"
      alt="Bloodmoon MU"
      width="160"
      height="80"
      decoding="async"
      fetchpriority="high"
      class="w-auto object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.38)]"
      :class="size === 'header' ? 'h-[76px]' : 'h-14'"
    />
  </NuxtLink>
</template>

<script setup lang="ts">
defineProps<{
  size?: 'default' | 'header'
}>()
</script>

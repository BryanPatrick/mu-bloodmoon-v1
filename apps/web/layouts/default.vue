<template>
  <div class="min-h-screen overflow-x-hidden">
    <SiteHeader />
    <main class="pt-20" :class="mainDensityClass">
      <slot />
    </main>
    <SiteFooter class="bm-density-compact" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const mainDensityClass = computed(() => (route.path === '/' ? '' : 'bm-density-compact'))
</script>

<script setup lang="ts">
defineProps<{ ad: { id: string; label: string; title: string; description: string; imageUrl: string; action: string; to: string }; compact?: boolean }>()
</script>

<template>
  <NuxtLink :to="ad.to" class="community-ad" :class="{ 'is-compact': compact }">
    <img :src="ad.imageUrl" alt="" aria-hidden="true">
    <span class="community-ad__shade" />
    <div>
      <small>{{ ad.label }}</small>
      <strong>{{ ad.title }}</strong>
      <p>{{ ad.description }}</p>
      <span>{{ ad.action }}</span>
    </div>
  </NuxtLink>
</template>

<style scoped>
.community-ad { position: relative; display: block; min-height: 178px; overflow: hidden; border-radius: 9px; background: var(--bm-dark); color: white; box-shadow: var(--shadow-panel); }
.community-ad img, .community-ad__shade { position: absolute; inset: 0; width: 100%; height: 100%; }
.community-ad img { object-fit: cover; transition: transform 300ms ease; }
.community-ad__shade { background: linear-gradient(90deg, rgb(16 16 16 / 0.94), rgb(70 6 8 / 0.54)); }
.community-ad > div { position: relative; z-index: 1; display: flex; min-height: 178px; flex-direction: column; align-items: flex-start; justify-content: flex-end; padding: 16px; }
.community-ad small { color: #f4b8b2; font-size: 0.56rem; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
.community-ad strong { margin-top: 5px; font-family: Cinzel, serif; font-size: 1rem; }
.community-ad p { margin-top: 4px; color: rgb(255 255 255 / 0.7); font-size: 0.66rem; line-height: 1.45; }
.community-ad div > span { margin-top: 10px; border-bottom: 1px solid rgb(255 255 255 / 0.5); font-size: 0.62rem; font-weight: 800; }
.community-ad:hover img { transform: scale(1.035); }
.community-ad.is-compact { min-height: 140px; }
.community-ad.is-compact > div { min-height: 140px; }
</style>

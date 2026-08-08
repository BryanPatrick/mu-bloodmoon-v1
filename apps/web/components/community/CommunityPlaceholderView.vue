<script setup lang="ts">
import { ArrowLeft, Construction } from 'lucide-vue-next'
defineProps<{ title: string }>()
</script>

<template>
  <section class="community-placeholder">
    <span><Construction class="size-6" /></span>
    <p class="bm-kicker">Community Blood Moon</p>
    <h1>{{ title }}</h1>
    <p>Esta área já está preparada na navegação e será construída nas próximas etapas da Community.</p>
    <UButton to="/comunidade" color="error" variant="soft"><ArrowLeft class="size-4" /> Voltar para a Home</UButton>
  </section>
</template>

<style scoped>
.community-placeholder { display: grid; min-height: 440px; place-items: center; align-content: center; border: 1px dashed var(--bm-border-strong); border-radius: 10px; background: var(--bm-surface-soft); padding: 30px; text-align: center; }
.community-placeholder > span { display: grid; width: 52px; height: 52px; place-items: center; border-radius: 50%; background: rgb(191 2 2 / 0.08); color: var(--bm-red); }
.community-placeholder .bm-kicker { margin-top: 14px; }.community-placeholder h1 { margin-top: 4px; color: var(--bm-heading); font-family: Cinzel, serif; font-size: 1.6rem; font-weight: 800; }.community-placeholder > p:not(.bm-kicker) { max-width: 480px; margin: 8px 0 18px; color: var(--bm-muted); font-size: 0.76rem; line-height: 1.6; }
</style>

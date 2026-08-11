<script setup lang="ts">
import { Construction } from 'lucide-vue-next'
defineProps<{ title: string, description?: string }>()
</script>

<template>
  <section class="guild-placeholder">
    <span><Construction class="size-6" /></span>
    <p class="bm-kicker">Guildas Blood Moon</p>
    <h1>{{ title }}</h1>
    <p>{{ description || 'Esta área já está preparada na estrutura da guild e será construída nas próximas etapas.' }}</p>
    <span class="guild-placeholder__badge">Em breve</span>
  </section>
</template>

<style scoped>
.guild-placeholder { display: grid; min-height: 320px; place-items: center; align-content: center; border: 1px dashed var(--bm-border-strong); border-radius: 10px; background: var(--bm-surface-soft); padding: 30px; text-align: center; }
.guild-placeholder > span:first-child { display: grid; width: 52px; height: 52px; place-items: center; border-radius: 50%; background: rgb(191 2 2 / 0.08); color: var(--bm-red); }
.guild-placeholder .bm-kicker { margin-top: 14px; }
.guild-placeholder h1 { margin-top: 4px; color: var(--bm-heading); font-family: Cinzel, serif; font-size: 1.4rem; font-weight: 800; }
.guild-placeholder > p:not(.bm-kicker) { max-width: 480px; margin: 8px 0 16px; color: var(--bm-muted); font-size: 0.76rem; line-height: 1.6; }
.guild-placeholder__badge { display: inline-flex; border-radius: 4px; border: 1px solid var(--bm-border-strong); padding: 5px 12px; color: var(--bm-muted); font-size: 0.62rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; }
</style>

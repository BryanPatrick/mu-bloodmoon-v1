<script setup lang="ts">
import { Construction } from 'lucide-vue-next'
</script>

<template>
  <aside class="community-right-rail">
    <section class="community-side-section community-side-empty">
      <span><Construction class="size-5" /></span>
      <p>
        Anúncios, eventos, tópicos em alta e sugestões de perfil ainda não estão disponíveis nesta
        área. Elas serão construídas em uma próxima etapa da Community -- nada aqui é inventado.
      </p>
    </section>
  </aside>
</template>

<style scoped>
.community-right-rail {
  display: grid;
  align-content: start;
  gap: 14px;
}
.community-side-section {
  border: 1px solid var(--bm-border);
  border-radius: 9px;
  background: var(--bm-surface-soft);
  padding: 14px;
  box-shadow: var(--shadow-panel);
}
.community-side-empty {
  display: grid;
  justify-items: center;
  gap: 10px;
  border-style: dashed;
  padding: 22px 16px;
  text-align: center;
}
.community-side-empty span {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 50%;
  background: rgb(191 2 2 / 0.08);
  color: var(--bm-red);
}
.community-side-empty p {
  color: var(--bm-muted);
  font-size: 0.68rem;
  line-height: 1.55;
}
</style>

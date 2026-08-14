<template>
  <section class="bm-dashboard-shell grid gap-4 p-4">
    <header>
      <p class="bm-kicker">Operação de jogo</p>
      <h1 class="mt-2 font-display text-3xl font-black uppercase">Painel Game Master</h1>
      <p class="mt-2 text-sm font-semibold text-white/60">
        Olá, {{ user?.name }}. Esta área é exclusiva para funções operacionais de GM e ainda está em construção.
      </p>
    </header>

    <section class="bm-dashboard-card p-5">
      <h2 class="font-display text-xl font-black uppercase">Em preparação</h2>
      <p class="mt-3 max-w-2xl text-sm text-white/55">
        O módulo completo de Game Master (eventos, ocorrências, validações e moderação operacional) ainda não foi
        construído. Esta tela confirma que a role GM já está corretamente reconhecida pelo sistema, com acesso
        limitado às ferramentas abaixo.
      </p>
      <div class="mt-4 grid gap-2">
        <NuxtLink to="/painel/personagens" class="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black hover:border-ember/50">
          Consultar personagens
        </NuxtLink>
        <NuxtLink to="/guilds" class="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black hover:border-ember/50">
          Consultar guildas
        </NuxtLink>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
const { user } = useAuth()
</script>

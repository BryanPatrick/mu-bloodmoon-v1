<template>
  <section class="bm-container grid min-h-[calc(100vh-5rem)] place-items-center py-14">
    <div class="bm-panel w-full max-w-2xl rounded-md p-6">
      <p class="bm-kicker">Seguranca</p>
      <h1 class="bm-heading mt-2 font-display text-3xl font-bold">Recuperar conta</h1>

      <div class="mt-6 grid gap-5">
        <p
          class="rounded-md border border-amber-300/25 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-100"
        >
          A recuperacao por e-mail ainda nao esta disponivel. Nenhuma solicitacao foi enviada.
        </p>
        <NuxtLink
          class="bm-button-glass w-fit rounded-md px-5 py-3 text-center text-sm font-bold"
          to="/login"
        >
          Voltar ao login
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
useSeoMeta({ title: 'Recuperar conta' })
</script>

<template>
  <main class="grid min-h-[70vh] place-items-center px-6 py-16 text-white">
    <section class="bm-liquid-card w-full max-w-xl p-8 text-center">
      <ShieldX class="mx-auto size-10 text-ember" />
      <p class="bm-kicker mt-5">Acesso protegido</p>
      <h1 class="mt-2 font-display text-3xl font-black uppercase">Acesso negado</h1>
      <p class="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-white/65">
        Sua conta não possui permissão para acessar esta área.
      </p>
      <NuxtLink :to="safeReturn" class="mt-6 inline-flex rounded-xl bg-ember px-5 py-3 text-sm font-black text-zinc-950">
        Voltar ao painel
      </NuxtLink>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ShieldX } from 'lucide-vue-next'

const route = useRoute()
const safeReturn = computed(() => {
  const requested = String(route.query.retorno || '/painel')
  return requested.startsWith('/') && !requested.startsWith('//') ? requested : '/painel'
})

useSeoMeta({ title: 'Acesso negado' })
</script>

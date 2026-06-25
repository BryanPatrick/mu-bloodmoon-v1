<template>
  <div>
    <PageHero kicker="Institucional" title="About Blood Moon" description="História fictícia, diferenciais, equipe, redes sociais e contato para a primeira versão do portal oficial." />
    <section class="bm-container grid gap-8 py-14 lg:grid-cols-[1fr_380px]">
      <div class="grid gap-6">
        <article class="bm-panel rounded-md p-6">
          <p class="bm-kicker">História</p>
          <h2 class="mt-2 font-display text-3xl font-bold text-white">A origem da Lua Rubra</h2>
          <p class="mt-5 text-sm leading-7 text-zinc-300">
            Blood Moon nasceu como um refúgio para guerreiros que buscavam uma temporada intensa, justa e memorável. A equipe fictícia do servidor une nostalgia, balanceamento moderno e eventos personalizados para criar uma jornada de progressão clara, competitiva e recompensadora.
          </p>
        </article>

        <article class="bm-panel rounded-md p-6">
          <p class="bm-kicker">Diferenciais</p>
          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <div v-for="item in differentials" :key="item" class="rounded-md border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-zinc-200">{{ item }}</div>
          </div>
        </article>

        <article id="contato" class="bm-panel rounded-md p-6">
          <p class="bm-kicker">Contato</p>
          <h2 class="mt-2 font-display text-3xl font-bold text-white">Fale com a equipe</h2>
          <form class="mt-6 grid gap-4">
            <input class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Nome" />
            <input class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="E-mail" />
            <input class="rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Assunto" />
            <textarea class="min-h-32 rounded-md border border-white/10 bg-black/[0.35] px-4 py-3 text-sm outline-none focus:border-blood-400" placeholder="Mensagem" />
            <button class="w-fit rounded-md bg-blood-700 px-5 py-3 text-sm font-bold text-white" type="button">Enviar Mensagem</button>
          </form>
        </article>
      </div>

      <aside class="grid content-start gap-6">
        <div class="bm-panel rounded-md p-6">
          <h2 class="font-display text-2xl font-bold text-white">Configurações</h2>
          <div class="mt-5 grid gap-3">
            <div v-for="stat in store.serverStats" :key="stat.label" class="flex justify-between border-b border-white/10 pb-3 text-sm">
              <span class="text-zinc-400">{{ stat.label }}</span>
              <strong class="text-moon">{{ stat.value }}</strong>
            </div>
          </div>
        </div>
        <div class="bm-panel rounded-md p-6">
          <h2 class="font-display text-2xl font-bold text-white">Equipe</h2>
          <div class="mt-5 grid gap-3 text-sm text-zinc-300">
            <p>Administrador Geral: Moonkeeper</p>
            <p>Game Master: Asterion</p>
            <p>Moderadores: Lyra, Darius</p>
            <p>Desenvolvedores: Core Forge</p>
          </div>
        </div>
        <div class="bm-panel rounded-md p-6">
          <h2 class="font-display text-2xl font-bold text-white">Redes sociais</h2>
          <div class="mt-5 flex flex-wrap gap-2">
            <a v-for="social in socials" :key="social" href="#" class="rounded-md border border-white/10 px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10">{{ social }}</a>
          </div>
        </div>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useSiteStore } from '~/stores/site'

useSeoMeta({ title: 'About' })
const store = useSiteStore()
const differentials = ['Balanceamento exclusivo', 'Eventos personalizados', 'Economia estável', 'Progressão equilibrada', 'Comunidade ativa', 'Suporte próximo']
const socials = ['Discord', 'Facebook', 'Instagram', 'YouTube', 'Twitch']
</script>

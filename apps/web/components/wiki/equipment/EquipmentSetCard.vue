<template>
  <EquipmentFrame :family="frameFamily" class="h-full">
    <article class="equipment-set-card group flex h-full min-h-[360px] flex-col">
      <header class="flex min-h-12 items-center justify-center border-b border-white/10 bg-black/35 px-3 py-2 text-center">
        <h4 class="line-clamp-2 font-display text-sm font-black uppercase leading-tight text-white" :title="name">
          {{ name }}
        </h4>
      </header>

      <button
        class="relative grid min-h-[180px] flex-1 place-items-center overflow-hidden border-b border-white/10 bg-black/25 p-5 text-left"
        type="button"
        :aria-label="`Visualizar ${name}`"
        @click="emit('select')"
      >
        <img
          v-if="image"
          :src="image"
          :alt="`${name} preview`"
          class="max-h-[155px] max-w-[82%] object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.6)] transition duration-200 group-hover:scale-[1.03]"
          loading="lazy"
          decoding="async"
        >
        <span v-else class="max-w-[12rem] text-center font-display text-xl font-black uppercase leading-tight text-white/20">
          {{ name }}
          <small class="mt-2 block font-sans text-[9px] tracking-[0.16em] text-white/40">Imagem pendente</small>
        </span>
      </button>

      <div class="flex flex-col gap-3 p-4">
        <div class="flex flex-wrap justify-center gap-1.5" aria-label="Caracteristicas do equipamento">
          <span
            v-for="setType in setTypes"
            :key="setType"
            class="equipment-set-card__quality flex min-h-7 basis-[calc(33.333%-0.375rem)] items-center justify-center rounded-sm border px-1.5 py-1 text-center text-[8px] font-black uppercase leading-tight tracking-[0.08em]"
            :style="badgeStyle"
          >
            {{ setType }}
          </span>
        </div>

        <div class="border-t border-white/8 pt-3 text-center">
          <p class="text-[8px] font-black uppercase tracking-[0.16em] text-zinc-500">Partes do equipamento</p>
          <p class="equipment-set-card__description mt-1.5 line-clamp-3 min-h-8 text-[10px] leading-4 text-zinc-300">{{ pieces.join(', ') || 'Pecas a catalogar' }}</p>
        </div>

        <div v-if="displayChibis.length" class="border-t border-white/8 pt-3">
          <p class="text-center text-[8px] font-black uppercase tracking-[0.16em] text-zinc-500">Personagens compativeis</p>
          <div class="mt-2 flex flex-wrap justify-center gap-2">
            <span
              v-for="character in displayChibis"
              :key="character.name"
              class="equipment-set-card__character grid size-10 place-items-center overflow-hidden rounded-sm border border-white/10 bg-white/[0.045]"
              :title="character.name"
              :aria-label="character.name"
              role="img"
            >
              <img
                :src="character.image"
                :alt="character.name"
                class="size-full object-contain p-0.5"
                loading="lazy"
                decoding="async"
              >
            </span>
          </div>
        </div>
        <div v-else class="flex flex-wrap justify-center gap-1.5 border-t border-white/8 pt-3">
          <span
            v-for="className in classes"
            :key="className"
            class="equipment-set-card__class rounded-sm border border-white/10 bg-white/[0.045] px-2 py-1 text-[9px] font-bold text-zinc-300"
          >
            {{ className }}
          </span>
        </div>

        <button
          class="mt-auto w-full rounded-sm border border-white/14 bg-white/[0.06] px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-white transition hover:border-ember/60 hover:bg-ember/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
          type="button"
          @click="emit('select')"
        >
          Ver equipamento
        </button>
      </div>
    </article>
  </EquipmentFrame>
</template>

<script setup lang="ts">
import type { EquipmentFrameFamily } from './types'

const props = defineProps<{
  name: string
  image?: string
  classes: string[]
  characterChibis?: Array<{ name: string, image: string }>
  setTypes: string[]
  pieces: string[]
}>()

const emit = defineEmits<{
  select: []
}>()

const enhancedNames = ['soul', 'blue eye', 'silver heart', 'manticore', 'brilliant']
const masteryNames = ['bloodangel', 'darkangel', 'holyangel']

const frameFamily = computed<EquipmentFrameFamily>(() => {
  const classification = `${props.name} ${props.setTypes.join(' ')}`.toLowerCase()

  if (enhancedNames.some((name) => classification.includes(name))) return 'enhanced-ancient'
  if (masteryNames.some((name) => classification.includes(name)) || classification.includes('mastery')) return 'mastery-ancient'
  if (classification.includes('socket')) return 'socket'
  if (classification.includes('ancient blue') || classification.includes('ancient azul')) return 'ancient-blue'
  if (classification.includes('ancient')) return 'ancient'
  if (classification.includes('excellent')) return 'excellent'
  if (classification.includes('lucky') || classification.includes('luck set')) return 'lucky'

  return 'normal'
})

const displayChibis = computed(() => props.characterChibis || [])

const badgeStyle = computed(() => ({
  color: 'var(--frame-primary)',
  borderColor: 'color-mix(in srgb, var(--frame-primary) 38%, transparent)',
  background: 'color-mix(in srgb, var(--frame-primary) 9%, rgba(0, 0, 0, 0.5))'
}))
</script>

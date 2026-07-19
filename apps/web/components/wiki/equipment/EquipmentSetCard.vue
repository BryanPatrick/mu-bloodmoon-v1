<template>
  <EquipmentFrame :family="frameFamily" class="h-full">
    <article class="equipment-set-card group flex h-full min-h-[360px] flex-col">
      <button
        class="relative grid min-h-[180px] flex-1 place-items-center overflow-hidden border-b border-white/10 bg-black/25 p-5 text-left"
        type="button"
        :aria-label="`Visualizar ${name}`"
        @click="emit('select')"
      >
        <span class="absolute left-3 top-3 rounded-sm border border-white/10 bg-black/65 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-ember">
          Tier {{ tierLabel }}
        </span>
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
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[9px] font-black uppercase tracking-[0.18em] text-ember">{{ characterName }}</p>
            <h4 class="mt-1 line-clamp-2 font-display text-lg font-black uppercase leading-tight text-white">{{ name }}</h4>
          </div>
          <span class="shrink-0 rounded-sm border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em]" :style="badgeStyle">
            {{ primaryType }}
          </span>
        </div>

        <p class="equipment-set-card__description line-clamp-2 min-h-8 text-[10px] leading-4 text-zinc-400">{{ pieces.join(', ') || 'Pecas a catalogar' }}</p>

        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="className in visibleClasses"
            :key="className"
            class="equipment-set-card__class rounded-sm border border-white/10 bg-white/[0.045] px-2 py-1 text-[9px] font-bold text-zinc-300"
          >
            {{ className }}
          </span>
          <span v-if="remainingClassCount" class="equipment-set-card__class px-1 py-1 text-[9px] font-black text-zinc-500">+{{ remainingClassCount }}</span>
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
  tierLabel: string
  image?: string
  characterName: string
  classes: string[]
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

const primaryType = computed(() => props.setTypes[0] || 'Normal')
const visibleClasses = computed(() => props.classes.slice(0, 2))
const remainingClassCount = computed(() => Math.max(0, props.classes.length - visibleClasses.value.length))

const badgeStyle = computed(() => ({
  color: 'var(--frame-primary)',
  borderColor: 'color-mix(in srgb, var(--frame-primary) 38%, transparent)',
  background: 'color-mix(in srgb, var(--frame-primary) 9%, rgba(0, 0, 0, 0.5))'
}))
</script>

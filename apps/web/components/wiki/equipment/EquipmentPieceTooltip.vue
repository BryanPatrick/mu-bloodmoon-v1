<script setup lang="ts">
type EquipmentQuality = 'normal' | 'excellent' | 'ancient' | 'socket' | 'masteryAncient' | 'lucky'

type EquipmentPieceTooltip = {
  label: string
  displayTitle: string
  image?: string
  defenseLabel: string
  defense: string | number | null
  durability?: string | number | null
  requiredLevel?: string | number | null
  requiredStrength?: string | number | null
  requiredAgility?: string | number | null
  requiredVitality?: string | number | null
  requiredEnergy?: string | number | null
  requiredCommand?: string | number | null
  speedLabel?: string
  speedValue?: string
  usableBy: string[]
}

const props = defineProps<{
  piece: EquipmentPieceTooltip
  quality: EquipmentQuality
}>()

const titleClass = computed(() => ({
  'text-emerald-400': props.quality === 'excellent',
  'text-lime-400': props.quality === 'ancient',
  'text-violet-300': props.quality === 'socket',
  'text-amber-300': props.quality === 'masteryAncient' || props.quality === 'lucky',
  'text-zinc-100': props.quality === 'normal'
}))

const hasValue = (value: string | number | null | undefined) =>
  value !== null && value !== undefined && value !== '' && value !== '-' && value !== '~' && value !== 0

const statRows = computed(() => [
  { label: props.piece.defenseLabel, value: props.piece.defense },
  {
    label: 'Durability',
    value: hasValue(props.piece.durability) ? `${props.piece.durability}/${props.piece.durability}` : undefined
  },
  { label: 'Minimum level required', value: props.piece.requiredLevel },
  { label: 'Strength available', value: props.piece.requiredStrength },
  { label: 'Agility available', value: props.piece.requiredAgility },
  { label: 'Vitality available', value: props.piece.requiredVitality },
  { label: 'Energy available', value: props.piece.requiredEnergy },
  { label: 'Command available', value: props.piece.requiredCommand },
  { label: props.piece.speedLabel || '', value: props.piece.speedValue }
].filter((row) => row.label && hasValue(row.value)))
</script>

<template>
  <article class="equipment-piece-tooltip">
    <header class="text-center">
      <h4 class="font-display text-[0.92rem] font-black leading-tight" :class="titleClass">
        {{ piece.displayTitle }}
      </h4>
    </header>

    <div class="mt-2.5 grid min-h-28 place-items-center">
      <img
        v-if="piece.image"
        :src="piece.image"
        :alt="piece.displayTitle"
        class="max-h-28 max-w-32 object-contain [image-rendering:auto]"
        loading="lazy"
        decoding="async"
      >
      <span v-else class="text-center text-[0.62rem] font-black uppercase tracking-[0.16em] text-zinc-600">
        {{ piece.label }} sem imagem
      </span>
    </div>

    <dl class="mt-2.5 grid gap-0.5 text-center text-[0.68rem] leading-[1.15rem] text-zinc-100">
      <div v-for="row in statRows" :key="row.label">
        <dt class="inline text-zinc-300">{{ row.label }}:</dt>
        <dd class="ml-1 inline font-bold text-white">{{ row.value }}</dd>
      </div>
    </dl>

    <p v-if="piece.usableBy.length" class="mt-2.5 border-t border-white/10 pt-2.5 text-center text-[0.68rem] font-semibold leading-4 text-zinc-100">
      Can be equipped by {{ piece.usableBy.join(', ') }}
    </p>
  </article>
</template>

<style scoped>
.equipment-piece-tooltip {
  min-width: 0;
  border: 1px solid rgb(255 255 255 / 0.12);
  border-radius: 6px;
  background:
    linear-gradient(180deg, rgb(8 29 40 / 0.9), rgb(8 17 25 / 0.97)),
    #081119;
  padding: 0.75rem;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.04),
    0 12px 30px rgb(0 0 0 / 0.24);
}
</style>

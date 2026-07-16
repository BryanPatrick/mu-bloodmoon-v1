<template>
  <article class="bm-panel rounded-md p-5">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="bm-kicker">{{ kicker }}</p>
        <h2 class="mt-[6px] font-display text-2xl font-black uppercase text-white">{{ title }}</h2>
      </div>
      <span class="rounded-sm bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
        {{ rows.length }} registros
      </span>
    </div>

    <div class="mt-5 overflow-hidden rounded-md border border-white/10">
      <div class="grid grid-cols-[1fr_110px] bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
        <span>Nome</span>
        <span>{{ valueLabel }}</span>
      </div>
      <div class="max-h-[360px] overflow-y-auto">
        <div v-for="row in rows" :key="row.name" class="grid grid-cols-[1fr_110px] border-t border-white/10 px-4 py-3">
          <span class="min-w-0 truncate text-sm font-black text-white">{{ row.name }}</span>
          <span class="text-xs font-bold text-white/55">{{ value(row) }}</span>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
type LegacyRow = {
  name: string
  bytes?: number
  files?: number
  dirs?: number
}

const props = withDefaults(defineProps<{
  title: string
  kicker: string
  rows: LegacyRow[]
  valueLabel?: string
  valueKey?: 'bytes' | 'files' | 'dirs'
}>(), {
  valueLabel: 'KB',
  valueKey: 'bytes'
})

const value = (row: LegacyRow) => {
  const raw = Number(row[props.valueKey] || 0)
  if (props.valueKey === 'bytes') {
    return Math.max(1, Math.round(raw / 1024)).toLocaleString('pt-BR')
  }

  return raw.toLocaleString('pt-BR')
}
</script>

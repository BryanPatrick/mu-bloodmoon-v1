<template>
  <div class="bm-panel flex min-h-20 items-center gap-3 rounded-md p-3">
    <component :is="iconComponent" class="size-4 shrink-0" :class="toneClass" />
    <span><small class="block text-[9px] font-black uppercase tracking-wider text-white/38">{{ label }}</small><strong class="mt-1 block text-lg">{{ value ?? 0 }}</strong></span>
  </div>
</template>

<script setup lang="ts">
import { BadgeCheck, Boxes, CircleCheckBig, ClockAlert, FileDiff, ListTodo, MousePointerClick, RotateCcw, ScanSearch, ScrollText, Siren, Timer, TriangleAlert, UserRoundX } from 'lucide-vue-next'

const props = defineProps<{ label: string; value: string | number | undefined; icon: string; tone?: string }>()
const icons: Record<string, any> = { BadgeCheck, Boxes, CircleCheckBig, ClockAlert, FileDiff, ListTodo, MousePointerClick, RotateCcw, ScanSearch, ScrollText, Siren, Timer, TriangleAlert, UserRoundX }
const iconComponent = computed(() => icons[props.icon] || ListTodo)
const toneClass = computed(() => props.tone === 'danger' ? 'text-red-300' : props.tone === 'warning' ? 'text-amber-300' : props.tone === 'success' ? 'text-emerald-300' : 'text-ember')
</script>

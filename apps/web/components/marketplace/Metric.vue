<template><div class="rounded-md border border-white/10 bg-white/5 p-3"><span class="text-[9px] font-black uppercase tracking-[.16em] text-white/40">{{ label }}</span><strong class="mt-2 block font-display text-2xl">{{ Number(value).toLocaleString('pt-BR') }}</strong></div></template>
<script setup lang="ts">defineProps<{ label: string, value: number }>()</script>

<template><button class="min-h-9 rounded-md border px-3 py-2 text-[10px] font-black transition" :class="danger?'border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20':'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'" type="button"><slot />{{ label }}</button></template>
<script setup lang="ts">defineProps<{label:string,danger?:boolean}>()</script>

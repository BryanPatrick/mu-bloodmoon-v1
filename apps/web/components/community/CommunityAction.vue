<template><button class="min-h-9 rounded-md border px-3 py-2 text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-40" :class="danger?'border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/20':'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'" type="button" :disabled="busy"><slot />{{ label }}</button></template>
<script setup lang="ts">
defineProps<{label:string,danger?:boolean}>()
// A single admin-panel-wide busy flag (provided by CommunityAdminManager's
// run() helper) disables every action button while any moderation/catalog
// mutation is in flight -- prevents a fast double-click from firing the same
// action twice (or a different action while one is still resolving).
const busy = inject('communityAdminBusy', ref(false))
</script>

<template>
  <svg class="blood-moon-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <g v-if="name === 'season'">
      <path d="M12 7h24v34l-12-6-12 6V7Z"/><path d="m24 14 2.4 5 5.6.8-4 3.9.9 5.6-4.9-2.7-4.9 2.7.9-5.6-4-3.9 5.6-.8 2.4-5Z"/>
    </g>
    <g v-else-if="name === 'xp'">
      <path d="m24 4 20 20-20 20L4 24 24 4Z"/><path d="m17 18 14 12M31 18 17 30"/>
    </g>
    <g v-else-if="name === 'drop'">
      <path d="M8 16h32l-3 8H11l-3-8Z"/><path d="M11 24v16h26V24M16 16l3-8h10l3 8M20 30h8"/>
    </g>
    <g v-else-if="name === 'reset'">
      <path d="M36 14V6l-5 5a17 17 0 1 0 8 18"/><path d="M12 34v8l5-5"/>
    </g>
    <g v-else-if="name === 'master'">
      <path d="M24 3 28 19l16 5-16 5-4 16-4-16-16-5 16-5 4-16Z"/><circle cx="24" cy="24" r="4"/>
    </g>
    <g v-else-if="name === 'status'">
      <path d="M24 4c7 5 13 6 17 7v12c0 11-7 18-17 22C14 41 7 34 7 23V11c4-1 10-2 17-7Z"/><path d="M24 14v20M14 24h20"/>
    </g>
    <g v-else-if="name === 'swords'">
      <path d="m8 6 12 12-4 4L4 10 8 6Zm32 0L28 18l4 4 12-12-4-4Z"/><path d="m17 21 14 14M31 21 17 35M12 34l-6 8M36 34l6 8"/>
    </g>
    <g v-else-if="name === 'helmet'">
      <path d="M8 27C8 14 15 6 24 4c9 2 16 10 16 23l-8-5v17l-8 5-8-5V22l-8 5Z"/><path d="M16 22h16M24 6v16"/>
    </g>
    <g v-else-if="name === 'trophy'">
      <path d="M14 6h20v8c0 9-4 14-10 14s-10-5-10-14V6Z"/><path d="M14 10H7v4c0 7 4 10 10 10M34 10h7v4c0 7-4 10-10 10M24 28v8M16 42h16M19 36h10"/>
    </g>
    <g v-else-if="name === 'book'">
      <path d="M5 8h13c4 0 6 2 6 6v28c0-4-2-6-6-6H5V8Zm38 0H30c-4 0-6 2-6 6v28c0-4 2-6 6-6h13V8Z"/><path d="M24 14v28"/>
    </g>
    <g v-else-if="name === 'characters'">
      <path d="M24 3 35 9l7 12-5 17-13 7-13-7-5-17L13 9l11-6Z"/><circle cx="24" cy="18" r="7"/><path d="M12 38c2-9 7-13 12-13s10 4 12 13"/>
    </g>
    <g v-else-if="name === 'items'">
      <path d="M7 15 24 6l17 9-17 9L7 15Z"/><path d="M7 15v20l17 9 17-9V15M24 24v20"/><path d="m15 11 17 9"/>
    </g>
    <g v-else-if="name === 'maps'">
      <circle cx="24" cy="24" r="18"/><circle cx="24" cy="24" r="11"/><path d="m24 10 5 14-5 14-5-14 5-14Z"/><path d="M6 24h36"/>
    </g>
    <g v-else-if="name === 'progress'">
      <path d="m24 3 4 12 12 4-9 8 3 13-10-7-10 7 3-13-9-8 12-4 4-12Z"/><path d="M24 10v23"/>
    </g>
    <g v-else-if="name === 'systems'">
      <circle cx="24" cy="24" r="8"/><path d="M24 3v8M24 37v8M3 24h8M37 24h8M9 9l6 6M33 33l6 6M39 9l-6 6M15 33l-6 6"/><path d="M24 7c10 0 17 7 17 17s-7 17-17 17S7 34 7 24 14 7 24 7Z"/>
    </g>
    <g v-else>
      <path d="m24 4 17 10v20L24 44 7 34V14L24 4Z"/><path d="M16 17h16M16 24h16M16 31h10"/>
    </g>
  </svg>
</template>

<script setup lang="ts">
defineProps<{ name: string }>()
</script>

<style scoped>
.blood-moon-icon{display:block;width:1em;height:1em;overflow:visible;stroke:currentColor;stroke-width:1.55;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
</style>

<template>
  <div class="overflow-hidden rounded-md border border-white/10">
    <table class="w-full min-w-[680px] text-left text-sm">
      <thead class="bg-white/10 text-xs uppercase tracking-[0.18em] text-moon">
        <tr>
          <th class="px-5 py-4">Posição</th>
          <th class="px-5 py-4">Jogador</th>
          <th class="px-5 py-4">Classe</th>
          <th class="px-5 py-4">Pontuação</th>
          <th class="px-5 py-4">Guild</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-white/10">
        <tr v-for="row in rows" :key="row.pos" class="bg-zinc-950/50">
          <td class="px-5 py-4 font-display text-lg font-bold text-ember">#{{ row.pos }}</td>
          <td class="px-5 py-4 font-bold text-white">{{ row.name }}</td>
          <td class="px-5 py-4 text-zinc-300">{{ row.class }}</td>
          <td class="px-5 py-4 text-zinc-300">{{ row.score }}</td>
          <td class="px-5 py-4 text-zinc-300">{{ row.guild }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  rows: Array<{ pos: number; name: string; class: string; score: string; guild: string }>
}>()
</script>

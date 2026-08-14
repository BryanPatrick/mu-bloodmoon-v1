<template>
  <div class="ranking-table-wrap">
    <table class="ranking-table">
      <thead>
        <tr>
          <th>Posição</th>
          <th>Jogador</th>
          <th>Classe</th>
          <th>Pontuação</th>
          <th>Guild</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.pos">
          <td class="ranking-table__pos">#{{ row.pos }}</td>
          <td class="ranking-table__name">{{ row.name }}</td>
          <td>{{ row.class }}</td>
          <td>{{ row.score }}</td>
          <td>{{ row.guild }}</td>
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

<style scoped>
.ranking-table-wrap { overflow-x: auto; border: 1px solid var(--bm-border); border-radius: 10px; }
.ranking-table { width: 100%; min-width: 680px; border-collapse: collapse; text-align: left; font-size: 0.85rem; }
.ranking-table thead { background: var(--bm-surface); }
.ranking-table th {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--bm-border);
  color: var(--bm-muted);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.ranking-table tbody tr { border-bottom: 1px solid var(--bm-border); background: var(--bm-surface-strong); transition: background-color 150ms ease; }
.ranking-table tbody tr:last-child { border-bottom: 0; }
.ranking-table tbody tr:hover { background: var(--bm-surface); }
.ranking-table td { padding: 1rem 1.25rem; color: var(--bm-text); }
.ranking-table__pos { font-family: Cinzel, Georgia, serif; font-size: 1.1rem; font-weight: 800; color: var(--bm-red); }
.ranking-table__name { font-weight: 800; color: var(--bm-heading); }
</style>

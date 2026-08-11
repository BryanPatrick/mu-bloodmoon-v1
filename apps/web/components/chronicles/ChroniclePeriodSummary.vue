<template>
  <article class="chronicle-period">
    <div class="chronicle-period__icon"><component :is="icon" class="size-5" /></div>
    <p class="chronicle-period__eyebrow">{{ period.eyebrow }}</p>
    <h3>{{ period.title }}</h3>
    <p>{{ period.description }}</p>
    <ul>
      <li v-for="topic in period.topics" :key="topic">{{ topic }}</li>
    </ul>
    <span class="chronicle-period__state">Dados reais ainda não conectados</span>
  </article>
</template>

<script setup lang="ts">
import { CalendarDays, CalendarRange, History } from 'lucide-vue-next'
import type { ChroniclePeriod } from '~/types/chronicles'

const props = defineProps<{ period: ChroniclePeriod }>()
const icon = computed(() => {
  if (props.period.id === 'yesterday') return History
  if (props.period.id === 'week') return CalendarDays
  return CalendarRange
})
</script>

<style scoped>
.chronicle-period {
  position: relative;
  padding: 28px;
  border-top: 1px solid #8d2426;
  background: #151213;
}
.chronicle-period__icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid rgb(194 150 88 / 0.3);
  color: #c69a5d;
}
.chronicle-period__eyebrow {
  margin-top: 20px;
  color: #a3292a !important;
  font-size: 9px !important;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.chronicle-period h3 {
  margin-top: 7px;
  color: #f0e8df;
  font-family: Cinzel, Georgia, serif;
  font-size: 1.1rem;
  font-weight: 800;
  text-transform: uppercase;
}
.chronicle-period p {
  margin-top: 12px;
  color: #968d85;
  font-size: 12px;
  line-height: 1.65;
}
.chronicle-period ul {
  display: grid;
  gap: 7px;
  margin-top: 18px;
  color: #c3b8ae;
  font-family: Georgia, serif;
  font-size: 12px;
}
.chronicle-period li::before {
  margin-right: 8px;
  color: #8e292a;
  content: '◆';
  font-size: 7px;
}
.chronicle-period__state {
  display: block;
  margin-top: 22px;
  border-top: 1px solid rgb(255 255 255 / 0.07);
  padding-top: 14px;
  color: #6f6760;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
</style>

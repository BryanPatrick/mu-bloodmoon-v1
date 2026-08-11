<template>
  <section class="chronicle-future" :class="`chronicle-future--${variant}`">
    <div>
      <p>{{ eyebrow }}</p>
      <h2>{{ title }}</h2>
      <span>{{ description }}</span>
    </div>
    <button type="button" disabled>
      <component :is="icon" class="size-4" />
      Em breve
    </button>
  </section>
</template>

<script setup lang="ts">
import { Film, Volume2 } from 'lucide-vue-next'

const props = defineProps<{
  eyebrow: string
  title: string
  description: string
  variant: 'audio' | 'cinematic'
}>()
const icon = computed(() => (props.variant === 'audio' ? Volume2 : Film))
</script>

<style scoped>
.chronicle-future {
  position: relative;
  display: flex;
  min-height: 210px;
  align-items: end;
  justify-content: space-between;
  gap: 28px;
  overflow: hidden;
  border: 1px solid rgb(205 166 105 / 0.2);
  padding: clamp(28px, 5vw, 60px);
  background: #151213;
}
.chronicle-future--cinematic {
  min-height: 340px;
  background:
    linear-gradient(90deg, rgb(11 9 10 / 0.96), rgb(11 9 10 / 0.35)),
    url('/images/guide-dark-lord-hero.png') center 32% / cover;
}
.chronicle-future p {
  color: #bc8f52;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.chronicle-future h2 {
  max-width: 680px;
  margin-top: 10px;
  color: #f7efe6;
  font-family: Cinzel, Georgia, serif;
  font-size: clamp(1.7rem, 4vw, 3.5rem);
  font-weight: 800;
  line-height: 1.08;
  text-transform: uppercase;
}
.chronicle-future span {
  display: block;
  max-width: 620px;
  margin-top: 14px;
  color: #a89e95;
  font-family: Georgia, serif;
  font-size: 14px;
  line-height: 1.65;
}
.chronicle-future button {
  display: inline-flex;
  min-height: 42px;
  flex: 0 0 auto;
  align-items: center;
  gap: 9px;
  border: 1px solid rgb(210 173 111 / 0.35);
  padding: 0 18px;
  color: #8f867e;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
@media (max-width: 700px) {
  .chronicle-future {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

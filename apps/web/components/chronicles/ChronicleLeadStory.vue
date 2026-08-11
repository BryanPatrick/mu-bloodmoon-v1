<template>
  <article class="chronicle-lead" :style="imageStyle">
    <div class="chronicle-lead__content">
      <div class="chronicle-story-meta">
        <span>{{ story.category }}</span>
        <span>{{ formattedDate }}</span>
        <span v-if="story.isDemo">Demonstração</span>
      </div>
      <h2>{{ story.title }}</h2>
      <p>{{ story.summary }}</p>
      <a class="chronicle-lead__cta" href="#ultimas">
        Ler matéria
        <ArrowDown class="size-4" />
      </a>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ArrowDown } from 'lucide-vue-next'
import type { ChronicleStory } from '~/types/chronicles'

const props = defineProps<{ story: ChronicleStory }>()
const formattedDate = computed(() =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(
    new Date(props.story.publishedAt)
  )
)
const imageStyle = computed(() =>
  props.story.image ? { backgroundImage: `url("${props.story.image}")` } : undefined
)
</script>

<style scoped>
.chronicle-lead {
  position: relative;
  min-height: 540px;
  overflow: hidden;
  border: 1px solid rgb(209 171 109 / 0.2);
  background-color: #121011;
  background-position: center;
  background-size: cover;
}
.chronicle-lead::before {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      90deg,
      rgb(10 8 9 / 0.97) 0%,
      rgb(10 8 9 / 0.88) 38%,
      rgb(10 8 9 / 0.2) 72%,
      rgb(10 8 9 / 0.08) 100%
    ),
    linear-gradient(0deg, rgb(10 8 9 / 0.72), transparent 55%);
  content: '';
}
.chronicle-lead__content {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 540px;
  max-width: 700px;
  flex-direction: column;
  justify-content: flex-end;
  padding: clamp(28px, 5vw, 72px);
}
.chronicle-story-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: #c39a60;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.chronicle-story-meta span + span::before {
  margin-right: 10px;
  color: #6e5a46;
  content: '◆';
}
.chronicle-lead h2 {
  max-width: 660px;
  margin-top: 16px;
  color: #fbf5eb;
  font-family: Cinzel, Georgia, serif;
  font-size: clamp(2.4rem, 5.5vw, 5.8rem);
  font-weight: 800;
  line-height: 0.98;
  text-transform: uppercase;
}
.chronicle-lead p {
  max-width: 600px;
  margin-top: 22px;
  color: #c8bfb4;
  font-family: Georgia, serif;
  font-size: clamp(1rem, 1.6vw, 1.25rem);
  line-height: 1.65;
}
.chronicle-lead__cta {
  display: inline-flex;
  width: max-content;
  min-height: 44px;
  align-items: center;
  gap: 12px;
  margin-top: 28px;
  border-bottom: 1px solid #c4995f;
  color: #f5eee4;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
@media (max-width: 700px) {
  .chronicle-lead {
    min-height: 470px;
    background-position: 68% center;
  }
  .chronicle-lead::before {
    background: linear-gradient(
      0deg,
      rgb(10 8 9 / 0.98) 0%,
      rgb(10 8 9 / 0.76) 58%,
      rgb(10 8 9 / 0.2) 100%
    );
  }
  .chronicle-lead__content {
    min-height: 470px;
    padding: 24px;
  }
}
</style>

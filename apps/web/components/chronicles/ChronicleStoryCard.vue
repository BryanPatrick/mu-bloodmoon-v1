<template>
  <article class="chronicle-story-card">
    <div class="chronicle-story-card__image">
      <img v-if="story.image" :src="story.image" :alt="story.title" loading="lazy" />
      <ImageIcon v-else class="size-7" aria-hidden="true" />
    </div>
    <div class="chronicle-story-card__body">
      <div class="chronicle-story-card__meta">
        <span>{{ story.category }}</span>
        <span>{{ formattedDate }}</span>
      </div>
      <h3>{{ story.title }}</h3>
      <p>{{ story.summary }}</p>
      <span v-if="story.isDemo" class="chronicle-story-card__demo">Conteúdo demonstrativo</span>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ImageIcon } from 'lucide-vue-next'
import type { ChronicleStory } from '~/types/chronicles'

const props = defineProps<{ story: ChronicleStory }>()
const formattedDate = computed(() =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(
    new Date(props.story.publishedAt)
  )
)
</script>

<style scoped>
.chronicle-story-card {
  display: grid;
  grid-template-rows: 220px 1fr;
  min-height: 430px;
  overflow: hidden;
  border: 1px solid rgb(207 169 109 / 0.18);
  background: #121011;
}
.chronicle-story-card__image {
  display: grid;
  overflow: hidden;
  place-items: center;
  background: #0a0909;
  color: #5f5750;
}
.chronicle-story-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 400ms ease;
}
.chronicle-story-card:hover img {
  transform: scale(1.025);
}
.chronicle-story-card__body {
  display: flex;
  flex-direction: column;
  padding: 22px;
}
.chronicle-story-card__meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #bd9257;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.chronicle-story-card h3 {
  margin-top: 14px;
  color: #f4ede4;
  font-family: Cinzel, Georgia, serif;
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1.25;
  text-transform: uppercase;
}
.chronicle-story-card p {
  margin-top: 12px;
  color: #978e85;
  font-family: Georgia, serif;
  font-size: 13px;
  line-height: 1.65;
}
.chronicle-story-card__demo {
  margin-top: auto;
  padding-top: 18px;
  color: #766d65;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
</style>

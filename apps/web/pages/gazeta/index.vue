<template>
  <div class="chronicles-page">
    <div class="chronicles-shell">
      <ChronicleMasthead
        :categories="categoryOptions"
        :active-category="activeCategory"
        :is-demo="isDemoEdition"
        @select-category="activeCategory = $event"
      />

      <p v-if="isDemoEdition" class="chronicles-demo-notice" role="status">
        Esta edição apresenta o formato da Gazeta. As histórias abaixo são demonstrações editoriais
        e não foram geradas por telemetria do jogo.
      </p>

      <main>
        <ChronicleLeadStory :story="leadStory" />

        <section id="ultimas" class="chronicles-section">
          <div class="chronicles-section__heading">
            <div>
              <p>Noticiário do continente</p>
              <h2>Últimas da Gazeta</h2>
            </div>
            <span>{{ filteredStories.length }} matérias</span>
          </div>
          <div v-if="filteredStories.length" class="chronicles-story-grid">
            <ChronicleStoryCard v-for="story in filteredStories" :key="story.id" :story="story" />
          </div>
          <div v-else class="chronicles-empty">
            <Newspaper class="size-7" />
            <h3>Nenhuma matéria nesta categoria</h3>
            <p>Novas histórias aparecerão aqui depois de revisadas e publicadas pelo CMS.</p>
            <button type="button" @click="activeCategory = 'Últimas'">Ver todas as matérias</button>
          </div>
        </section>

        <section class="chronicles-periods" aria-labelledby="chronicle-periods-title">
          <div class="chronicles-section__heading chronicles-section__heading--full">
            <div>
              <p>Ritmo do mundo</p>
              <h2 id="chronicle-periods-title">O tempo no Blood Moon</h2>
            </div>
          </div>
          <div class="chronicles-period-grid">
            <ChroniclePeriodSummary
              v-for="period in chronicleDemoPeriods"
              :key="period.id"
              :period="period"
            />
          </div>
        </section>

        <ChronicleFutureFeature
          eyebrow="Edição narrada"
          title="Ouvir a Gazeta"
          description="No futuro, edições revisadas poderão ganhar uma versão em áudio para acompanhar o jogador fora do continente."
          variant="audio"
        />

        <section class="chronicles-season" aria-labelledby="season-chronicle-title">
          <div class="chronicles-section__heading chronicles-section__heading--full">
            <div>
              <p>Arquivo histórico</p>
              <h2 id="season-chronicle-title">Crônicas da temporada</h2>
            </div>
            <span>Preview</span>
          </div>
          <div class="chronicles-timeline">
            <article v-for="(moment, index) in seasonMoments" :key="moment.title">
              <span>{{ String(index + 1).padStart(2, '0') }}</span>
              <div>
                <h3>{{ moment.title }}</h3>
                <p>{{ moment.description }}</p>
              </div>
            </article>
          </div>
        </section>

        <ChronicleFutureFeature
          eyebrow="Especial da temporada"
          title="Retrospectiva da temporada"
          description="Reviva os acontecimentos que escreveram a história desta temporada em uma futura experiência cinematográfica."
          variant="cinematic"
        />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Newspaper } from 'lucide-vue-next'
import { chronicleDemoPeriods, createChronicleDemoStories } from '~/data/chronicles.demo'

useSeoMeta({
  title: 'Gazeta de Lorencia | Blood Moon',
  description: 'As histórias, crônicas e acontecimentos editoriais do mundo de Blood Moon.'
})

const { loadPublishedStories } = useChronicles()
const { data: cmsStories } = await useAsyncData(
  'chronicle-published-stories',
  loadPublishedStories,
  {
    default: () => []
  }
)

const demoStories = createChronicleDemoStories()
const stories = computed(() => (cmsStories.value.length ? cmsStories.value : demoStories))
const isDemoEdition = computed(() => !cmsStories.value.length)
const leadStory = computed(() => stories.value[0] || demoStories[0])
const activeCategory = ref('Últimas')
const categoryOptions = [
  'Últimas',
  'Mundo',
  'Guilds',
  'PvP',
  'Bosses',
  'Economia',
  'Comunidade',
  'Curiosidades',
  'Temporadas'
]
const filteredStories = computed(() => {
  const available = stories.value.slice(1)
  return activeCategory.value === 'Últimas'
    ? available
    : available.filter((story) => story.category === activeCategory.value)
})
const seasonMoments = [
  { title: 'Início da temporada', description: 'O ponto de partida de uma nova história.' },
  { title: 'Primeiros marcos', description: 'Resets, bosses e conquistas que merecem registro.' },
  {
    title: 'Conflitos do reino',
    description: 'Guilds, cercos e rivalidades revisados pela equipe.'
  },
  { title: 'Legado', description: 'A retrospectiva que encerrará a crônica da Season.' }
]
</script>

<style scoped>
.chronicles-page {
  min-height: 100vh;
  background: #090708;
  color: #f2ebe3;
}
.chronicles-shell {
  width: min(100%, 1476px);
  margin-inline: auto;
  padding: 24px;
}
.chronicles-demo-notice {
  margin: 18px 0;
  border-left: 2px solid #9f282a;
  padding: 11px 15px;
  background: #171213;
  color: #a79d94;
  font-size: 11px;
  line-height: 1.6;
}
.chronicles-section,
.chronicles-periods,
.chronicles-season {
  padding-block: clamp(54px, 7vw, 96px);
}
.chronicles-section__heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
  border-bottom: 1px solid rgb(205 167 105 / 0.2);
  padding-bottom: 18px;
}
.chronicles-section__heading--full {
  grid-column: 1 / -1;
}
.chronicles-section__heading p {
  color: #b58a50;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.chronicles-section__heading h2 {
  margin-top: 7px;
  color: #f6eee5;
  font-family: Cinzel, Georgia, serif;
  font-size: clamp(1.5rem, 3vw, 2.4rem);
  font-weight: 800;
  text-transform: uppercase;
}
.chronicles-section__heading > span {
  color: #716961;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.chronicles-story-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}
.chronicles-empty {
  display: grid;
  min-height: 280px;
  place-items: center;
  border: 1px dashed rgb(205 167 105 / 0.22);
  padding: 44px;
  text-align: center;
  color: #716861;
}
.chronicles-empty h3 {
  margin-top: 16px;
  color: #e8dfd6;
  font-family: Cinzel, Georgia, serif;
  font-size: 1.1rem;
  font-weight: 800;
  text-transform: uppercase;
}
.chronicles-empty p {
  max-width: 430px;
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.65;
}
.chronicles-empty button {
  margin-top: 18px;
  color: #c19558;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.chronicles-period-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  background: rgb(205 167 105 / 0.16);
}
.chronicles-season {
  display: grid;
}
.chronicles-timeline {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-block: 1px solid rgb(205 167 105 / 0.18);
}
.chronicles-timeline article {
  position: relative;
  display: grid;
  min-height: 180px;
  grid-template-columns: auto 1fr;
  gap: 14px;
  padding: 28px;
  border-right: 1px solid rgb(205 167 105 / 0.14);
}
.chronicles-timeline article:last-child {
  border-right: 0;
}
.chronicles-timeline article > span {
  color: #7f2224;
  font-family: Cinzel, Georgia, serif;
  font-size: 1.35rem;
  font-weight: 800;
}
.chronicles-timeline h3 {
  color: #e9e0d7;
  font-family: Cinzel, Georgia, serif;
  font-size: 0.95rem;
  font-weight: 800;
  text-transform: uppercase;
}
.chronicles-timeline p {
  margin-top: 10px;
  color: #847c74;
  font-size: 11px;
  line-height: 1.6;
}
@media (max-width: 960px) {
  .chronicles-story-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .chronicles-period-grid {
    grid-template-columns: 1fr;
  }
  .chronicles-timeline {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .chronicles-timeline article:nth-child(2) {
    border-right: 0;
  }
}
@media (max-width: 600px) {
  .chronicles-shell {
    padding: 12px;
  }
  .chronicles-story-grid,
  .chronicles-timeline {
    grid-template-columns: 1fr;
  }
  .chronicles-timeline article {
    min-height: 130px;
    border-right: 0;
    border-bottom: 1px solid rgb(205 167 105 / 0.14);
  }
  .chronicles-timeline article:last-child {
    border-bottom: 0;
  }
  .chronicles-section__heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

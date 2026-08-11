<template>
  <header class="chronicle-masthead">
    <div class="chronicle-masthead__rule">
      <span>{{ formattedDate }}</span>
      <span v-if="isDemo" class="chronicle-demo-label">Edição demonstrativa</span>
      <span>Season 6</span>
    </div>
    <div class="chronicle-masthead__brand">
      <span class="chronicle-masthead__moon" aria-hidden="true" />
      <div>
        <p>Publicação oficial Blood Moon</p>
        <h1>Gazeta de Lorencia</h1>
        <span>As histórias que o continente escreve.</span>
      </div>
    </div>
    <nav class="chronicle-categories" aria-label="Categorias da Gazeta">
      <button
        v-for="category in categories"
        :key="category"
        type="button"
        :class="{ active: category === activeCategory }"
        @click="$emit('select-category', category)"
      >
        {{ category }}
      </button>
    </nav>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  categories: string[]
  activeCategory: string
  isDemo: boolean
}>()

defineEmits<{ 'select-category': [category: string] }>()

const formattedDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date())
</script>

<style scoped>
.chronicle-masthead {
  border-bottom: 1px solid rgb(206 169 111 / 0.22);
}
.chronicle-masthead__rule {
  display: flex;
  min-height: 34px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-block: 1px solid rgb(206 169 111 / 0.2);
  color: #9e958b;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.chronicle-demo-label {
  color: #e8b96d;
}
.chronicle-masthead__brand {
  display: flex;
  min-height: 150px;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 24px 0;
  text-align: center;
}
.chronicle-masthead__brand p {
  color: #bb8a46;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}
.chronicle-masthead__brand h1 {
  margin-top: 6px;
  color: #f5eee4;
  font-family: Cinzel, Georgia, serif;
  font-size: clamp(2.2rem, 5vw, 4.5rem);
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
}
.chronicle-masthead__brand span {
  display: block;
  margin-top: 10px;
  color: #a79e94;
  font-family: Georgia, serif;
  font-size: 14px;
  font-style: italic;
}
.chronicle-masthead__moon {
  position: relative;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border: 1px solid #a83535;
  border-radius: 50%;
  box-shadow:
    inset -10px 0 0 #9b191b,
    0 0 28px rgb(159 2 2 / 0.28);
}
.chronicle-categories {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  border-top: 1px solid rgb(206 169 111 / 0.18);
}
.chronicle-categories button {
  min-height: 40px;
  padding: 0 16px;
  border-bottom: 2px solid transparent;
  color: #9d948a;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition:
    color 160ms ease,
    border-color 160ms ease;
}
.chronicle-categories button:hover,
.chronicle-categories button.active {
  border-color: #a72325;
  color: #f5eee4;
}
@media (max-width: 640px) {
  .chronicle-masthead__rule {
    align-items: flex-start;
    padding-block: 8px;
    font-size: 8px;
  }
  .chronicle-masthead__rule span:first-child {
    max-width: 42%;
  }
  .chronicle-masthead__brand {
    min-height: 130px;
    gap: 12px;
  }
  .chronicle-masthead__moon {
    width: 30px;
    height: 30px;
  }
  .chronicle-categories button {
    flex: 1 1 33.333%;
    padding-inline: 6px;
    font-size: 9px;
  }
}
</style>

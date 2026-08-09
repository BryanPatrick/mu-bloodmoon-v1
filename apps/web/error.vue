<template>
  <UApp>
    <div class="bm-error-shell">
      <SiteHeader />

      <main class="bm-error-main">
        <section class="bm-error-card" aria-labelledby="error-title">
          <div class="bm-error-emblem" aria-hidden="true">
            <ShieldAlert v-if="statusCode === 403" />
            <MapPinned v-else-if="statusCode === 404" />
            <TriangleAlert v-else />
          </div>

          <p class="bm-kicker">{{ presentation.kicker }}</p>
          <p class="bm-error-code" aria-label="Codigo do erro">{{ statusCode }}</p>
          <h1 id="error-title" class="bm-heading bm-error-title" data-testid="error-title">
            {{ presentation.title }}
          </h1>
          <p class="bm-error-description">{{ presentation.description }}</p>

          <div v-if="requestId && statusCode === 500" class="bm-error-request">
            <span>Codigo de atendimento</span>
            <code data-testid="error-request-id">{{ requestId }}</code>
          </div>

          <div class="bm-error-actions">
            <button
              v-if="statusCode === 500"
              class="bm-button bm-button-secondary"
              type="button"
              data-testid="error-retry"
              @click="retry"
            >
              <RefreshCw class="size-4" />
              Tentar novamente
            </button>
            <button
              class="bm-button bm-button-primary"
              type="button"
              data-testid="error-home"
              @click="goHome"
            >
              <House class="size-4" />
              Voltar para Home
            </button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  </UApp>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'
import { House, MapPinned, RefreshCw, ShieldAlert, TriangleAlert } from 'lucide-vue-next'
import {
  getErrorPresentation,
  getSafeRequestId,
  normalizeErrorStatus
} from '~/utils/error-presentation'

const props = defineProps<{ error: NuxtError }>()
const statusCode = normalizeErrorStatus(props.error)
const presentation = getErrorPresentation(statusCode)
const requestId = getSafeRequestId(props.error)

const event = useRequestEvent()
if (import.meta.server && event) {
  setResponseStatus(event, statusCode, presentation.title)
}

useHead({
  title: presentation.documentTitle,
  titleTemplate: '%s',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})

const goHome = () => clearError({ redirect: '/' })
const retry = () => {
  if (import.meta.client) window.location.reload()
}
</script>

<style scoped>
.bm-error-shell {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
}

.bm-error-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  flex: 1;
  min-height: 640px;
  place-items: center;
  padding: calc(var(--bm-header-height) + 56px) 24px 72px;
  background:
    radial-gradient(circle at 50% 32%, rgb(159 5 7 / 0.08), transparent 28rem), var(--bm-page-bg);
}

.bm-error-card {
  width: 100%;
  min-width: 0;
  max-width: 660px;
  padding: 54px 48px;
  border: 1px solid var(--bm-border);
  border-radius: 12px;
  background: var(--bm-surface-soft);
  box-shadow: var(--shadow-panel);
  text-align: center;
}

.bm-error-emblem {
  display: grid;
  width: 58px;
  height: 58px;
  margin: 0 auto 24px;
  place-items: center;
  transform: rotate(45deg);
  border: 1px solid var(--bm-red);
  color: var(--bm-red);
}

.bm-error-emblem svg {
  width: 27px;
  height: 27px;
  transform: rotate(-45deg);
}

.bm-error-code {
  margin-top: 10px;
  color: var(--bm-wine);
  font-family: Cinzel, Georgia, serif;
  font-size: clamp(4rem, 12vw, 7rem);
  font-weight: 800;
  line-height: 0.95;
}

.bm-error-title {
  margin-top: 18px;
  overflow-wrap: anywhere;
  font-size: clamp(1.55rem, 4vw, 2.35rem);
}

.bm-error-description {
  max-width: 500px;
  margin: 14px auto 0;
  overflow-wrap: anywhere;
  color: var(--bm-muted);
  line-height: 1.7;
}

.bm-error-request {
  display: grid;
  gap: 6px;
  width: max-content;
  max-width: 100%;
  margin: 24px auto 0;
  padding: 10px 14px;
  border: 1px solid var(--bm-border);
  background: var(--bm-surface);
  text-align: left;
}

.bm-error-request span {
  color: var(--bm-muted);
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
}

.bm-error-request code {
  overflow-wrap: anywhere;
  color: var(--bm-text);
  font-size: 0.78rem;
}

.bm-error-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 30px;
}

.bm-error-actions .bm-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

@media (max-width: 640px) {
  .bm-error-main {
    min-height: 560px;
    padding: calc(var(--bm-header-height) + 28px) 16px 44px;
  }

  .bm-error-card {
    max-width: calc(100vw - 32px);
    padding: 42px 22px;
  }

  .bm-error-actions {
    flex-direction: column-reverse;
  }

  .bm-error-actions .bm-button {
    width: 100%;
  }
}
</style>

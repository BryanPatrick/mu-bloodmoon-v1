<script setup lang="ts">
// Dev-only Test Persona switcher. Not linked from anywhere in the public
// nav. The only real gate is the backend: /api/test-personas/available
// 404s outside an allow-listed environment/database, and this page just
// reflects that -- it never assumes the feature is on.
import type { TestPersonaId } from '~/composables/useTestPersonas'

const personas = useTestPersonas()
const available = ref<TestPersonaId[] | null>(null)
const checking = ref(true)
const activating = ref<TestPersonaId | null>(null)
const lastResult = ref<string>('')
const errorMessage = ref<string>('')

onMounted(async () => {
  available.value = await personas.listAvailable()
  checking.value = false
})

async function activate(persona: TestPersonaId) {
  activating.value = persona
  errorMessage.value = ''
  try {
    const result = await personas.activatePersona(persona)
    lastResult.value = result.guild
      ? `${persona} ativado -- guild ${result.guild.slug} (${result.guild.roleKey})`
      : `${persona} ativado -- role ${result.user.role}`
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Falha ao ativar persona.'
  } finally {
    activating.value = null
  }
}

async function reset() {
  errorMessage.value = ''
  try {
    await personas.resetPersonas()
    lastResult.value = 'Fixtures de Test Personas removidas.'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Falha ao resetar personas.'
  }
}
</script>

<template>
  <div style="max-width: 640px; margin: 2rem auto; font-family: system-ui, sans-serif;">
    <h1>Test Personas</h1>

    <p v-if="checking">Verificando disponibilidade...</p>
    <p v-else-if="!available || available.length === 0" style="color: #b91c1c;">
      Test Personas não estão disponíveis neste ambiente (rota não registrada no backend).
    </p>

    <template v-else>
      <p>Ambiente permite: {{ available.join(', ') }}</p>

      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0;">
        <button
          v-for="persona in available"
          :key="persona"
          :disabled="activating !== null"
          @click="activate(persona)"
        >
          {{ activating === persona ? 'Ativando...' : persona }}
        </button>
      </div>

      <button style="margin-top: 1rem;" @click="reset">Reset fixtures</button>
    </template>

    <p v-if="lastResult" style="color: #15803d;">{{ lastResult }}</p>
    <p v-if="errorMessage" style="color: #b91c1c;">{{ errorMessage }}</p>
  </div>
</template>

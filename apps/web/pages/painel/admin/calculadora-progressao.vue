<template>
  <ManagementShell>
    <section class="grid gap-5">
      <header class="border-b border-white/10 pb-5">
        <p class="bm-kicker">Servidor · área administrativa</p>
        <h1 class="mt-2 font-display text-4xl font-black uppercase">Calculadora de XP (fundação estrutural)</h1>
        <p class="mt-2 max-w-3xl text-sm font-semibold text-white/60">
          Fase X (2026-09-04). Esta calculadora nunca inventa uma fórmula que não existe.
          Toda combinação de modificadores incompatível é bloqueada; todo resultado que dependeria
          da fórmula de stack ou da curva de nível permanece explicitamente <strong class="text-amber-300">BLOQUEADO</strong>
          em vez de mostrar um número sem base real.
        </p>
      </header>

      <section class="bm-panel grid gap-3 rounded-md p-4 sm:grid-cols-2">
        <article class="rounded-md bg-black/25 p-3">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Taxa base do servidor</p>
          <p class="mt-1 font-display text-2xl font-black text-emerald-300">50x</p>
          <p class="mt-1 text-[10px] font-bold text-white/40">Política de produto de Bryan (Fase X) — termo final, não derivado de config.</p>
        </article>
        <article class="rounded-md bg-black/25 p-3">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Config. AccountLevel (VIP)</p>
          <p class="mt-1 font-display text-2xl font-black text-white">50 / 60 / 60 / 60</p>
          <p class="mt-1 text-[10px] font-bold text-white/40">AddExperienceRate_AL0-3 — relação matemática com a taxa base é DESCONHECIDA, mantida separada de propósito.</p>
        </article>
      </section>

      <section class="bm-panel rounded-md p-4">
        <p class="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Seleção de modificadores de XP</p>
        <p class="mt-1 text-[10px] font-semibold text-white/40">Marque os modificadores que estariam ativos. Combinações que compartilham o mesmo grupo do Effect.txt (só um efeito ativo por grupo, confirmado pelo fornecedor) são bloqueadas automaticamente.</p>

        <div v-if="conflictWarning" class="mt-3 border border-blood-400/30 bg-blood-700/15 px-3 py-2 text-xs font-bold text-blood-100">
          Combinação impossível: {{ conflictWarning }}
        </div>

        <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <label v-for="m in modifiers" :key="m.id" class="flex items-start gap-2 rounded-md border border-white/10 bg-black/20 p-2 text-xs" :class="{ 'opacity-40': !m.active }">
            <input type="checkbox" :checked="selected.has(m.id)" :disabled="!m.active" class="mt-0.5" @change="toggle(m.id)">
            <span>
              <strong class="block text-white/85">{{ m.name }}</strong>
              <span class="text-[10px] font-bold uppercase tracking-[0.08em] text-white/40">{{ groupLabel(m.group) }} · valor bruto {{ m.rawValue }}</span>
              <span v-if="!m.active" class="block text-[10px] font-bold text-amber-300">mecanismo existe, não configurado atualmente</span>
            </span>
          </label>
        </div>

        <div class="mt-4 rounded-md border border-white/10 bg-black/25 p-3">
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Multiplicador efetivo</p>
          <p class="mt-1 font-display text-xl font-black text-blood-300">BLOQUEADO — fórmula de stack desconhecida</p>
          <p class="mt-1 text-[10px] font-semibold text-white/40">O mecanismo de Group do Effect.txt prova QUAIS modificadores podem estar ativos ao mesmo tempo, não COMO seus valores se combinam (aditivo, multiplicativo, ordem). Nenhum número é inventado aqui.</p>
        </div>
      </section>

      <section v-if="bestCase" class="bm-panel grid gap-3 rounded-md p-4 sm:grid-cols-2">
        <article class="rounded-md bg-black/25 p-3">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Stack máximo confirmado</p>
          <ul class="mt-2 grid gap-1 text-xs text-white/70">
            <li v-for="id in bestCase.maximumConfirmedStack.modifierIds" :key="id">{{ modifierName(id) }}</li>
          </ul>
          <p class="mt-2 text-[10px] font-semibold text-white/40">{{ bestCase.maximumConfirmedStack.note }}</p>
        </article>
        <article class="rounded-md bg-black/25 p-3">
          <p class="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Stack teórico não verificado</p>
          <ul class="mt-2 grid gap-1 text-xs text-white/70">
            <li v-for="id in bestCase.maximumPossibleButUnverifiedStack.modifierIds" :key="id">{{ modifierName(id) }}</li>
          </ul>
          <p class="mt-2 text-[10px] font-semibold text-white/40">{{ bestCase.maximumPossibleButUnverifiedStack.note }}</p>
        </article>
      </section>

      <section class="bm-panel grid gap-4 rounded-md p-4 sm:grid-cols-2">
        <article class="grid gap-2">
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">XP/hora (entrada manual — não há telemetria de combate)</p>
          <label class="grid gap-1 text-[10px] font-bold uppercase text-white/50">XP por kill
            <input v-model.number="xpPerKill" type="number" min="0" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white">
          </label>
          <label class="grid gap-1 text-[10px] font-bold uppercase text-white/50">Kills por hora
            <input v-model.number="killsPerHour" type="number" min="0" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white">
          </label>
          <button class="bm-admin-action w-fit" type="button" @click="computeXpPerHour">Calcular</button>
          <p v-if="xpPerHourResult !== null" class="text-xs font-bold text-emerald-300">XP/hora: {{ xpPerHourResult.toLocaleString('pt-BR') }}</p>
        </article>

        <article class="grid gap-2">
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Capacidade de spawn (teto teórico, não é velocidade do jogador)</p>
          <label class="grid gap-1 text-[10px] font-bold uppercase text-white/50">Monstros no spot
            <input v-model.number="spotMonsterCount" type="number" min="0" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white">
          </label>
          <label class="grid gap-1 text-[10px] font-bold uppercase text-white/50">Respawn confirmado (segundos, opcional)
            <input v-model.number="respawnSeconds" type="number" min="0" class="rounded-md border border-white/10 bg-black/[0.35] px-3 py-2 text-xs font-bold text-white" placeholder="deixe vazio se desconhecido">
          </label>
          <button class="bm-admin-action w-fit" type="button" @click="computeSpawnCapacity">Calcular</button>
          <p v-if="spawnCapacityResult && spawnCapacityResult.blocked" class="text-xs font-bold text-amber-300">BLOQUEADO: {{ spawnCapacityResult.reason }}</p>
          <p v-else-if="spawnCapacityResult && !spawnCapacityResult.blocked" class="text-xs font-bold text-emerald-300">Capacidade: {{ spawnCapacityResult.spawnCapacityPerHour.toLocaleString('pt-BR') }} monstros/hora (teórico)</p>
        </article>
      </section>

      <section class="border border-white/10 bg-black/20 rounded-md p-4">
        <p class="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Tempo até nível / até reset</p>
        <p class="mt-2 text-sm font-black text-blood-300">CALCULATION_BLOCKED_BY: XP_STACK_FORMULA, LEVEL_CURVE</p>
        <p class="mt-1 text-[10px] font-semibold text-white/40">
          Nem a fórmula de combinação de modificadores nem a curva de XP por nível são
          confirmadas hoje — ver
          <NuxtLink to="/painel/admin/calculadora-progressao" class="underline">docs/progression/xp-stack-inventory.md</NuxtLink>.
          Esta calculadora nunca mostra "2h 13m" como se fosse autoritativo sem essas bases.
        </p>
      </section>
    </section>
  </ManagementShell>
</template>

<script setup lang="ts">
import type { XpModifier, XpModifierGroup, BestCaseStackResult } from '~/composables/useProgressionApi'

useSeoMeta({ title: 'Calculadora de XP | Blood Moon' })

const api = useProgressionApi()

const modifiers = ref<XpModifier[]>([])
const bestCase = ref<BestCaseStackResult | null>(null)
const selected = ref<Set<string>>(new Set())
const conflictWarning = ref('')

const xpPerKill = ref<number | null>(null)
const killsPerHour = ref<number | null>(null)
const xpPerHourResult = ref<number | null>(null)

const spotMonsterCount = ref<number | null>(null)
const respawnSeconds = ref<number | null>(null)
const spawnCapacityResult = ref<{ blocked: true, reason: string } | { blocked: false, spawnCapacityPerHour: number } | null>(null)

onMounted(async () => {
  try {
    const result = await api.calculatorCatalog()
    modifiers.value = result.modifiers
    bestCase.value = result.bestCaseStack
  } catch {
    modifiers.value = []
    bestCase.value = null
  }
})

const groupLabels: Record<XpModifierGroup, string> = {
  BASE_SERVER_RATE: 'Taxa base', ACCOUNT_LEVEL_VIP: 'VIP', MAP: 'Mapa', PARTY: 'Grupo',
  EVENT: 'Evento', QUEST: 'Quest', SEAL: 'Selo', BUFF: 'Buff', PET: 'Pet', RANDOM_BONUS: 'Bônus aleatório'
}
const groupLabel = (g: XpModifierGroup) => groupLabels[g] || g
const modifierName = (id: string) => modifiers.value.find((m) => m.id === id)?.name || id

const toggle = async (id: string) => {
  if (selected.value.has(id)) selected.value.delete(id)
  else selected.value.add(id)
  conflictWarning.value = ''
  if (selected.value.size < 2) return
  try {
    const result = await api.calculatorValidateSelection([...selected.value])
    if (!result.valid) {
      const c = result.conflicts[0]
      conflictWarning.value = `${modifierName(c.a)} + ${modifierName(c.b)} (mesmo grupo ${c.stackGroupKey}, só um pode estar ativo)`
      selected.value.delete(id)
    }
  } catch { /* validation is advisory-only client-side */ }
}

const computeXpPerHour = async () => {
  if (!xpPerKill.value || !killsPerHour.value) return
  try {
    const result = await api.calculatorXpPerHour(xpPerKill.value, killsPerHour.value)
    xpPerHourResult.value = result.xpPerHour
  } catch {
    xpPerHourResult.value = null
  }
}

const computeSpawnCapacity = async () => {
  if (!spotMonsterCount.value) return
  try {
    spawnCapacityResult.value = await api.calculatorSpawnCapacity(spotMonsterCount.value, respawnSeconds.value || null)
  } catch {
    spawnCapacityResult.value = null
  }
}
</script>

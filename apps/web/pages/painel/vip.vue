<template>
  <ManagementShell>
    <section class="grid gap-6">
      <header>
        <p class="bm-kicker">Minha conta</p>
        <h1 class="mt-2 font-display text-3xl font-black uppercase">VIP</h1>
        <p class="mt-2 max-w-2xl text-sm font-semibold text-white/60">
          Assine um plano VIP para conforto e conveniencia. Enquanto seu VIP estiver ativo: renovar o
          <strong class="text-white/80">mesmo nivel</strong> soma os dias normalmente; comprar um
          <strong class="text-white/80">nivel diferente</strong> fica bloqueado ate seu VIP atual expirar
          -- um sistema de troca/upgrade entre niveis ainda esta sendo desenhado.
        </p>
      </header>

      <article v-if="entitlement" class="bm-panel rounded-md p-6">
        <p class="text-xs font-black uppercase tracking-[0.28em] text-ember">Status atual</p>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <span v-if="entitlement.isActiveNow" class="rounded-md border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-100">
            VIP {{ tierLabel(entitlement.tier) }} ATIVO
          </span>
          <span v-else class="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-white/60">
            Sem VIP ativo
          </span>
          <span v-if="entitlement.isActiveNow && entitlement.expiresAt" class="text-sm font-bold text-white/60">
            expira em {{ formatDate(entitlement.expiresAt) }}
          </span>
        </div>
      </article>

      <p v-if="message" class="rounded-md border px-4 py-3 text-sm font-bold" :class="messageClass">{{ message }}</p>

      <div v-if="loading" class="bm-panel rounded-md p-8 text-center text-sm font-bold text-white/45">Carregando planos...</div>

      <section v-for="tier in tiers" :key="tier" class="grid gap-4">
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 class="font-display text-2xl font-black uppercase" :class="tierTextClass(tier)">{{ tierLabel(tier) }}</h2>
        </div>

        <p v-if="isCrossTierBlocked(tier)" class="rounded-md border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-100">
          Bloqueado enquanto seu VIP {{ tierLabel(entitlement?.tier ?? null) }} estiver ativo
          <span v-if="entitlement?.expiresAt">(expira em {{ formatDate(entitlement.expiresAt) }})</span>.
          Aguarde expirar para comprar um nivel diferente -- um sistema de troca/upgrade entre niveis ainda esta sendo desenhado.
        </p>

        <div v-if="benefitsByTier[tier]?.length" class="flex flex-wrap gap-2">
          <span v-for="benefit in benefitsByTier[tier]" :key="benefit.key" class="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/70">
            {{ benefit.label }}
          </span>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <article v-for="plan in catalogByTier[tier]" :key="plan.id" class="bm-panel rounded-md p-5" :class="{ 'opacity-50': isCrossTierBlocked(tier) }">
            <p class="text-[11px] font-black uppercase tracking-[0.2em] text-white/45">{{ plan.durationDays }} dias</p>
            <p class="mt-2 font-display text-2xl font-black text-white">{{ plan.price.toLocaleString('pt-BR') }} WC</p>
            <button
              class="bm-button-glass mt-4 w-full rounded-md px-4 py-3 text-sm font-black disabled:opacity-40"
              type="button"
              :disabled="purchasing === plan.id || isCrossTierBlocked(tier)"
              :title="isCrossTierBlocked(tier) ? 'Bloqueado enquanto outro nivel VIP estiver ativo' : ''"
              @click="purchase(plan)"
            >
              {{ purchasing === plan.id ? 'Processando...' : isCrossTierBlocked(tier) ? 'Bloqueado' : 'Comprar' }}
            </button>
          </article>
        </div>
        <p v-if="!catalogByTier[tier]?.length && !loading" class="text-sm font-bold text-white/45">Nenhum plano disponivel neste nivel no momento.</p>
      </section>

      <NuxtLink to="/painel/compras" class="w-fit text-xs font-black uppercase tracking-[0.14em] text-ember hover:underline">
        Ver historico de compras VIP em Meus Pedidos
      </NuxtLink>
    </section>
  </ManagementShell>
</template>

<script setup lang="ts">
import type { VipCatalogItem, VipEntitlement, VipTier, VipTierBenefits } from '~/composables/useVipApi'

useSeoMeta({ title: 'VIP' })

const vipApi = useVipApi()
const { loadSession } = useAuth()

// BRONZE stays a real, supported tier technically (enum/schema/GameServer
// AL1 mapping untouched) but is not commercially offered to players --
// Bryan's decision (Fase AD, 2026-09-05): "BRONZE not offered to players.
// SILVER offered when VIP commerce is eventually enabled. GOLD offered
// when VIP commerce is eventually enabled."
const tiers: VipTier[] = ['SILVER', 'GOLD']
const catalog = ref<VipCatalogItem[]>([])
const benefits = ref<VipTierBenefits[]>([])
const entitlement = ref<VipEntitlement | null>(null)
const loading = ref(true)
const purchasing = ref('')
const message = ref('')
const isSuccess = ref(true)

onMounted(async () => {
  loadSession()
  await loadAll()
})

const loadAll = async () => {
  loading.value = true
  try {
    const [catalogRows, benefitRows, myEntitlement] = await Promise.all([
      vipApi.listCatalog(),
      vipApi.listBenefits(),
      vipApi.getMyEntitlement()
    ])
    catalog.value = catalogRows
    benefits.value = benefitRows
    entitlement.value = myEntitlement
  } catch {
    catalog.value = []
    benefits.value = []
    entitlement.value = null
  } finally {
    loading.value = false
  }
}

const catalogByTier = computed(() => {
  const map: Partial<Record<VipTier, VipCatalogItem[]>> = {}
  for (const tier of tiers) {
    map[tier] = catalog.value.filter((item) => item.tier === tier).sort((a, b) => a.durationDays - b.durationDays)
  }
  return map
})

const benefitsByTier = computed(() => {
  const map: Partial<Record<VipTier, VipTierBenefits['benefits']>> = {}
  for (const row of benefits.value) map[row.tier] = row.benefits
  return map
})

const tierLabel = (tier: VipTier | null) => (tier === 'BRONZE' ? 'Bronze' : tier === 'SILVER' ? 'Prata' : tier === 'GOLD' ? 'Ouro' : '-')
const tierTextClass = (tier: VipTier) => (tier === 'BRONZE' ? 'text-amber-400' : tier === 'SILVER' ? 'text-slate-300' : 'text-yellow-300')

// PHASE Q DECISION CLOSURE (2026-08-31), Decision 3/Part 6 -- mirrors the
// backend's own vip.service.ts#purchase check exactly (currentlyActive &&
// current.tier !== product.tier -> blocked). Purely a UX guard: the real
// enforcement is server-side, this only prevents the doomed request and
// explains why instead of surfacing it as a generic failure.
const isCrossTierBlocked = (tier: VipTier) => Boolean(entitlement.value?.isActiveNow && entitlement.value.tier && entitlement.value.tier !== tier)

// PHASE Q Part 3 -- "select tier/duration -> authoritative server price ->
// entitlement update." The price shown here is display-only; the backend
// (VipService.purchase, vip.service.ts) always re-reads the real,
// currently-enabled VipProductConfig row server-side and never trusts
// anything the client sends beyond tier/durationDays -- this button never
// sends a price.
const purchase = async (plan: VipCatalogItem) => {
  const confirmed = window.confirm(`Confirmar compra de VIP ${tierLabel(plan.tier)} por ${plan.durationDays} dias, ${plan.price.toLocaleString('pt-BR')} WC?`)
  if (!confirmed) return
  purchasing.value = plan.id
  try {
    entitlement.value = await vipApi.purchase(plan.tier, plan.durationDays)
    isSuccess.value = true
    message.value = `VIP ${tierLabel(plan.tier)} ativado com sucesso.`
  } catch (error) {
    isSuccess.value = false
    message.value = error instanceof Error ? error.message : 'Nao foi possivel concluir a compra de VIP.'
  } finally {
    purchasing.value = ''
  }
}

const messageClass = computed(() =>
  isSuccess.value ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100' : 'border-blood-400/25 bg-blood-700/10 text-blood-100'
)

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
</script>

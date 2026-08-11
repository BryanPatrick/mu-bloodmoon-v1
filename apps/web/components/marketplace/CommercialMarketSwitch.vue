<template>
  <section class="commercial-switch" aria-labelledby="commercial-switch-title">
    <div class="commercial-switch-title">
      <BloodMoonIcon name="items" />
      <div>
        <span>Mercado</span>
        <strong id="commercial-switch-title">Escolha onde comprar</strong>
      </div>
    </div>
    <div class="commercial-switch-options" role="group" aria-label="Origem dos produtos">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :class="{ 'is-active': modelValue === option.value }"
        :aria-pressed="modelValue === option.value"
        @click="$emit('update:modelValue', option.value)"
      >
        <component :is="option.icon" class="size-4" />
        <span
          ><strong>{{ option.label }}</strong
          ><small>{{ option.description }}</small></span
        >
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ShieldCheck, UsersRound } from 'lucide-vue-next'
export type CommercialMarketMode = 'players' | 'official'
defineProps<{ modelValue: CommercialMarketMode }>()
defineEmits<{ 'update:modelValue': [value: CommercialMarketMode] }>()
const options = [
  {
    value: 'players' as const,
    label: 'Jogadores',
    description: 'Ofertas protegidas entre contas',
    icon: UsersRound
  },
  {
    value: 'official' as const,
    label: 'Loja WCoin',
    description: 'Produtos oficiais do servidor',
    icon: ShieldCheck
  }
]
</script>

<style scoped>
.commercial-switch {
  border: 1px solid #d5ccc3;
  background: #faf7f2;
}
.commercial-switch-title {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  border-bottom: 1px solid #d5ccc3;
  color: #540809;
}
.commercial-switch-title > svg {
  width: 18px;
}
.commercial-switch-title span {
  display: block;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.commercial-switch-title strong {
  display: block;
  margin-top: 2px;
  font-family: Cinzel, serif;
  font-size: 14px;
  text-transform: uppercase;
}
.commercial-switch-options {
  display: grid;
  gap: 7px;
  padding: 10px;
}
.commercial-switch-options button {
  display: flex;
  min-height: 52px;
  align-items: center;
  gap: 10px;
  border: 1px solid transparent;
  padding: 9px 10px;
  color: #655b55;
  text-align: left;
  transition:
    border-color 0.16s ease,
    background 0.16s ease,
    color 0.16s ease;
}
.commercial-switch-options button:hover {
  border-color: #cfc3b9;
  background: #fff;
}
.commercial-switch-options button.is-active {
  border-color: #73090b;
  background: #73090b;
  color: #fff;
}
.commercial-switch-options button > span {
  min-width: 0;
}
.commercial-switch-options strong,
.commercial-switch-options small {
  display: block;
}
.commercial-switch-options strong {
  font-size: 11px;
  text-transform: uppercase;
}
.commercial-switch-options small {
  margin-top: 2px;
  font-size: 9px;
  opacity: 0.72;
}
</style>

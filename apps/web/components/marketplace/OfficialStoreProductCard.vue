<template>
  <article class="official-product" :class="`official-product-${view}`">
    <NuxtLink :to="`/loja/${product.slug}`" class="official-product-visual"
      ><img
        v-if="product.images?.[0]"
        :src="product.images[0]"
        :alt="product.name"
        loading="lazy"
      /><ShieldCheck v-else class="size-10" /><span v-if="product.featured"
        >Destaque</span
      ></NuxtLink
    >
    <div class="official-product-copy">
      <span class="official-label"><BadgeCheck class="size-3" /> Loja Oficial</span
      ><NuxtLink :to="`/loja/${product.slug}`">{{ product.name }}</NuxtLink>
      <p>{{ product.summary || product.description }}</p>
      <dl>
        <div>
          <dt>Categoria</dt>
          <dd>{{ product.category }}</dd>
        </div>
        <div>
          <dt>Entrega</dt>
          <dd>{{ deliveryLabel }}</dd>
        </div>
        <div>
          <dt>Estoque</dt>
          <dd>{{ stockLabel }}</dd>
        </div>
      </dl>
    </div>
    <div class="official-product-trade">
      <div>
        <span>A partir de</span
        ><strong>{{ minimumPrice.toLocaleString('pt-BR') }} {{ minimumCurrency }}</strong>
      </div>
      <div>
        <span>Origem</span><strong><ShieldCheck class="size-3" /> Blood Moon</strong>
      </div>
      <NuxtLink :to="`/loja/${product.slug}`">Ver produto <ArrowRight class="size-3.5" /></NuxtLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ArrowRight, BadgeCheck, ShieldCheck } from 'lucide-vue-next'
import type { StoreProduct } from '~/composables/useStoreApi'
const props = defineProps<{ product: StoreProduct; view: 'grid' | 'list' }>()
const availableVariants = computed(() =>
  [...(props.product.variants || [])]
    .filter((item) => item.available)
    .sort((a, b) => a.price - b.price)
)
const minimumPrice = computed(() => availableVariants.value[0]?.price ?? props.product.price)
const minimumCurrency = computed(
  () => availableVariants.value[0]?.currency ?? props.product.currency
)
const deliveryLabel = computed(
  () =>
    ({
      ACCOUNT: 'Conta',
      CHARACTER: 'Personagem',
      INVENTORY: 'Inventário',
      VAULT: 'Baú',
      MAIL: 'Correio'
    })[props.product.deliveryTarget] || props.product.deliveryTarget
)
const stockLabel = computed(() =>
  props.product.stock === null ? 'Disponível' : `${props.product.stock} unidades`
)
</script>

<style scoped>
.official-product {
  position: relative;
  display: grid;
  overflow: hidden;
  border: 1px solid #d4cbc3;
  border-radius: 7px;
  background: #fcfaf7;
  box-shadow: 0 3px 8px rgba(39, 23, 18, 0.1);
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease;
}
.official-product:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(84, 8, 9, 0.13);
}
.official-product-list {
  grid-template-columns: 180px minmax(0, 1fr) 220px;
  min-height: 166px;
}
.official-product-grid {
  grid-template-rows: 180px 1fr auto;
  min-height: 410px;
}
.official-product-visual {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: #0f0d0d;
  color: #827872;
}
.official-product-visual img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 10px;
}
.official-product-visual > span {
  position: absolute;
  right: 7px;
  top: 7px;
  background: #73090b;
  padding: 3px 6px;
  color: #fff;
  font-size: 8px;
  font-weight: 900;
  text-transform: uppercase;
}
.official-product-copy {
  padding: 20px;
}
.official-product-copy > a {
  display: block;
  margin-top: 7px;
  color: #2b1b19;
  font-size: 18px;
  font-weight: 800;
  text-transform: uppercase;
}
.official-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid #8e191a;
  background: #f8e9e7;
  padding: 3px 7px;
  color: #73090b;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.official-product-copy p {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 8px;
  color: #746a63;
  font-size: 10px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.official-product-copy dl {
  display: grid;
  margin-top: 12px;
  gap: 4px;
}
.official-product-copy dl div {
  display: flex;
  gap: 5px;
  font-size: 10px;
}
.official-product-copy dt {
  color: #6d635d;
}
.official-product-copy dd {
  font-weight: 800;
}
.official-product-trade {
  display: grid;
  align-content: center;
  gap: 14px;
  padding: 20px;
  border-left: 1px solid #e1d9d1;
}
.official-product-trade span {
  display: block;
  color: #827772;
  font-size: 8px;
  font-weight: 900;
  text-transform: uppercase;
}
.official-product-trade strong {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  color: #2e2926;
  font-size: 10px;
  text-transform: uppercase;
}
.official-product-trade > a {
  display: flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  background: #73090b;
  color: #fff;
  font-size: 9px;
  font-weight: 900;
  text-transform: uppercase;
}
.official-product-grid .official-product-trade {
  border-top: 1px solid #e1d9d1;
  border-left: 0;
}
.official-product-grid .official-product-copy {
  min-height: 165px;
}
@media (max-width: 720px) {
  .official-product-list {
    grid-template-columns: 105px 1fr;
  }
  .official-product-list .official-product-trade {
    grid-column: 1/-1;
    grid-template-columns: 1fr 1fr auto;
    border-top: 1px solid #e1d9d1;
    border-left: 0;
    padding: 12px 16px;
  }
  .official-product-copy {
    padding: 14px;
  }
  .official-product-copy > a {
    font-size: 14px;
  }
}
</style>

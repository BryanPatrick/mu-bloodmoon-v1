<template>
  <ManagementShell>
    <section class="grid gap-4">
      <header class="border-b border-white/10 pb-4">
        <p class="bm-kicker">Administração editorial</p>
        <h1 class="mt-2 font-display text-3xl font-black uppercase">{{ title }}</h1>
        <p class="mt-2 text-sm font-semibold text-white/60">Crie, revise, publique e organize este conteúdo. Cada alteração fica registrada na auditoria.</p>
      </header>
      <article class="bm-panel rounded-md p-5">
        <EquipmentManager v-if="area === 'itens'" />
        <SettingsManager v-else-if="area === 'configuracoes' && hasPermission(permissions.adminServerSettingsManage)" />
        <ContentManager v-else :area="area" />
      </article>
    </section>
  </ManagementShell>
</template>

<script setup lang="ts">
import { permissions } from '~/data/security'
const route = useRoute()
const { hasPermission } = useAuth()
const validAreas = ['paginas', 'banners', 'classes', 'mapas', 'itens', 'wiki', 'noticias', 'eventos', 'configuracoes']
const area = computed(() => validAreas.includes(String(route.query.area)) ? String(route.query.area) : 'paginas')
const titles: Record<string, string> = { paginas: 'Páginas', banners: 'Banners', classes: 'Classes', mapas: 'Mapas', itens: 'Itens e equipamentos', wiki: 'Wiki', noticias: 'Notícias', eventos: 'Eventos', configuracoes: 'Configurações do servidor' }
const title = computed(() => titles[area.value] || 'Conteúdo')
useSeoMeta({ title: () => title.value })
</script>

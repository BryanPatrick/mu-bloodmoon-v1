<template>
  <ManagementShell>
    <section class="grid gap-4">
      <header><p class="bm-kicker">Preferencias pessoais</p><h1 class="mt-2 font-display text-3xl font-bold">Configuracoes</h1></header>
      <article class="bm-panel grid gap-4 p-5 md:grid-cols-2">
        <label class="bm-admin-label">Idioma<select v-model="preferences.language" class="bm-admin-field"><option value="pt-BR">Portugues Brasil</option><option value="en-US">English</option><option value="es">Espanol</option></select></label>
        <label class="flex items-center gap-3 text-sm font-bold"><input v-model="preferences.notifications" type="checkbox" class="size-4 accent-blood-700">Receber notificacoes do servidor</label>
        <div class="md:col-span-2"><button class="bm-admin-primary" type="button" @click="save">Salvar preferencias</button><span v-if="saved" class="ml-3 text-xs text-emerald-700">Preferencias salvas.</span></div>
      </article>
      <article class="bm-panel p-5"><h2 class="font-display text-xl font-bold">Seguranca e sessoes</h2><p class="bm-muted mt-2 text-sm">Alteracao de senha, e-mail e sessoes ativas ficam centralizadas na sua conta.</p><NuxtLink to="/painel/conta" class="bm-admin-action mt-4">Abrir seguranca da conta</NuxtLink></article>
    </section>
  </ManagementShell>
</template>
<script setup lang="ts">
const preferences = reactive({ language: 'pt-BR', notifications: true })
const saved = ref(false)
onMounted(() => { try { Object.assign(preferences, JSON.parse(localStorage.getItem('blood-moon-preferences') || '{}')) } catch {} })
const save = () => { localStorage.setItem('blood-moon-preferences', JSON.stringify(preferences)); saved.value = true; setTimeout(() => { saved.value = false }, 2000) }
useSeoMeta({ title: 'Configuracoes' })
</script>

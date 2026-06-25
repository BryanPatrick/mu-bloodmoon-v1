<template>
  <div>
    <PageHero :kicker="t('downloadsKicker')" title="Downloads" :description="t('downloadsDescription')" />
    <section class="bm-container grid gap-8 py-14 lg:grid-cols-[1fr_380px]">
      <div class="grid gap-4">
        <div v-for="item in downloads" :key="item.title" class="bm-panel rounded-md p-6">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p class="bm-kicker">{{ item.type }}</p>
              <h2 class="bm-heading mt-2 font-display text-2xl font-bold">{{ item.title }}</h2>
              <p class="bm-muted mt-3 text-sm leading-7">{{ item.description }}</p>
            </div>
            <button class="rounded-md bg-blood-700 px-5 py-3 text-sm font-bold text-white">Download</button>
          </div>
        </div>
      </div>
      <aside class="bm-panel rounded-md p-6">
        <h2 class="bm-heading font-display text-2xl font-bold">{{ t('requirements') }}</h2>
        <div class="bm-muted mt-5 grid gap-4 text-sm">
          <p><strong class="text-moon">{{ t('minimum') }}:</strong> Windows 10, 4 GB RAM, GPU DirectX 11, 12 GB livres.</p>
          <p><strong class="text-moon">{{ t('recommended') }}:</strong> Windows 11, 8 GB RAM, SSD, conexão estável.</p>
        </div>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({ title: 'Downloads' })

const { t } = useLocale()
const downloads = computed(() => [
  { type: t('fullClient'), title: 'Blood Moon Full Client', description: t('fullClientDescription') },
  { type: 'Patch', title: t('updatePatch'), description: t('updatePatchDescription') },
  { type: 'Launcher', title: t('officialLauncher'), description: t('officialLauncherDescription') },
  { type: t('playerExtras'), title: t('playerExtras'), description: t('playerExtrasDescription') }
])
</script>

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
              <p v-if="item.meta" class="bm-muted mt-2 text-xs">{{ item.meta }}</p>
            </div>
            <a
              v-if="item.url"
              :href="item.url"
              target="_blank"
              rel="noopener noreferrer"
              class="rounded-md bg-blood-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-blood-600"
            >
              Download
            </a>
            <span v-else class="rounded-md border border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white/45">
              Em breve
            </span>
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
  {
    type: 'Launcher',
    title: t('officialLauncher'),
    description: t('officialLauncherDescription'),
    meta: 'Windows 10/11 · atualização automática · login integrado',
    url: 'https://update.mubloodmoon.com.br/launcher/BloodMoonLauncher-v1.1.0.zip'
  },
  {
    type: t('fullClient'),
    title: 'Blood Moon Full Client',
    description: t('fullClientDescription'),
    meta: 'Cliente completo · launcher incluso · pronto para jogar',
    url: 'https://www.mediafire.com/file/xya75qzxlp37dpr/BloodMoon-Cliente-Completo.zip/file'
  },
  { type: 'Patch', title: t('updatePatch'), description: t('updatePatchDescription'), url: null },
  { type: t('playerExtras'), title: t('playerExtras'), description: t('playerExtrasDescription'), url: null }
])
</script>

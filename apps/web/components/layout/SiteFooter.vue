<template>
  <footer class="bm-site-footer bm-glass border-t border-white/10">
    <div class="bm-container grid gap-10 py-12 lg:grid-cols-[1.2fr_2fr]">
      <div>
        <BloodLogo />
        <p class="bm-muted mt-5 max-w-md text-sm leading-7">
          {{ t('footerText') }}
        </p>
      </div>
      <div class="grid gap-8 sm:grid-cols-3">
        <div>
          <h3 class="text-sm font-bold uppercase tracking-[0.2em] text-moon">{{ t('navigation') }}</h3>
          <div class="bm-muted mt-4 grid gap-2 text-sm">
            <NuxtLink v-for="item in dictionary.nav" :key="item.to" :to="item.to" class="hover:text-blood-400">{{ item.label }}</NuxtLink>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold uppercase tracking-[0.2em] text-moon">{{ t('social') }}</h3>
          <div class="bm-muted mt-4 grid gap-2 text-sm">
            <a href="#" class="hover:text-blood-400">Discord</a>
            <a href="#" class="hover:text-blood-400">Instagram</a>
            <a href="#" class="hover:text-blood-400">YouTube</a>
          </div>
        </div>
        <div>
          <h3 class="text-sm font-bold uppercase tracking-[0.2em] text-moon">{{ t('server') }}</h3>
          <div class="bm-muted mt-4 grid gap-2 text-sm">
            <NuxtLink to="/downloads" class="hover:text-blood-400">{{ t('downloadClient') }}</NuxtLink>
            <NuxtLink to="/rankings" class="hover:text-blood-400">{{ t('viewRankings') }}</NuxtLink>
            <NuxtLink to="/about#contato" class="hover:text-blood-400">{{ t('contact') }}</NuxtLink>
          </div>
        </div>
      </div>
    </div>
    <div class="bm-muted border-t border-white/10 py-5 text-center text-xs">
      {{ t('copyright') }}
    </div>
  </footer>
</template>

<script setup lang="ts">
const { dictionary, t } = useLocale()
</script>

<script setup lang="ts">
import { Crown, Shield, Star, Swords, Trophy } from 'lucide-vue-next'
import type { CommunityAchievementMock } from '~/features/community/data/stage-one.mock'

const props = defineProps<{ achievement: CommunityAchievementMock }>()

const achievementIcons = { crown: Crown, shield: Shield, star: Star, swords: Swords, trophy: Trophy }
const icon = computed(() => achievementIcons[props.achievement.icon])
</script>

<template>
  <UPopover mode="hover" :content="{ side: 'top', align: 'center', sideOffset: 8 }">
    <button class="achievement-trigger" type="button" :aria-label="`Ver conquista ${achievement.name}`">
      <component :is="icon" class="size-4" aria-hidden="true" />
    </button>

    <template #content>
      <div class="achievement-detail">
        <div class="flex items-start gap-3">
          <span class="achievement-detail__icon"><component :is="icon" class="size-5" /></span>
          <div>
            <strong>{{ achievement.name }}</strong>
            <p>{{ achievement.description }}</p>
          </div>
        </div>
        <dl>
          <div><dt>Raridade</dt><dd>{{ achievement.rarity }}</dd></div>
          <div><dt>Conquistada</dt><dd>{{ achievement.earnedAt }}</dd></div>
          <div><dt>Jogadores</dt><dd>{{ achievement.playerPercentage }}</dd></div>
        </dl>
      </div>
    </template>
  </UPopover>
</template>

<style scoped>
.achievement-trigger { display: grid; width: 36px; height: 36px; place-items: center; border: 1px solid var(--bm-border); border-radius: 50%; background: var(--bm-surface-strong); color: var(--bm-wine); transition: 160ms ease; }
.achievement-trigger:hover { border-color: var(--bm-red); color: var(--bm-red); transform: translateY(-2px); }
.achievement-detail { width: 280px; padding: 14px; color: var(--bm-text); }
.achievement-detail strong { display: block; font: 800 0.82rem/1.2 Inter, sans-serif; }
.achievement-detail p { margin-top: 5px; color: var(--bm-muted); font-size: 0.72rem; line-height: 1.5; }
.achievement-detail__icon { display: grid; width: 38px; height: 38px; flex: none; place-items: center; border-radius: 50%; background: rgb(191 2 2 / 0.1); color: var(--bm-red); }
.achievement-detail dl { display: grid; gap: 5px; margin-top: 12px; border-top: 1px solid var(--bm-border); padding-top: 10px; }
.achievement-detail dl div { display: flex; justify-content: space-between; gap: 12px; font-size: 0.68rem; }
.achievement-detail dt { color: var(--bm-muted); }
.achievement-detail dd { font-weight: 800; }
</style>

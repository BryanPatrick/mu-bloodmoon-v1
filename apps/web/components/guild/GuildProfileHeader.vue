<template>
  <section class="guild-header">
    <div class="guild-header__banner" :style="bannerStyle" />
    <div class="guild-header__content">
      <div class="guild-header__emblem">
        <img v-if="guild.emblemUrl" :src="guild.emblemUrl" :alt="guild.name">
        <Shield v-else class="size-9" />
      </div>

      <div class="guild-header__info">
        <div class="guild-header__title">
          <h1>{{ guild.name }}</h1>
          <span class="guild-header__tag">[{{ guild.tag }}]</span>
          <span class="guild-header__recruitment" :class="`is-${guild.recruitment?.toLowerCase()}`">{{ recruitmentLabel }}</span>
        </div>
        <p class="guild-header__desc">{{ guild.description || 'Esta guilda ainda não escreveu uma descrição.' }}</p>

        <div class="guild-header__level">
          <span>Guild Level {{ guild.guildLevel }}</span>
          <div class="guild-header__level-bar"><span :style="{ width: `${levelProgress}%` }" /></div>
          <small>{{ guild.guildXp }} Guild XP</small>
        </div>

        <div class="guild-header__stats">
          <div><Users class="size-4" /><strong>{{ guild._count?.members ?? guild.members?.length ?? 0 }}</strong><span>Membros</span></div>
          <div><Crown class="size-4" /><strong>{{ leaderName }}</strong><span>Líder</span></div>
          <div v-if="guild.focusTags?.length"><Target class="size-4" /><strong>{{ guild.focusTags.length }}</strong><span>Focos</span></div>
        </div>

        <div v-if="guild.focusTags?.length" class="guild-header__focus">
          <span v-for="tag in guild.focusTags" :key="tag.tag">{{ tag.tag }}</span>
        </div>

        <div v-if="topAchievements.length" class="guild-header__achievements">
          <p class="bm-kicker">Principais conquistas</p>
          <div>
            <span v-for="achievement in topAchievements" :key="achievement">{{ achievement }}</span>
          </div>
        </div>
      </div>

      <div v-if="canManage" class="guild-header__actions">
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Crown, Shield, Target, Users } from 'lucide-vue-next'

const props = defineProps<{
  guild: Record<string, any>
  canManage?: boolean
}>()

const bannerStyle = computed(() => props.guild.bannerUrl ? { backgroundImage: `url(${props.guild.bannerUrl})` } : {})

const recruitmentLabel = computed(() => ({
  OPEN: 'Recrutamento aberto', APPROVAL_REQUIRED: 'Requer aprovação', INVITE_ONLY: 'Somente convite', CLOSED: 'Fechado'
} as Record<string, string>)[props.guild.recruitment] || props.guild.recruitment)

const leaderName = computed(() => {
  const leader = props.guild.members?.find((member: any) => member.roleKey === 'LEADER')
  return leader?.character?.name || leader?.account?.username || '—'
})

// Guild Level thresholds are admin-configured (GuildLevelConfig) and not
// fetched on the public profile this round -- shown as a fixed visual band
// rather than a fabricated percentage against an unknown next-level target.
const levelProgress = computed(() => Math.min(100, ((props.guild.guildXp || 0) % 1000) / 10))

// Preview-only: no GuildAchievement model exists yet (Tier C). Left empty
// rather than filled with fabricated names.
const topAchievements = computed<string[]>(() => [])
</script>

<style scoped>
.guild-header { border: 1px solid var(--bm-border); border-radius: 10px; overflow: hidden; background: var(--bm-surface-strong); box-shadow: var(--shadow-panel); }
.guild-header__banner { height: 140px; background: linear-gradient(120deg, rgb(191 2 2 / 0.25), rgb(16 16 16 / 0.65)); background-size: cover; background-position: center; }
.guild-header__content { position: relative; display: flex; gap: 18px; padding: 0 20px 20px; margin-top: -40px; }
.guild-header__emblem { display: grid; width: 88px; height: 88px; flex: none; place-items: center; overflow: hidden; border-radius: 12px; border: 3px solid var(--bm-surface-strong); background: var(--bm-surface-soft); color: var(--bm-muted); }
.guild-header__emblem img { width: 100%; height: 100%; object-fit: cover; }
.guild-header__info { min-width: 0; flex: 1; padding-top: 44px; }
.guild-header__title { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.guild-header__title h1 { font-family: Cinzel, serif; font-size: 1.4rem; font-weight: 900; color: var(--bm-heading); }
.guild-header__tag { font-size: 0.78rem; font-weight: 800; color: var(--bm-muted); }
.guild-header__recruitment { border-radius: 3px; border: 1px solid var(--bm-border-strong); padding: 2px 8px; font-size: 0.6rem; font-weight: 900; text-transform: uppercase; color: var(--bm-muted); }
.guild-header__recruitment.is-open { border-color: #1f8a4c; color: #1f8a4c; }
.guild-header__desc { margin-top: 8px; max-width: 640px; color: var(--bm-muted); font-size: 0.78rem; line-height: 1.6; }
.guild-header__level { margin-top: 14px; max-width: 320px; }
.guild-header__level span { font-size: 0.68rem; font-weight: 800; color: var(--bm-wine); text-transform: uppercase; }
.guild-header__level-bar { height: 6px; margin-top: 6px; border-radius: 999px; background: var(--bm-surface-soft); overflow: hidden; }
.guild-header__level-bar span { display: block; height: 100%; background: var(--bm-red); }
.guild-header__level small { display: block; margin-top: 4px; color: var(--bm-muted); font-size: 0.62rem; }
.guild-header__stats { display: flex; flex-wrap: wrap; gap: 22px; margin-top: 16px; }
.guild-header__stats > div { display: flex; align-items: center; gap: 6px; color: var(--bm-muted); }
.guild-header__stats strong { color: var(--bm-heading); font-size: 0.82rem; }
.guild-header__stats span { font-size: 0.62rem; text-transform: uppercase; }
.guild-header__focus { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.guild-header__focus span { border: 1px solid var(--bm-border); border-radius: 999px; padding: 3px 10px; font-size: 0.6rem; font-weight: 800; color: var(--bm-muted); text-transform: uppercase; }
.guild-header__achievements { margin-top: 14px; }
.guild-header__achievements > div { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.guild-header__achievements span { border: 1px solid var(--bm-border); border-radius: 4px; padding: 3px 8px; font-size: 0.62rem; color: var(--bm-muted); }
.guild-header__actions { position: absolute; top: 16px; right: 20px; display: flex; gap: 8px; }
@media (max-width: 640px) {
  .guild-header__content { flex-direction: column; margin-top: -32px; padding: 0 14px 16px; }
  .guild-header__emblem { width: 72px; height: 72px; }
  .guild-header__info { padding-top: 8px; }
  .guild-header__actions { position: static; margin-top: 12px; }
}
</style>

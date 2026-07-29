<template>
  <main class="min-h-screen bg-black text-white">
    <section class="mx-auto w-full max-w-5xl px-4 py-6">
      <div v-if="profile" class="grid gap-5">
        <header class="bm-panel overflow-hidden rounded-md">
          <div class="h-36 bg-white/5" :style="profile.communityProfile?.coverUrl ? { backgroundImage: `url(${profile.communityProfile.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}" />
          <div class="flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
            <span class="-mt-16 grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-black bg-zinc-900">
              <img v-if="profile.communityProfile?.avatarUrl" :src="profile.communityProfile.avatarUrl" alt="" class="size-full object-cover">
              <UserRound v-else class="size-8 text-white/30" />
            </span>
            <div>
              <h1 class="font-display text-3xl font-black">{{ profile.communityProfile?.displayName || profile.name }}</h1>
              <p class="text-xs text-white/40">@{{ profile.username }}</p>
              <p class="mt-3 max-w-2xl text-sm text-white/65">{{ profile.communityProfile?.bio || 'Este jogador ainda não escreveu uma biografia.' }}</p>
            </div>
          </div>
        </header>
        <section class="grid gap-3 sm:grid-cols-2">
          <article v-for="grant in profile.achievementGrants" :key="grant.id" class="bm-panel flex gap-3 rounded-md p-4">
            <Trophy class="size-5 text-ember" />
            <div><strong class="text-sm">{{ grant.achievement.name }}</strong><p class="text-[11px] text-white/45">{{ grant.achievement.description }}</p></div>
          </article>
          <article v-for="grant in profile.badgeGrants" :key="grant.id" class="bm-panel flex gap-3 rounded-md p-4">
            <BadgeCheck class="size-5 text-cyan-300" />
            <div><strong class="text-sm">{{ grant.badge.name }}</strong><p class="text-[11px] text-white/45">{{ grant.badge.description }}</p></div>
          </article>
        </section>
        <section class="grid gap-3">
          <article v-for="post in profile.communityPosts" :key="post.id" class="bm-panel rounded-md p-4">
            <h2 v-if="post.title" class="font-display text-xl">{{ post.title }}</h2>
            <p class="mt-2 text-sm leading-6 text-white/65">{{ post.content }}</p>
            <p class="mt-3 text-[10px] text-white/35">{{ post._count.reactions }} reações · {{ post._count.comments }} comentários</p>
          </article>
        </section>
      </div>
      <p v-else class="text-sm text-white/50">Carregando perfil...</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { BadgeCheck, Trophy, UserRound } from 'lucide-vue-next'
const route = useRoute()
const api = useCommunityApi()
const profile = ref<any>(null)
onMounted(async () => { profile.value = await api.publicProfile(String(route.params.username)) })
</script>

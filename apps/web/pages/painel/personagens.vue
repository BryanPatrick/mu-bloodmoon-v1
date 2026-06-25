<template>
  <ManagementShell>
    <div class="flex flex-col gap-5 border-b border-white/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p class="bm-kicker">Conta</p>
        <h1 class="mt-2 font-display text-4xl font-black uppercase">Gerenciar personagens</h1>
        <p class="mt-3 max-w-3xl text-sm font-semibold leading-7 text-white/68">
          Visualize personagens vinculados a conta, acompanhe status e prepare solicitacoes de servico.
        </p>
      </div>

      <div class="bm-glass grid gap-3 rounded-md p-3 sm:grid-cols-3 xl:min-w-[640px]">
        <input
          v-model="query"
          class="h-11 min-w-0 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-blood-400/70"
          placeholder="Buscar personagem"
          type="search"
        >
        <select v-model="activeClass" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
          <option class="bg-zinc-950 text-white" value="Todas">Todas classes</option>
          <option v-for="className in classes" :key="className" class="bg-zinc-950 text-white" :value="className">{{ className }}</option>
        </select>
        <select v-model="activeStatus" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
          <option class="bg-zinc-950 text-white" value="Todos">Todos status</option>
          <option class="bg-zinc-950 text-white" value="Online">Online</option>
          <option class="bg-zinc-950 text-white" value="Offline">Offline</option>
        </select>
      </div>
    </div>

    <div class="mt-8 grid gap-5 xl:grid-cols-3">
      <article v-for="character in filteredCharacters" :key="character.id" class="bm-panel rounded-md p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-black uppercase tracking-[0.22em] text-ember">{{ character.class }}</p>
            <h2 class="mt-2 font-display text-2xl font-black">{{ character.name }}</h2>
            <p v-if="isAdmin" class="mt-1 text-xs font-bold text-white/45">Conta: {{ character.ownerUsername }}</p>
          </div>
          <span class="rounded-sm bg-white/10 px-2 py-1 text-xs font-black text-white/65">Lv {{ character.level }}</span>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-md bg-black/25 p-3">
            <p class="text-xs font-bold text-white/45">Reset</p>
            <p class="mt-1 font-display text-xl font-black">{{ character.reset }}</p>
          </div>
          <div class="rounded-md bg-black/25 p-3">
            <p class="text-xs font-bold text-white/45">Master</p>
            <p class="mt-1 font-display text-xl font-black">{{ character.masterReset }}</p>
          </div>
          <div class="rounded-md bg-black/25 p-3">
            <p class="text-xs font-bold text-white/45">Mapa</p>
            <p class="mt-1 font-display text-xl font-black">{{ character.map }}</p>
          </div>
          <div class="rounded-md bg-black/25 p-3">
            <p class="text-xs font-bold text-white/45">Status</p>
            <p class="mt-1 font-display text-xl font-black" :class="character.status === 'Online' ? 'text-emerald-100' : 'text-white'">{{ character.status }}</p>
          </div>
        </div>

        <div class="mt-4 grid gap-2 text-sm font-bold">
          <div class="flex justify-between rounded-md bg-white/[0.045] px-3 py-2">
            <span class="text-white/55">Guild</span>
            <span>{{ character.guild }}</span>
          </div>
          <div class="flex justify-between rounded-md bg-white/[0.045] px-3 py-2">
            <span class="text-white/55">PK</span>
            <span>{{ character.pkStatus }}</span>
          </div>
        </div>

        <div class="mt-5 flex gap-2">
          <button class="bm-button-glass flex-1 rounded-md px-3 py-2 text-sm font-bold" type="button" @click="selectCharacter(character.name)">
            Detalhes
          </button>
          <button class="bm-button-glass flex-1 rounded-md px-3 py-2 text-sm font-bold" type="button" @click="requestReset(character.name)">
            Resetar
          </button>
        </div>
      </article>
    </div>

    <p v-if="message" class="mt-6 rounded-md border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-100">
      {{ message }}
    </p>
  </ManagementShell>
</template>

<script setup lang="ts">
useSeoMeta({ title: 'Gerenciar personagens' })

const { isAdmin, loadSession, recordAudit, user } = useAuth()
const { loadManagement, state } = useManagement()
const query = ref('')
const activeClass = ref('Todas')
const activeStatus = ref('Todos')
const message = ref('')

onMounted(() => {
  loadSession()
  loadManagement()
})

const visibleCharacters = computed(() =>
  isAdmin.value
    ? state.value.characters
    : state.value.characters.filter((character) => character.ownerUsername === user.value?.username)
)

const classes = computed(() => Array.from(new Set(visibleCharacters.value.map((character) => character.class))).sort())

const filteredCharacters = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase()

  return visibleCharacters.value.filter((character) => {
    const matchesClass = activeClass.value === 'Todas' || character.class === activeClass.value
    const matchesStatus = activeStatus.value === 'Todos' || character.status === activeStatus.value
    const matchesQuery = !normalizedQuery || [character.name, character.class, character.map, character.guild, character.ownerUsername]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)

    return matchesClass && matchesStatus && matchesQuery
  })
})

const selectCharacter = (name: string) => {
  message.value = `Detalhes de ${name} preparados para a proxima etapa do painel.`
  recordAudit({
    type: 'characters.details.opened',
    message: `Detalhes do personagem ${name} foram consultados.`,
    meta: { character: name }
  })
}

const requestReset = (name: string) => {
  message.value = `Solicitacao de reset para ${name} registrada em modo teste.`
  recordAudit({
    type: 'characters.reset.requested',
    message: `Reset solicitado para ${name}.`,
    meta: { character: name }
  })
}
</script>

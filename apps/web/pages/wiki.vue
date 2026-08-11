<template>
  <div>
    <section class="wiki-hero">
      <img src="/images/guide-elfa-hero.png" alt="Wiki Blood Moon" class="wiki-hero-image">
      <div class="wiki-hero-overlay" />
      <div class="bm-guide-container wiki-hero-content">
        <p><Diamond class="size-2.5" /> Base de conhecimento</p>
        <h1>Wiki <span>Blood Moon</span></h1>
        <small>Encontre tudo que precisa sobre itens, personagens, mapas e sistemas do servidor.</small>
        <label class="wiki-search"><Search class="size-4" /><input v-model="wikiSearch" type="search" placeholder="Pesquisar item, personagem ou sistema..."></label>
        <div class="wiki-popular"><strong>Pesquisas populares</strong><button v-for="topic in popularTopics" :key="topic.label" type="button" @click="selectTopic(topic.section, topic.key)">{{ topic.label }}</button></div>
      </div>
    </section>

    <section
      class="bm-guide-container wiki-shell transition-[grid-template-columns]"
      :class="!activeSectionKey ? 'wiki-shell-landing' : (isWikiAsideCollapsed ? 'grid gap-4 lg:grid-cols-[72px_1fr]' : 'grid gap-4 lg:grid-cols-[18rem_1fr]')"
    >
      <aside
        v-if="activeSectionKey"
        class="bm-panel h-fit rounded-md transition-all lg:sticky lg:top-28"
        :class="isWikiAsideCollapsed ? 'is-wiki-collapsed p-3' : 'p-[24px]'"
      >
        <div class="flex items-start justify-between gap-3" :class="{ 'justify-center': isWikiAsideCollapsed }">
          <div v-if="!isWikiAsideCollapsed">
            <p class="bm-kicker">Wiki</p>
            <h2 class="bm-heading mt-[6px] font-display text-2xl font-bold">Conteudos</h2>
          </div>

          <div class="flex items-start gap-2">
            <div v-if="!isWikiAsideCollapsed" class="relative">
              <button
                class="rounded-md border border-white/10 bg-white/10 px-2.5 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:border-ember/45 hover:bg-white/15"
                type="button"
                :aria-label="wikiSeasonNotice"
                @click="isWikiSeasonOpen = !isWikiSeasonOpen"
              >
                S{{ wikiSeason }}
              </button>
              <div
                v-if="isWikiSeasonOpen && isWikiAdmin"
                class="absolute right-0 z-20 mt-2 grid max-h-64 w-32 gap-1 overflow-auto rounded-md border border-white/10 bg-zinc-950/95 p-1 shadow-2xl backdrop-blur-xl"
              >
                <button
                  v-for="season in availableWikiSeasons"
                  :key="season"
                  class="rounded px-2 py-1.5 text-left text-xs font-black text-white/75 transition hover:bg-white/10 hover:text-white"
                  :class="{ 'bg-ember/20 text-white': wikiSeason === season }"
                  type="button"
                  @click="selectWikiSeason(season)"
                >
                  Season {{ season }}
                </button>
              </div>
            </div>

            <button
              class="grid size-8 place-items-center rounded-md border border-white/10 bg-white/10 text-white transition hover:border-ember/45 hover:bg-white/15"
              type="button"
              :aria-label="isWikiAsideCollapsed ? 'Abrir menu da wiki' : 'Recolher menu da wiki'"
              :title="isWikiAsideCollapsed ? 'Abrir menu' : 'Recolher menu'"
              @click="toggleWikiAside"
            >
              <PanelLeftOpen v-if="isWikiAsideCollapsed" class="size-4" />
              <PanelLeftClose v-else class="size-4" />
            </button>
          </div>
        </div>

        <nav class="mt-5 grid gap-2">
          <div v-for="section in navigationSections" :key="section.key">
            <button
              class="bm-nav-link flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-bold"
              :class="{ 'bm-nav-link-active': openSections.includes(section.key) || activeSectionKey === section.key }"
              :title="isWikiAsideCollapsed ? section.title : undefined"
              type="button"
              @click="selectSection(section.key)"
            >
              <span class="flex min-w-0 items-center gap-2" :class="{ 'mx-auto': isWikiAsideCollapsed }">
                <component :is="wikiSectionIcon(section.key)" class="size-4 shrink-0" />
                <span v-if="!isWikiAsideCollapsed" class="truncate">{{ section.title }}</span>
              </span>
              <ChevronDown
                v-if="!isWikiAsideCollapsed && section.topics.length"
                class="size-4 transition-transform"
                :class="{ 'rotate-180 text-white': openSections.includes(section.key) }"
              />
            </button>

            <div v-if="!isWikiAsideCollapsed && section.topics.length && openSections.includes(section.key)" class="mt-1 grid gap-1 pl-4">
              <button
                v-for="topic in section.topics"
                :key="topic.key"
                class="bm-nav-link rounded-md px-3 py-2 text-left text-xs font-bold"
                :class="{ 'bm-nav-link-active': activeTopicKey === topic.key }"
                :disabled="topic.disabled"
                type="button"
                @click="selectTopic(section.key, topic.key)"
              >
                <span :class="{ 'text-zinc-500': topic.disabled }">{{ topic.label }}</span>
                <span v-if="topic.disabled" class="ml-2 text-[10px] uppercase tracking-[0.16em] text-ember">Futuro</span>
              </button>
            </div>
          </div>
        </nav>
      </aside>

      <section :class="activeSectionKey ? 'bm-panel rounded-md p-[24px]' : 'wiki-landing-panel'">
        <div v-if="!activeSectionKey" class="wiki-landing">
          <header><p>Explore todo o conhecimento</p><h2>Pesquise no Wiki</h2><span /></header>
          <div class="wiki-category-grid">
            <button v-for="section in wikiLandingCategories" :key="section.key" class="wiki-category-card" type="button" @click="selectSection(section.key)">
              <span class="wiki-category-icon"><BloodMoonIcon :name="section.icon" /></span>
              <span><strong>{{ section.title }}</strong><small>{{ section.description }}</small></span>
              <ChevronRight class="wiki-category-arrow size-4" />
            </button>
          </div>
          <div class="wiki-lower-grid">
            <section class="wiki-list-panel"><h3>Tópicos populares</h3><button v-for="topic in wikiFeaturedTopics" :key="topic.label" type="button" @click="selectTopic(topic.section, topic.key)"><span class="wiki-topic-thumb"><component :is="topic.icon" /></span><strong>{{ topic.label }}</strong><ChevronRight class="size-3.5" /></button><NuxtLink to="/wiki">Veja todos os tópicos</NuxtLink></section>
            <section class="wiki-list-panel wiki-updates"><h3>Atualizações recentes</h3><article v-for="update in wikiRecentUpdates" :key="update.title"><span><FileText class="size-3.5" /></span><strong>{{ update.title }}</strong><time>{{ update.date }}</time></article><NuxtLink to="/noticias">Veja todas as novidades</NuxtLink></section>
          </div>
        </div>
        <div v-else-if="isEquipmentLanding" class="grid gap-5">
          <div class="rounded-md border border-white/10 bg-black/20 p-[24px]">
            <p class="bm-kicker">Guia de equipamentos</p>
            <h2 class="bm-heading mt-[6px] font-display text-3xl font-bold">Como ler os equipamentos do Blood Moon</h2>
            <p class="bm-muted mt-[10px] max-w-4xl text-sm leading-6">
              Esta area centraliza sets, armas, escudos, asas, capas, acessorios, pets, mounts, consumiveis e jewels.
              Os tipos como Normal, Excellent, Ancient, Socket, Lucky e Mastery sao propriedades do equipamento,
              nao categorias separadas da wiki.
            </p>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <article
              v-for="entry in equipmentTutorialCards"
              :key="entry.title"
              class="rounded-md border border-white/10 bg-black/20 p-4"
            >
              <p class="bm-kicker">{{ entry.kicker }}</p>
              <h3 class="mt-2 font-display text-xl font-black text-white">{{ entry.title }}</h3>
              <p class="mt-3 text-sm leading-6 text-zinc-400">{{ entry.description }}</p>
            </article>
          </div>

          <div class="rounded-md border border-amber-300/20 bg-amber-300/[0.06] p-4">
            <p class="bm-kicker text-amber-200">Observacao importante</p>
            <p class="mt-2 text-sm leading-6 text-amber-100/90">
              A regra do Jewel of Guardian e separada: itens 380 comuns podem receber a opcao 380/Siege quando elegiveis,
              mas sets 380 Socket sao outra familia de item e nao devem receber esse aviso como se fossem itens 380 comuns.
            </p>
          </div>
        </div>

        <div v-else-if="isFairyElfTopic" class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_56px] xl:items-start">
          <nav
            class="bm-character-quick-nav hidden gap-2 rounded-md border border-white/15 bg-zinc-950/75 p-2 shadow-2xl backdrop-blur-xl xl:sticky xl:top-28 xl:order-2 xl:grid xl:self-start"
            aria-label="Atalhos da pagina do personagem"
          >
            <a
              v-for="anchor in characterAnchorLinks"
              :key="anchor.id"
              class="grid size-10 place-items-center rounded-md border border-white/10 bg-white/[0.06] text-zinc-300 transition hover:border-ember/50 hover:bg-ember/15 hover:text-white"
              :href="`#${anchor.id}`"
              :title="anchor.label"
              :aria-label="anchor.label"
            >
              <component :is="anchor.icon" class="size-4" />
            </a>
          </nav>

          <div class="grid min-w-0 gap-5 xl:order-1">
          <section id="personagem-visao" class="relative min-h-[340px] overflow-hidden rounded-md border border-white/10 bg-black/30">
            <img
              class="absolute inset-0 h-full w-full scale-105 object-cover object-right"
              src="/images/guide-elfa-hero.png"
              alt="Fairy Elf em Noria"
            >
            <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.78)_35%,rgba(0,0,0,0.26)_68%,rgba(0,0,0,0.02)_100%)]" />

            <div class="relative flex min-h-[340px] items-center p-[24px] pr-[72px]">
              <div class="max-w-lg rounded-md border border-white/10 bg-black/58 p-4 shadow-2xl backdrop-blur-sm">
                <p class="bm-kicker">Personagem</p>
                <h2 class="bm-heading mt-[6px] font-display text-4xl font-bold">Fairy Elf</h2>
                <p class="mt-2 text-[10px] font-black uppercase tracking-[0.24em] text-ember">Guardia de Noria</p>
                <p class="mt-4 max-w-lg text-xs font-semibold leading-6 text-zinc-100">
                  Graciosa a distancia e implacavel sob pressao, a Fairy Elf domina o campo de batalha com flechas
                  precisas, apoio magico e mobilidade natural. Quando suas asas se abrem, cada disparo vira uma sentenca.
                </p>
              </div>
            </div>
          </section>

          <section id="personagem-status" class="scroll-mt-28 rounded-md border border-white/10 bg-black/20 p-4">
            <div class="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
              <div class="rounded-md border border-white/10 bg-black/45 p-3">
                <p class="bm-kicker">Status base</p>
                <div class="mt-2 aspect-square">
                  <svg class="h-full w-full" viewBox="0 0 220 220" role="img" aria-label="Grafico de atributos da Fairy Elf">
                    <polygon points="110,18 197,82 164,188 56,188 23,82" fill="none" stroke="rgba(255,255,255,0.18)" />
                    <polygon points="110,50 166,91 145,159 75,159 54,91" fill="none" stroke="rgba(255,255,255,0.12)" />
                    <line x1="110" y1="110" x2="110" y2="18" stroke="rgba(255,255,255,0.10)" />
                    <line x1="110" y1="110" x2="197" y2="82" stroke="rgba(255,255,255,0.10)" />
                    <line x1="110" y1="110" x2="164" y2="188" stroke="rgba(255,255,255,0.10)" />
                    <line x1="110" y1="110" x2="56" y2="188" stroke="rgba(255,255,255,0.10)" />
                    <line x1="110" y1="110" x2="23" y2="82" stroke="rgba(255,255,255,0.10)" />
                    <polygon :points="fairyElfRadarPoints" fill="rgba(255, 91, 54, 0.28)" stroke="rgba(255, 186, 90, 0.95)" stroke-width="2" />
                    <circle
                      v-for="point in fairyElfRadarDots"
                      :key="point.label"
                      :cx="point.x"
                      :cy="point.y"
                      r="3"
                      fill="#ffba5a"
                    />
                    <text
                      v-for="label in fairyElfRadarLabels"
                      :key="label.label"
                      :x="label.x"
                      :y="label.y"
                      text-anchor="middle"
                      class="fill-zinc-200 text-[10px] font-black uppercase tracking-[0.12em]"
                    >
                      {{ label.label }}
                    </text>
                  </svg>
                </div>
                <div class="mt-2 grid grid-cols-5 gap-1 text-center">
                  <div
                    v-for="stat in fairyElfProfile.baseStats"
                    :key="stat.label"
                    class="rounded-sm border border-white/10 bg-white/[0.04] px-1.5 py-1.5"
                  >
                    <p class="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">{{ stat.label }}</p>
                    <p class="mt-0.5 text-xs font-black text-white">{{ stat.value }}</p>
                  </div>
                </div>
              </div>

              <div class="grid gap-3">
                <div class="grid gap-2 sm:grid-cols-2">
                  <div
                    v-for="bar in fairyElfProfile.bars"
                    :key="bar.label"
                    class="rounded-md border border-white/10 bg-white/[0.035] p-2.5"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <p class="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">{{ bar.label }}</p>
                      <p class="text-xs font-black text-white">{{ bar.value }}/10</p>
                    </div>
                    <div class="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                      <div class="h-full rounded-full bg-ember" :style="{ width: `${bar.value * 10}%` }" />
                    </div>
                  </div>
                </div>

                <div class="grid overflow-hidden rounded-md border border-white/15 bg-black/35 sm:grid-cols-2 xl:grid-cols-4">
                  <div
                    v-for="stat in fairyElfProfile.summary"
                    :key="stat.label"
                    class="border-r border-white/10 p-3 last:border-r-0"
                  >
                    <p class="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{{ stat.label }}</p>
                    <p class="mt-1.5 font-display text-sm font-black text-white">{{ stat.value }}</p>
                  </div>
                </div>
              </div>

              <article id="personagem-estilo" class="scroll-mt-28 overflow-hidden rounded-md border border-white/10 bg-black/45">
                <header class="flex items-start justify-between gap-3 border-b border-white/10 p-3">
                  <div>
                    <p class="bm-kicker">Estilo de jogo</p>
                    <h3 class="mt-1 font-display text-lg font-black text-white">Rotas da Fairy Elf</h3>
                  </div>
                  <span class="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-300">
                    {{ activeFairyElfStyleIndex + 1 }}/{{ fairyElfProfile.styles.length }}
                  </span>
                </header>

                <div class="relative min-h-40 overflow-hidden">
                  <Transition name="bm-style-card" mode="out-in">
                    <div :key="activeFairyElfStyle.title" class="absolute inset-0">
                      <img
                        class="absolute inset-0 h-full w-full object-cover"
                        :src="activeFairyElfStyle.image"
                        :alt="activeFairyElfStyle.title"
                      >
                      <div class="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/5" />
                      <div class="absolute bottom-3 left-3 right-3">
                        <p class="text-[10px] font-black uppercase tracking-[0.18em] text-ember">Foco atual</p>
                        <h4 class="mt-1 font-display text-2xl font-black text-white">{{ activeFairyElfStyle.title }}</h4>
                      </div>
                    </div>
                  </Transition>
                </div>

                <footer class="border-t border-white/10 p-3">
                  <Transition name="bm-style-copy" mode="out-in">
                    <p :key="activeFairyElfStyle.title" class="min-h-16 text-xs font-semibold leading-5 text-zinc-300">
                      {{ activeFairyElfStyle.description }}
                    </p>
                  </Transition>
                  <div class="mt-3 flex gap-1.5">
                    <button
                      v-for="(style, index) in fairyElfProfile.styles"
                      :key="style.title"
                      class="h-1.5 flex-1 rounded-full transition"
                      :class="index === activeFairyElfStyleIndex ? 'bg-ember' : 'bg-white/15 hover:bg-white/30'"
                      type="button"
                      :aria-label="`Ver estilo ${style.title}`"
                      @click="activeFairyElfStyleIndex = index"
                    />
                  </div>
                </footer>
              </article>
            </div>
          </section>

          <div class="grid gap-4">
            <article id="personagem-identidade" class="scroll-mt-28 rounded-md border border-white/10 bg-black/20 p-[24px]">
              <p class="bm-kicker">Identidade</p>
              <h3 class="bm-heading mt-[6px] font-display text-3xl font-bold">A sentinela das asas sagradas</h3>
              <div class="mt-4 grid gap-3 text-sm font-semibold leading-7 text-zinc-300">
                <p>
                  Nas florestas antigas de Noria, a Fairy Elf aprendeu que beleza e perigo podem dividir o mesmo silencio.
                  Sua presenca no grupo muda o ritmo da luta: ela abre espaco com tiros longos, protege companheiros com
                  encantamentos e escolhe o momento exato para transformar defesa em ataque.
                </p>
                <p>
                  Em Blood Moon, a classe recompensa posicionamento, leitura de combate e evolucao constante de equipamento.
                  O arco certo, a asa certa e uma boa rota de progressao fazem a Fairy Elf crescer de suporte essencial para
                  ameaca decisiva.
                </p>
              </div>
            </article>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <article
              v-for="section in fairyElfProfile.sections"
              :key="section.title"
              :id="section.anchor"
              class="scroll-mt-28 rounded-md border border-white/10 bg-black/20 p-[24px]"
            >
              <p class="bm-kicker">{{ section.kicker }}</p>
              <h3 class="bm-heading mt-[6px] font-display text-2xl font-bold">{{ section.title }}</h3>
              <p v-if="section.description" class="mt-3 text-sm font-semibold leading-6 text-zinc-400">{{ section.description }}</p>
              <ul class="mt-4 grid gap-2">
                <li
                  v-for="item in section.items"
                  :key="item"
                  class="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-bold text-zinc-300"
                >
                  {{ item }}
                </li>
              </ul>
            </article>
          </div>

          <div id="personagem-referencias" class="scroll-mt-28 rounded-md border border-white/10 bg-black/20 p-[24px]">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="bm-kicker">Dados coletados</p>
                <h3 class="bm-heading mt-[6px] font-display text-2xl font-bold">Referencias vinculadas a Fairy Elf</h3>
              </div>
              <span class="rounded-md border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-300">
                {{ activeCharacterKnowledgeEntries.length }} registros
              </span>
            </div>
            <div v-if="activeCharacterKnowledgeEntries.length" class="mt-5 grid gap-3 lg:grid-cols-2">
              <article
                v-for="entry in activeCharacterKnowledgeEntries"
                :key="entry.id"
                class="rounded-md border border-white/10 bg-black/25 p-4"
              >
                <p class="bm-kicker">{{ entry.kind }}</p>
                <h4 class="mt-2 font-display text-lg font-black text-white">{{ entry.title }}</h4>
                <p class="mt-3 text-sm leading-6 text-zinc-400">{{ entrySummary(entry) }}</p>
              </article>
            </div>
            <p v-else class="mt-5 rounded-md border border-dashed border-white/15 bg-black/20 p-5 text-sm font-bold text-zinc-400">
              Nenhuma referencia da API foi vinculada ainda para esta personagem.
            </p>
          </div>
          </div>
        </div>

        <div v-else-if="isCharactersSection" class="grid gap-5">
          <div class="rounded-md border border-white/10 bg-black/20 p-[24px]">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="bm-kicker">Personagens</p>
                <h2 class="bm-heading mt-[6px] font-display text-3xl font-bold">{{ activeCharacter?.name || 'Classes do Mu Online' }}</h2>
                <p class="bm-muted mt-[6px] max-w-4xl text-sm leading-6">
                  {{ activeCharacterDescription }}
                </p>
              </div>
              <span class="rounded-md border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-300">
                {{ filteredWikiCharacters.length }} personagens
              </span>
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            <article
              v-for="character in filteredWikiCharacters"
              :key="character.key"
              class="rounded-md border border-white/10 bg-black/20 p-4 transition hover:border-ember/45 hover:bg-white/[0.045]"
              :class="{ 'border-ember/55 bg-ember/[0.06]': activeCharacter?.key === character.key }"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="bm-kicker">Season {{ character.minSeason }}</p>
                  <h3 class="mt-2 font-display text-xl font-black text-white">{{ character.name }}</h3>
                </div>
                <span
                  class="rounded-sm px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]"
                  :class="character.isSeasonSixBase ? 'bg-emerald-400/15 text-emerald-100' : 'bg-ember/15 text-ember'"
                >
                  {{ character.isSeasonSixBase ? 'Season 6' : 'Futuro' }}
                </span>
              </div>
              <p class="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Evolucoes</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <span
                  v-for="classItem in character.classes"
                  :key="classItem.key"
                  class="rounded-sm border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-bold text-zinc-300"
                >
                  {{ classItem.tier }}. {{ classItem.name }}
                </span>
              </div>
              <div class="mt-4 grid grid-cols-2 gap-2">
                <div class="rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <p class="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Sets</p>
                  <p class="mt-1 font-display text-xl font-black text-white">{{ characterEquipmentCount(character.name) }}</p>
                </div>
                <div class="rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <p class="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">Skills/guias</p>
                  <p class="mt-1 font-display text-xl font-black text-white">{{ characterKnowledgeCount(character.name) }}</p>
                </div>
              </div>
            </article>
          </div>

          <div v-if="activeCharacterKnowledgeEntries.length" class="grid gap-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="bm-kicker">Dados coletados</p>
                <h3 class="mt-[6px] font-display text-2xl font-black text-white">Conteudos relacionados</h3>
              </div>
              <span class="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">{{ activeCharacterKnowledgeEntries.length }} registros</span>
            </div>
            <div class="grid gap-3 lg:grid-cols-2">
              <article
                v-for="entry in activeCharacterKnowledgeEntries"
                :key="entry.id"
                class="rounded-md border border-white/10 bg-black/20 p-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="bm-kicker">{{ entry.kind }}</p>
                    <h4 class="mt-2 font-display text-lg font-black text-white">{{ entry.title }}</h4>
                  </div>
                  <span class="rounded-sm bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300">{{ entry.scope }}</span>
                </div>
                <p class="mt-3 text-sm leading-6 text-zinc-400">{{ entrySummary(entry) }}</p>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span
                    v-for="heading in entryHeadings(entry).slice(0, 5)"
                    :key="heading"
                    class="rounded-sm border border-white/10 bg-white/[0.035] px-2 py-1 text-xs font-bold text-zinc-400"
                  >
                    {{ heading }}
                  </span>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div v-else-if="!activeTopic && !isKnowledgeTopic" class="rounded-md border border-dashed border-white/15 bg-black/15 p-[24px] text-center">
          <div>
            <p class="bm-kicker">Wiki Blood Moon</p>
            <h2 class="bm-heading mt-[6px] font-display text-3xl font-bold">Selecione um conteudo</h2>
            <p class="bm-muted mt-[6px] max-w-xl text-sm leading-6">
              Escolha uma categoria no menu lateral e depois selecione um item para renderizar o conteudo aqui.
            </p>
          </div>
        </div>

        <template v-else>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="bm-kicker">Topico da wiki</p>
            <h2 class="bm-heading mt-[6px] font-display text-3xl font-bold">{{ contentTitle }}</h2>
            <p class="bm-muted mt-[6px] max-w-3xl text-sm leading-6">{{ contentDescription }}</p>
          </div>
          <span class="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-300">
            {{ contentBadge }}
          </span>
        </div>

        <div class="mt-6 grid gap-4">
          <div v-if="isSetsTopic" class="grid gap-5">
            <div class="grid gap-3 rounded-md border border-white/10 bg-black/20 p-[24px]">
              <div class="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h3 class="bm-heading font-display text-2xl font-bold">Catalogo de sets</h3>
                  <p class="bm-muted mt-[6px] text-sm leading-6">
                    {{ allOptionLabel }} mostra todos os itens, sempre do mais fraco ao mais forte.
                  </p>
                </div>
              </div>

              <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[minmax(150px,180px)_minmax(170px,220px)_minmax(140px,180px)_minmax(170px,220px)_minmax(260px,1fr)]">
                <label class="grid min-w-0 gap-1 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                  Personagem
                  <select v-model="setCharacterFilter" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-blood-400/70">
                    <option class="bg-zinc-950 text-white" value="Default">{{ allOptionLabel }}</option>
                    <option v-for="character in setCharacterOptions" :key="character" class="bg-zinc-950 text-white" :value="character">{{ character }}</option>
                  </select>
                </label>

                <label class="grid min-w-0 gap-1 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                  Classe
                  <select v-model="setEvolutionFilter" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-blood-400/70">
                    <option class="bg-zinc-950 text-white" value="Default">{{ allOptionLabel }}</option>
                    <option v-for="evolution in setEvolutionOptions" :key="evolution" class="bg-zinc-950 text-white" :value="evolution">{{ evolution }}</option>
                  </select>
                </label>

                <label class="grid min-w-0 gap-1 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                  Tipo
                  <select v-model="setTypeFilter" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-blood-400/70">
                    <option class="bg-zinc-950 text-white" value="Default">{{ allOptionLabel }}</option>
                    <option v-for="type in setTypeOptions" :key="type" class="bg-zinc-950 text-white" :value="type">{{ type }}</option>
                  </select>
                </label>

                <label class="grid min-w-0 gap-1 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                  Equipamento
                  <select v-model="setEquipmentFilter" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-blood-400/70">
                    <option class="bg-zinc-950 text-white" value="Default">{{ allOptionLabel }}</option>
                    <option v-for="equipment in setEquipmentOptions" :key="equipment" class="bg-zinc-950 text-white" :value="equipment">{{ equipment }}</option>
                  </select>
                </label>

                <label class="grid min-w-0 gap-1 text-xs font-black uppercase tracking-[0.14em] text-zinc-400 xl:col-span-2 2xl:col-span-1">
                  Buscar por nome
                  <input
                    v-model="setNameSearch"
                    class="h-11 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold normal-case tracking-normal text-white outline-none transition placeholder:text-white/45 focus:border-blood-400/70"
                    placeholder="Digite o nome do equipamento"
                    type="search"
                  >
                </label>
              </div>
            </div>

            <div class="rounded-md border border-white/10 bg-black/20 p-3 sm:p-4">
              <div>
                <div v-if="setCardsLoading" class="px-4 py-8 text-center text-sm font-bold text-zinc-400">
                  Carregando sets do banco de dados...
                </div>
                <div v-else-if="setCardsError" class="px-4 py-8 text-center text-sm font-bold text-red-200">
                  {{ setCardsError }}
                </div>
                <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  <EquipmentSetCard
                    v-for="set in paginatedSetCards"
                    :key="set.key"
                    :name="set.name"
                    :image="setPreviewImage(set)"
                    :classes="setDisplayClasses(set)"
                    :character-chibis="set.characterChibis"
                    :set-types="set.setTypes"
                    :pieces="set.pieces"
                    @select="openSetModal(set)"
                  />
                </div>
              </div>
            </div>

            <div
              v-if="filteredSetCards.length > 0"
              class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-400"
            >
              <span>Pagina {{ setCurrentPage }} de {{ setTotalPages }} - {{ filteredSetCards.length }} itens</span>
              <div class="flex items-center gap-2">
                <button
                  class="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                  type="button"
                  :disabled="setCurrentPage <= 1"
                  @click="setCurrentPage--"
                >
                  Anterior
                </button>
                <button
                  class="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                  type="button"
                  :disabled="setCurrentPage >= setTotalPages"
                  @click="setCurrentPage++"
                >
                  Proxima
                </button>
              </div>
            </div>

            <div v-if="filteredSetCards.length === 0" class="rounded-md border border-dashed border-white/15 bg-white/[0.035] p-8 text-center">
              <p class="bm-kicker">Nada encontrado</p>
              <h3 class="mt-2 font-display text-2xl font-black uppercase text-white">{{ setCardsLoading ? 'Carregando banco' : 'Ajuste os filtros' }}</h3>
              <p v-if="setCardsMissingTotals" class="mx-auto mt-3 max-w-2xl text-xs font-bold leading-5 text-zinc-400">
                Pendencias atuais em Season {{ wikiSeason }}: {{ setCardsMissingTotals.image }} sets sem imagem,
                {{ setCardsMissingTotals.setOptions }} sem opcoes de set e {{ setCardsMissingTotals.classMap }} sem mapeamento de classe.
              </p>
            </div>
          </div>

          <div v-else-if="isEquipmentCatalogTopic" class="grid gap-5">
            <div class="grid gap-3 rounded-md border border-white/10 bg-black/20 p-[24px]">
              <div class="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h3 class="bm-heading font-display text-2xl font-bold">{{ equipmentCatalogConfig?.title }}</h3>
                  <p class="bm-muted mt-[6px] text-sm leading-6">
                    Dados locais do catalogo Guia MU, com imagens servidas pelo proprio projeto.
                  </p>
                </div>
              </div>

              <div class="grid gap-3 lg:grid-cols-[220px_240px_1fr]">
                <label class="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                  Categoria
                  <select v-model="equipmentCatalogCategoryFilter" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-blood-400/70">
                    <option class="bg-zinc-950 text-white" value="Default">{{ allOptionLabel }}</option>
                    <option v-for="category in equipmentCatalogCategories" :key="category" class="bg-zinc-950 text-white" :value="category">{{ category }}</option>
                  </select>
                </label>

                <label class="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                  Classe
                  <select v-model="equipmentCatalogClassFilter" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-blood-400/70">
                    <option class="bg-zinc-950 text-white" value="Default">{{ allOptionLabel }}</option>
                    <option v-for="className in equipmentCatalogClassOptions" :key="className" class="bg-zinc-950 text-white" :value="className">{{ className }}</option>
                  </select>
                </label>

                <label class="grid gap-1 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">
                  Buscar por nome, classe ou atributo
                  <input
                    v-model="equipmentCatalogSearch"
                    class="h-11 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold normal-case tracking-normal text-white outline-none transition placeholder:text-white/45 focus:border-blood-400/70"
                    placeholder="Digite o nome do equipamento"
                    type="search"
                  >
                </label>
              </div>
            </div>

            <div class="overflow-hidden rounded-md border border-white/10 bg-black/20">
              <div class="grid grid-cols-[52px_1fr_96px] gap-3 border-b border-white/10 bg-white/[0.035] px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-400 md:grid-cols-[52px_1fr_0.75fr_1fr_0.8fr_100px]">
                <span>Visual</span>
                <span>Equipamento</span>
                <span class="hidden md:block">Categoria</span>
                <span class="hidden md:block">Quem usa</span>
                <span class="hidden md:block">Status</span>
                <span class="text-right md:text-left">Detalhes</span>
              </div>

              <article
                v-for="item in paginatedEquipmentCatalogItems"
                :key="item.key"
                class="grid grid-cols-[52px_1fr_96px] gap-3 border-b border-white/10 px-4 py-3 last:border-b-0 md:grid-cols-[52px_1fr_0.75fr_1fr_0.8fr_100px]"
              >
                <button
                  class="grid size-11 place-items-center overflow-hidden rounded-md border border-white/10 bg-white/[0.04] transition hover:border-ember/50 hover:bg-ember/10"
                  type="button"
                  @click="openEquipmentItemModal(item)"
                >
                  <img
                    v-if="equipmentCatalogPreviewImage(item)"
                    :src="equipmentCatalogPreviewImage(item)"
                    :alt="`${item.name} preview`"
                    class="max-h-10 max-w-10 object-contain"
                    loading="lazy"
                    decoding="async"
                  >
                  <span v-else class="font-display text-sm font-black text-white/30">{{ item.name.slice(0, 1) }}</span>
                </button>
                <div>
                  <h4 class="font-display text-lg font-bold text-white">{{ item.name }}</h4>
                  <p class="mt-1 text-xs leading-5 text-zinc-400">{{ compactListStats(item) }}</p>
                </div>
                <span class="hidden text-sm font-bold text-zinc-300 md:block">{{ item.category }}</span>
                <span class="hidden text-xs leading-5 text-zinc-400 md:block">{{ usableByText(item) }}</span>
                <span class="hidden text-xs leading-5 text-zinc-400 md:block">{{ equipmentCatalogImageStatus(item) }}</span>
                <button
                  class="rounded-md border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:border-ember/50 hover:bg-ember/15"
                  type="button"
                  @click="openEquipmentItemModal(item)"
                >
                  Ver
                </button>
              </article>
            </div>

            <div
              v-if="filteredEquipmentCatalogItems.length > 0"
              class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-400"
            >
              <span>Pagina {{ equipmentCatalogCurrentPage }} de {{ equipmentCatalogTotalPages }} - {{ filteredEquipmentCatalogItems.length }} itens</span>
              <div class="flex items-center gap-2">
                <button
                  class="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                  type="button"
                  :disabled="equipmentCatalogCurrentPage <= 1"
                  @click="equipmentCatalogCurrentPage--"
                >
                  Anterior
                </button>
                <button
                  class="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                  type="button"
                  :disabled="equipmentCatalogCurrentPage >= equipmentCatalogTotalPages"
                  @click="equipmentCatalogCurrentPage++"
                >
                  Proxima
                </button>
              </div>
            </div>

            <div v-if="filteredEquipmentCatalogItems.length === 0" class="rounded-md border border-dashed border-white/15 bg-white/[0.035] p-8 text-center">
              <p class="bm-kicker">Nada encontrado</p>
              <h3 class="mt-2 font-display text-2xl font-black uppercase text-white">Ajuste os filtros</h3>
            </div>
          </div>

          <div v-else-if="isKnowledgeTopic" class="grid gap-4">
            <div class="rounded-md border border-white/10 bg-black/20 p-[24px]">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p class="bm-kicker">{{ activeKnowledgeTopicConfig?.kicker || activeSection?.title }}</p>
                  <h3 class="bm-heading mt-[6px] font-display text-2xl font-bold">{{ activeTopic?.label || contentTitle }}</h3>
                  <p class="bm-muted mt-[6px] max-w-4xl text-sm leading-6">
                    {{ knowledgeTopicDescription }}
                  </p>
                </div>
                <span class="rounded-md border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-300">
                  {{ knowledgeEntriesTotal }} registros
                </span>
              </div>

              <div class="mt-4 grid gap-3 lg:grid-cols-[1fr_180px]">
                <input
                  v-model="knowledgeSearch"
                  class="h-11 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-bold text-white outline-none placeholder:text-white/45 focus:border-blood-400/70"
                  placeholder="Buscar dentro deste topico"
                  type="search"
                >
                <select v-model="knowledgeScopeFilter" class="h-11 rounded-md border border-white/10 bg-white/10 px-3 text-sm font-bold text-white outline-none focus:border-blood-400/70">
                  <option class="bg-zinc-950 text-white" value="">Todos escopos</option>
                  <option class="bg-zinc-950 text-white" value="SEASON_6">Season 6</option>
                  <option class="bg-zinc-950 text-white" value="NEEDS_REVIEW">Revisar</option>
                </select>
              </div>
            </div>

            <div v-if="knowledgeEntriesLoading" class="rounded-md border border-white/10 bg-black/20 p-8 text-center text-sm font-bold text-zinc-400">
              Carregando dados da API...
            </div>
            <div v-else-if="knowledgeEntriesError" class="rounded-md border border-red-400/30 bg-red-500/10 p-8 text-center text-sm font-bold text-red-100">
              {{ knowledgeEntriesError }}
            </div>
            <div v-else-if="knowledgeEntries.length" class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              <article
                v-for="entry in knowledgeEntries"
                :key="entry.id"
                class="grid gap-3 rounded-md border border-white/10 bg-black/20 p-4"
              >
                <div v-if="entryImage(entry)" class="grid max-h-52 place-items-center overflow-hidden rounded-md border border-white/10 bg-white/[0.035]">
                  <img :src="entryImage(entry)" :alt="entry.title" class="max-h-52 w-full object-contain" loading="lazy" decoding="async">
                </div>
                <div>
                  <div class="flex items-start justify-between gap-3">
                    <p class="bm-kicker">{{ entry.kind }}</p>
                    <span class="rounded-sm bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300">{{ entry.scope }}</span>
                  </div>
                  <h4 class="mt-2 font-display text-xl font-black text-white">{{ entry.title }}</h4>
                  <p class="mt-3 text-sm leading-6 text-zinc-400">{{ entrySummary(entry) }}</p>
                </div>
                <div class="grid gap-1.5">
                  <p
                    v-for="heading in entryHeadings(entry).slice(0, 6)"
                    :key="heading"
                    class="rounded-sm border border-white/10 bg-white/[0.035] px-2 py-1.5 text-xs font-bold leading-5 text-zinc-400"
                  >
                    {{ heading }}
                  </p>
                </div>
                <div class="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs font-bold text-zinc-500">
                  <span>{{ entryStats(entry) }}</span>
                  <NuxtLink v-if="entry.sourceUrl" :to="entry.sourceUrl" target="_blank" class="text-ember transition hover:text-amber-200">
                    Fonte
                  </NuxtLink>
                </div>
              </article>
            </div>
            <div v-else class="rounded-md border border-dashed border-white/15 bg-white/[0.035] p-8 text-center">
              <p class="bm-kicker">Sem registros</p>
              <h3 class="mt-2 font-display text-2xl font-black uppercase text-white">Nada encontrado para este topico</h3>
              <p class="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-400">Ajuste a busca, o escopo ou importe novos dados para a API.</p>
            </div>

            <div v-if="knowledgeEntriesTotalPages > 1" class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">
              <span>Pagina {{ knowledgePage }} de {{ knowledgeEntriesTotalPages }}</span>
              <div class="flex items-center gap-2">
                <button class="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-white disabled:opacity-40" type="button" :disabled="knowledgePage <= 1" @click="knowledgePage--">Anterior</button>
                <button class="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-white disabled:opacity-40" type="button" :disabled="knowledgePage >= knowledgeEntriesTotalPages" @click="knowledgePage++">Proxima</button>
              </div>
            </div>
          </div>

          <div v-else-if="guiamuSourcesForTopic.length" class="grid gap-4">
            <div class="rounded-md border border-white/10 bg-black/20 p-[24px]">
              <p class="bm-kicker">Base externa estruturada</p>
              <h3 class="bm-heading mt-[6px] font-display text-2xl font-bold">{{ activeTopic?.label || contentTitle }}</h3>
              <p class="bm-muted mt-[6px] text-sm leading-6">
                Fontes cadastradas para coleta, normalizacao e revisao antes de publicar no Blood Moon.
                As imagens externas ficam apenas como referencia ate gerarmos ou remasterizarmos assets proprios.
              </p>
            </div>

            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <article
                v-for="source in guiamuSourcesForTopic"
                :key="source.key"
                class="rounded-md border border-white/10 bg-black/20 p-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="bm-kicker">{{ guiamuTopicLabels[source.type] }}</p>
                    <h4 class="mt-2 font-display text-xl font-black text-white">{{ source.title }}</h4>
                  </div>
                  <span class="rounded bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300">
                    {{ guiamuStatusLabels[source.status] }}
                  </span>
                </div>
                <p class="mt-3 text-xs leading-5 text-zinc-400">{{ source.scope }}</p>
                <p class="mt-3 text-xs leading-5 text-zinc-500">{{ source.notes }}</p>
                <NuxtLink
                  :to="source.sourceUrl"
                  class="mt-4 inline-flex rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:border-ember/50 hover:bg-ember/15"
                  target="_blank"
                >
                  Abrir fonte
                </NuxtLink>
              </article>
            </div>
          </div>

          <div v-else class="rounded-md border border-white/10 bg-black/20 p-[24px]">
            <h3 class="bm-heading font-display text-2xl font-bold">{{ activeTopic?.label || contentTitle }}</h3>
            <p class="bm-muted mt-[6px] text-sm leading-6">
              Conteudo modular reservado para este topico. Aqui vamos renderizar tabelas, imagens, formulas,
              equipamentos, mapas, monstros e guias conforme a wiki for sendo detalhada.
            </p>
            <NuxtLink
              v-if="!activeTopic.disabled"
              :to="`/guias/${activeSectionKey}/${activeTopic.key}`"
              class="bm-button-glass mt-5 inline-flex rounded-md px-4 py-3 text-sm font-black"
            >
              Abrir pagina detalhada
            </NuxtLink>
          </div>
        </div>
        </template>
      </section>
    </section>

    <Teleport to="body">
      <div
        v-if="selectedSet"
        class="bm-density-compact fixed inset-0 z-50 grid place-items-center bg-black/80 p-3 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
      >
        <div class="relative max-h-[92vh] w-full max-w-[1680px] overflow-auto rounded-md border border-white/15 bg-[#101114] p-2.5 shadow-2xl sm:p-3 2xl:p-4">
          <div class="mb-2 flex justify-end">
            <button
              class="rounded-md border border-white/15 bg-white/[0.06] p-2 text-white transition hover:border-blood-400/60 hover:bg-blood-500/15"
              type="button"
              aria-label="Fechar modal"
              @click="closeSetModal"
            >
              <X class="size-4" />
            </button>
          </div>

          <div class="grid items-stretch gap-2.5 xl:grid-cols-3 2xl:gap-3">
            <section class="rounded-md border border-white/10 bg-black/28 p-3">
              <div class="flex min-h-12 items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="bm-kicker">Set completo</p>
                  <h3 class="bm-heading mt-1.5 font-display text-2xl font-black leading-tight">{{ selectedSet.name }}</h3>
                </div>
                <div v-if="selectedSet.characterChibis?.length" class="flex shrink-0 flex-wrap justify-end gap-1.5">
                  <EquipmentCharacterChibi
                    v-for="character in selectedSet.characterChibis"
                    :key="character.name"
                    :name="character.name"
                    :image="character.image"
                    size="md"
                  />
                </div>
              </div>

              <div class="mt-3 grid min-h-[270px] place-items-center rounded-md border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/30 p-3">
                <img
                  v-if="selectedSetFullImage"
                  :alt="`${selectedSet.name} completo`"
                  class="max-h-[250px] max-w-full rounded-sm object-contain"
                  loading="lazy"
                  decoding="async"
                  :src="selectedSetFullImage"
                >
                <div v-else class="text-center">
                  <p class="font-display text-3xl font-black text-white/18">{{ selectedSet.name }}</p>
                  <p class="mt-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-zinc-500">Imagem do personagem pendente</p>
                </div>
              </div>
            </section>

            <section class="rounded-md border border-white/10 bg-black/28 p-3">
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="quality in selectedAvailableQualities"
                  :key="quality"
                  class="rounded-md border px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.16em]"
                  :class="qualityButtonClass(quality)"
                  type="button"
                  @click="setQuality = quality"
                >
                  {{ equipmentQualityLabels[quality] }}
                </button>
              </div>

              <div class="mt-4">
                <p class="bm-kicker">Descricao e refinamento</p>
                <h4 class="mt-1.5 font-display text-xl font-black text-white">Defesa total: {{ selectedSetDefense.total }}</h4>
              </div>

              <label class="mt-4 grid gap-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-zinc-400">
                Blessing / refinamento +{{ blessingLevel }}
                <input v-model.number="blessingLevel" min="0" max="15" step="1" type="range" class="accent-amber-400">
              </label>

              <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div class="rounded-md border border-white/10 bg-white/[0.04] p-2.5">
                  <span class="block text-[0.68rem] font-black uppercase tracking-[0.14em] text-zinc-500">Base</span>
                  <strong class="mt-0.5 block font-display text-xl text-white">{{ selectedSetDefense.base }}</strong>
                </div>
                <div class="rounded-md border border-white/10 bg-white/[0.04] p-2.5">
                  <span class="block text-[0.68rem] font-black uppercase tracking-[0.14em] text-zinc-500">Bonus</span>
                  <strong class="mt-0.5 block font-display text-xl text-ember">+{{ selectedSetDefense.bonus }}</strong>
                </div>
              </div>

            </section>

            <section class="rounded-md border border-white/10 bg-black/28 p-3">
              <p class="bm-kicker">Possiveis opcoes do equipamento</p>
              <h3 class="mt-1.5 font-display text-xl font-black text-white">Caracteristicas disponiveis</h3>

              <div class="mt-4 grid gap-1.5">
                <p
                  v-for="option in selectedEquipmentOptionRows"
                  :key="option.key"
                  class="rounded-md border px-2.5 py-1.5 text-[0.72rem] font-bold leading-4"
                  :class="optionClass(option)"
                >
                  {{ option.label }}
                </p>

                <div
                  v-if="selectedAncientSetDisplayRows.length"
                  class="mt-2 rounded-md border border-amber-300/20 bg-black/25 px-3 py-3 text-center"
                >
                  <p class="text-[0.7rem] font-black text-amber-300">Set Item Equipment Information</p>
                  <p class="mt-2 text-xs font-black text-lime-400">{{ selectedAncientSetTitle }}</p>
                  <div v-if="selectedAncientSetPieceNames.length" class="mt-1.5 grid gap-0.5">
                    <p
                      v-for="pieceName in selectedAncientSetPieceNames"
                      :key="pieceName"
                      class="text-[0.72rem] font-bold text-lime-400"
                    >
                      {{ pieceName }}
                    </p>
                  </div>
                  <div class="mt-2 grid gap-0.5">
                    <p
                      v-for="row in selectedAncientSetDisplayRows"
                      :key="row.key"
                      class="text-[0.72rem] font-bold leading-4 text-sky-300"
                    >
                      {{ row.label }}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section class="rounded-md border border-white/10 bg-black/28 p-3 xl:col-span-3">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p class="bm-kicker">Equipamentos do set</p>
                  <h3 class="mt-1.5 font-display text-xl font-black text-white">Pecas equipadas</h3>
                </div>
                <span class="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.14em] text-zinc-300">
                  {{ equipmentQualityLabels[setQuality] }}
                </span>
              </div>

              <div class="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-2">
                <EquipmentPieceTooltip
                  v-for="piece in selectedSetPiecesWithData"
                  :key="piece.key"
                  :piece="piece"
                  :quality="setQuality"
                />
              </div>
            </section>
          </div>
        </div>
      </div>

      <div
        v-if="selectedEquipmentDisplayItem"
        class="bm-density-compact fixed inset-0 z-50 grid place-items-center bg-black/80 p-3 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
      >
        <div class="relative max-h-[92vh] w-full max-w-[1180px] overflow-auto rounded-md border border-white/15 bg-[#101114] p-4 shadow-2xl sm:p-5">
          <div class="mb-4 flex justify-end">
            <button
              class="rounded-md border border-white/15 bg-white/[0.06] p-3 text-white transition hover:border-blood-400/60 hover:bg-blood-500/15"
              type="button"
              aria-label="Fechar modal"
              @click="closeEquipmentItemModal"
            >
              <X class="size-5" />
            </button>
          </div>

          <div class="grid gap-4 lg:grid-cols-[320px_1fr]">
            <section class="rounded-md border border-white/10 bg-black/28 p-4">
              <p class="bm-kicker">{{ selectedEquipmentDisplayItem.category }}</p>
              <h3 class="bm-heading mt-2 font-display text-3xl font-black">{{ selectedEquipmentDisplayItem.name }}</h3>
              <p class="mt-2 text-sm font-bold text-zinc-400">{{ usableByText(selectedEquipmentDisplayItem) }}</p>

              <div class="mt-5 grid min-h-[300px] place-items-center rounded-md border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/30 p-4">
                <img
                  v-if="equipmentCatalogPreviewImage(selectedEquipmentDisplayItem)"
                  :alt="selectedEquipmentDisplayItem.name"
                  class="max-h-[260px] max-w-full rounded-sm object-contain"
                  loading="lazy"
                  decoding="async"
                  :src="equipmentCatalogPreviewImage(selectedEquipmentDisplayItem)"
                >
                <div v-else class="text-center">
                  <p class="font-display text-4xl font-black text-white/18">{{ selectedEquipmentDisplayItem.name }}</p>
                  <p class="mt-3 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Miniatura pendente</p>
                </div>
              </div>
            </section>

            <section class="grid gap-4">
              <div class="rounded-md border border-white/10 bg-black/28 p-4">
                <p class="bm-kicker">Caracteristicas</p>
                <h4 class="mt-2 font-display text-2xl font-black text-white">Dados do equipamento</h4>
                <div class="mt-4 flex flex-wrap gap-2">
                  <button
                    v-for="quality in selectedEquipmentAvailableQualities"
                    :key="quality"
                    class="rounded-md border px-4 py-2 text-xs font-black uppercase tracking-[0.14em] transition"
                    :class="equipmentQualityButtonClass(quality)"
                    type="button"
                    @click="selectedEquipmentQuality = quality"
                  >
                    {{ equipmentQualityLabels[quality] }}
                  </button>
                </div>
                <div class="mt-4 rounded-md border border-white/10 bg-white/[0.035] p-3">
                  <label class="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">
                    Blessing / refinamento +{{ selectedEquipmentBlessingLevel }}
                    <input v-model.number="selectedEquipmentBlessingLevel" min="0" max="15" step="1" type="range" class="mt-2 w-full accent-amber-400">
                  </label>
                </div>
                <dl class="mt-4 grid gap-2 md:grid-cols-2">
                  <div
                    v-for="row in selectedEquipmentStatRows"
                    :key="row.label"
                    class="flex justify-between gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs leading-5"
                  >
                    <dt class="text-zinc-500">{{ row.label }}</dt>
                    <dd class="text-right font-bold text-zinc-100">{{ row.value }}</dd>
                  </div>
                </dl>
              </div>

              <div class="rounded-md border border-white/10 bg-black/28 p-4">
                <p class="bm-kicker">Possiveis opcoes do equipamento</p>
                <div class="mt-4 grid gap-2 md:grid-cols-2">
                  <p
                    v-for="option in selectedCatalogEquipmentOptionRows"
                    :key="option.key"
                    class="rounded-md border px-3 py-2 text-xs font-bold leading-5"
                    :class="optionClass(option)"
                  >
                    {{ option.label }}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  BookOpen,
  Boxes,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Crosshair,
  Database,
  Diamond,
  FileText,
  Gem,
  Map,
  NotebookTabs,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Search,
  Shield,
  Sparkles,
  Settings,
  Swords,
  TrendingUp,
  UserRound,
  UsersRound,
  WandSparkles,
  X
} from 'lucide-vue-next'
import {
  baseLuckAndAdditionalOptions,
  equipmentQualityLabels,
  excellentDefenseOptions,
  luckySetOptions,
  masteryAncientOptions,
  socketSeedSphereOptions,
  type EquipmentOptionRule,
  type EquipmentQualityKey
} from '~/data/equipmentOptionRules'
import { getGuiamuSourcesForTopic, guiamuStatusLabels, guiamuTopicLabels } from '~/data/guiamuReferences'
import type { GuideEquipmentItem, GuideEquipmentSummary } from '~/data/guiamuonlineItems'
import { permissions } from '~/data/security'

useSeoMeta({ title: 'Wiki' })

type WikiCategory = { title: string, description: string, links: string[] }
type WikiTopic = { key: string, label: string, disabled: boolean }
type WikiSection = WikiCategory & { key: string, topics: WikiTopic[] }
type WikiCharacterClass = {
  key: string
  name: string
  tier: number
  minSeason: number
  isSeasonSixBase: boolean
}
type WikiCharacterRecord = {
  key: string
  name: string
  sortOrder: number
  minSeason: number
  isSeasonSixBase: boolean
  classes: WikiCharacterClass[]
}
type WikiEntryAsset = {
  asset: {
    sourceUrl?: string | null
    localPath?: string | null
    publicPath?: string | null
    mimeType?: string | null
  }
}
type WikiKnowledgeEntry = {
  id: string
  sourceKey?: string | null
  sourceUrl?: string | null
  slug: string
  title: string
  kind: string
  scope: string
  status: string
  seasonMin?: number | null
  seasonMax?: number | null
  summary?: string | null
  rawData?: Record<string, unknown> | null
  normalizedData?: Record<string, unknown> | null
  assets?: WikiEntryAsset[]
}
type KnowledgeTopicConfig = {
  kicker: string
  kind?: string
  search?: string
  description: string
}
type SetPieceCard = {
  key: string
  label: string
  title: string
  image?: string
}
type SetCharacterChibi = {
  name: string
  image: string
}
type SetCard = {
  key: string
  name: string
  guideName: string
  setTypes: string[]
  availableQualities: EquipmentQualityKey[]
  characterName: string
  evolutions: string[]
  baseClasses?: string[]
  characterChibis?: SetCharacterChibi[]
  targetClasses?: string[]
  requiredClassTier: number
  targetClassTier: number
  minSeason: number
  tier: number
  tierLabel: string
  status: string
  compatibility: string
  pieces: string[]
  pieceCards: SetPieceCard[]
  fullSetImage?: string
  dbSetOptions?: string[]
  missingReferences?: {
    image: boolean
    setOptions: boolean
    classMap: boolean
    pieceImages: string[]
  }
  searchText: string
}
type AncientSetReference = {
  name: string
  classes?: string[]
  baseSetDefense?: number
  setOptions?: { pieces: number | string, option: string }[]
  pieces?: { name: string, defense?: number, requirements?: Record<string, number> }[]
}
type WikiPaginatedResponse<T> = {
  data: T[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
type SetMissingTotals = {
  image: number
  setOptions: number
  classMap: number
  pieceImages: number
}
type FullSetImage = {
  key: string
  title: string
  fileName: string
  publicPath: string
}
type GuideItemsModule = typeof import('~/data/guiamuonlineItems')
type MuEquipmentModule = typeof import('~/data/muEquipmentCatalog')

const { dictionary, locale } = useLocale()
const { hasPermission, loadSession } = useAuth()
const wikiApi = useWikiApi()
const isWikiAdmin = computed(() => hasPermission(permissions.adminDashboardView))
const seasonOptions = [6]
const wikiSeason = ref(6)
const isWikiSeasonOpen = ref(false)
const availableWikiSeasons = computed(() => seasonOptions)
const wikiSeasonNotice = computed(() => 'A Wiki exibe apenas o escopo oficial Season 6 do servidor.')
const selectWikiSeason = (season: number) => {
  wikiSeason.value = season
  isWikiSeasonOpen.value = false
}
const setCharacterFilter = ref('Default')
const setEvolutionFilter = ref('Default')
const setEquipmentFilter = ref('Default')
const setTypeFilter = ref('Default')
const setNameSearch = ref('')
const setCurrentPage = ref(1)
const setPageSize = 20
const equipmentCatalogCategoryFilter = ref('Default')
const equipmentCatalogClassFilter = ref('Default')
const equipmentCatalogSearch = ref('')
const equipmentCatalogCurrentPage = ref(1)
const equipmentCatalogPageSize = 24
const selectedEquipmentItem = ref<GuideEquipmentItem | null>(null)
const selectedEquipmentSummary = ref<GuideEquipmentSummary | null>(null)
const selectedEquipmentLoadId = ref(0)
const selectedEquipmentQuality = ref<EquipmentQualityKey>('normal')
const selectedEquipmentBlessingLevel = ref(0)
const selectedSet = ref<SetCard | null>(null)
const selectedGuideSetItems = ref<GuideEquipmentItem[]>([])
const selectedAncientSetItem = ref<GuideEquipmentItem | null>(null)
const selectedGuideLoadId = ref(0)
const setQuality = ref<EquipmentQualityKey>('normal')
const blessingLevel = ref(0)
const apiSetCards = ref<SetCard[]>([])
const setCardsLoading = ref(false)
const setCardsError = ref('')
const setCardsMissingTotals = ref<SetMissingTotals | null>(null)
const wikiCharacters = ref<WikiCharacterRecord[]>([])
const wikiCharactersLoading = ref(false)
const characterKnowledgeEntries = ref<WikiKnowledgeEntry[]>([])
const knowledgeEntries = ref<WikiKnowledgeEntry[]>([])
const knowledgeEntriesLoading = ref(false)
const knowledgeEntriesError = ref('')
const knowledgeEntriesTotal = ref(0)
const knowledgeEntriesTotalPages = ref(1)
const knowledgePage = ref(1)
const knowledgeSearch = ref('')
const knowledgeScopeFilter = ref('')
const guiamuonlineArmorItems = shallowRef<GuideEquipmentSummary[]>([])
const muEquipmentIndex = shallowRef<GuideEquipmentSummary[]>([])
const fullSetImageLibrary = shallowRef<FullSetImage[]>([])
const ancientSetReferences = shallowRef<AncientSetReference[]>([])
let guideItemsModulePromise: Promise<GuideItemsModule> | null = null
let muEquipmentModulePromise: Promise<MuEquipmentModule> | null = null
let wikiStaticDataPromise: Promise<void> | null = null

const loadGuideItemsModule = () => {
  guideItemsModulePromise ||= import('~/data/guiamuonlineItems')
  return guideItemsModulePromise
}

const loadMuEquipmentModule = () => {
  muEquipmentModulePromise ||= import('~/data/muEquipmentCatalog')
  return muEquipmentModulePromise
}

const ensureWikiStaticData = async () => {
  wikiStaticDataPromise ||= Promise.all([
    loadGuideItemsModule(),
    loadMuEquipmentModule(),
    import('~/data/muFullSetImages.generated.json'),
    import('../../../references/game-data/muonlinefanz-ancient-items-data.json')
  ]).then(([guideItems, muEquipment, fullSetImagesModule, ancientItemsModule]) => {
    guiamuonlineArmorItems.value = guideItems.guiamuonlineArmorItems
    muEquipmentIndex.value = muEquipment.muEquipmentIndex
    fullSetImageLibrary.value = fullSetImagesModule.default as FullSetImage[]
    ancientSetReferences.value = ((ancientItemsModule.default as { sampleSetsCapturedFromPage?: AncientSetReference[] }).sampleSetsCapturedFromPage || [])
  })

  await wikiStaticDataPromise
}

const loadGuideSetItems = async (name: string) => {
  const module = await loadGuideItemsModule()
  return module.loadGuideSetItems(name)
}

const findMuEquipmentItem = async (category: string, name: string) => {
  const module = await loadMuEquipmentModule()
  return module.findMuEquipmentItem(category, name)
}

const setPieceNames = ['Armor', 'Boots', 'Gloves', 'Helm', 'Pants', 'Set']
const setVariantNames = ['ATK', 'ENE']
const setModalPieces = [
  {
    key: 'helm',
    label: 'Helm',
    guideCategory: 'Helm',
    aliases: ['Helm']
  },
  {
    key: 'armor',
    label: 'Armor',
    guideCategory: 'Armor',
    aliases: ['Armor']
  },
  {
    key: 'pants',
    label: 'Pants',
    guideCategory: 'Pants',
    aliases: ['Pants']
  },
  {
    key: 'gloves',
    label: 'Gloves',
    guideCategory: 'Gloves',
    aliases: ['Gloves']
  },
  {
    key: 'boots',
    label: 'Boots',
    guideCategory: 'Boots',
    aliases: ['Boots']
  }
]
const characterEvolutionMap: Record<string, string[]> = {
  'Dark Knight': ['Dark Knight', 'Blade Knight', 'Blade Master'],
  'Dark Wizard': ['Dark Wizard', 'Soul Master', 'Grand Master'],
  'Fairy Elf': ['Fairy Elf', 'Muse Elf', 'High Elf'],
  Summoner: ['Summoner', 'Bloody Summoner', 'Dimension Master'],
  'Magic Gladiator': ['Magic Gladiator', 'Duel Master'],
  'Dark Lord': ['Dark Lord', 'Lord Emperor'],
  'Rage Fighter': ['Rage Fighter', 'Fist Master']
}
const characterOrder = Object.keys(characterEvolutionMap)
const playableClassNames = Array.from(new Set(Object.values(characterEvolutionMap).flat()))
const playableClassSet = new Set(playableClassNames)
const baseClassFor = (className: string) =>
  characterOrder.find((character) => character === className || characterEvolutionMap[character]?.includes(className)) || ''
const classTier = (className: string) => {
  const baseClass = baseClassFor(className)
  const evolutions = characterEvolutionMap[baseClass] || []
  const index = evolutions.indexOf(className)

  return index === -1 ? 1 : index + 1
}
const sanitizeClassList = (classes: string[]) =>
  Array.from(new Set(classes.filter((className) => playableClassSet.has(className))))
const canUseClass = (usableClasses: string[], selectedClass: string) => {
  if (selectedClass === 'Default') {
    return true
  }

  const cleanClasses = sanitizeClassList(usableClasses)
  const selectedBaseClass = baseClassFor(selectedClass)

  return cleanClasses.some((className) =>
    className === selectedClass ||
    className === selectedBaseClass ||
    baseClassFor(className) === selectedClass
  )
}
const classesAvailableFromTier = (classes: string[], requiredTier = 1) => {
  const bases = Array.from(new Set(sanitizeClassList(classes).map(baseClassFor).filter(Boolean)))

  return bases.flatMap((baseClass) => (characterEvolutionMap[baseClass] || [baseClass]).slice(Math.max(0, requiredTier - 1)))
}
const canAccessRequiredTier = (classes: string[], selectedClass: string, requiredTier = 1) => {
  if (selectedClass === 'Default') {
    return true
  }

  const selectedBaseClass = baseClassFor(selectedClass)

  return classesAvailableFromTier(classes, requiredTier).some((className) =>
    baseClassFor(className) === selectedBaseClass && classTier(selectedClass) >= classTier(className)
  )
}
const primaryCharacterForClasses = (classes: string[]) => {
  const cleanClasses = sanitizeClassList(classes)
  const baseClasses = cleanClasses.map((className) => baseClassFor(className)).filter(Boolean)
  const sortedBaseClasses = Array.from(new Set(baseClasses))
    .sort((a, b) => characterOrder.indexOf(a) - characterOrder.indexOf(b))

  return sortedBaseClasses[0] || 'Sem classe definida'
}
const allOptionLabel = computed(() => {
  if (locale.value.startsWith('en')) {
    return 'All'
  }

  return 'Todos'
})
const setPowerOrder = [
  'Leather',
  'Bronze',
  'Scale',
  'Brass',
  'Plate',
  'Dragon',
  'Black Dragon',
  'Dark Phoenix',
  'Great Dragon',
  'Ashcrow',
  'Pad',
  'Bone',
  'Sphinx',
  'Legendary',
  'Grand Soul',
  'Dark Soul',
  'Venom Mist',
  'Eclipse',
  'Vine',
  'Silk',
  'Wind',
  'Spirit',
  'Guardian',
  'Iris',
  'Holy Spirit',
  'Divine',
  'Red Spirit',
  'Storm Crow',
  'Thunder Hawk',
  'Hurricane',
  'Volcano',
  'Valiant',
  'Light Plate',
  'Adamantine',
  'Dark Steel',
  'Dark Master',
  'Sunlight',
  'Bloodangel',
  'Darkangel',
  'Holyangel',
  'Soul',
  'Blue Eye',
  'Manticore',
  'Silver Heart',
  'Brilliant'
]

const wikiCategories = computed(() => dictionary.value.guideCategories)
const openSections = ref<string[]>([])
const activeSectionKey = ref('')
const wikiSearch = ref('')
const popularTopics = [
  { label: 'Fairy Elf', section: 'personagens', key: 'fairy-elf' },
  { label: 'Sets', section: 'equipamentos', key: 'sets' },
  { label: 'Mapas', section: 'mapas-pvm', key: 'mapas' },
  { label: 'Eventos', section: 'eventos', key: 'eventos' }
]
const activeTopicKey = ref('')
const isWikiAsideCollapsed = ref(false)
const activeFairyElfStyleIndex = ref(0)
let fairyElfStyleTimer: ReturnType<typeof setInterval> | null = null

const toggleWikiAside = () => {
  isWikiAsideCollapsed.value = !isWikiAsideCollapsed.value
}

const wikiSectionIconMap = {
  personagens: UserRound,
  equipamentos: Shield,
  formulas: ScrollText,
  builds: Swords,
  'chaos-machine': Sparkles,
  monstros: Crosshair,
  'mapas-e-pvm': Map,
  eventos: CalendarDays,
  'quests-e-npcs': NotebookTabs,
  tutoriais: BookOpen
}
const wikiSectionIcon = (sectionKey: string) =>
  wikiSectionIconMap[sectionKey as keyof typeof wikiSectionIconMap] || BookOpen

const characterAnchorLinks = [
  { id: 'personagem-visao', label: 'Visao geral', icon: UserRound },
  { id: 'personagem-status', label: 'Status', icon: Shield },
  { id: 'personagem-identidade', label: 'Identidade', icon: BookOpen },
  { id: 'personagem-estilo', label: 'Estilo de jogo', icon: Crosshair },
  { id: 'personagem-evolucao', label: 'Evolucao', icon: Sparkles },
  { id: 'personagem-builds', label: 'Builds', icon: Swords },
  { id: 'personagem-skills', label: 'Skills', icon: WandSparkles },
  { id: 'personagem-equipamentos', label: 'Equipamentos', icon: Boxes },
  { id: 'personagem-referencias', label: 'Referencias', icon: Database }
]

const fairyElfProfile = {
  summary: [
    { label: 'Funcao', value: 'Atiradora / Suporte' },
    { label: 'Alcance', value: 'Longo' },
    { label: 'Dificuldade', value: 'Media' },
    { label: 'Leitura', value: 'Requer posicionamento' }
  ],
  baseStats: [
    { label: 'STR', value: 22 },
    { label: 'AGI', value: 25 },
    { label: 'VIT', value: 20 },
    { label: 'ENE', value: 15 },
    { label: 'CMD', value: 0 }
  ],
  bars: [
    { label: 'Dificuldade', value: 5 },
    { label: 'Dano', value: 7 },
    { label: 'Vida', value: 4 },
    { label: 'Resistencia PvP', value: 5 },
    { label: 'Resistencia PvE', value: 6 },
    { label: 'Importancia', value: 9 },
    { label: 'Mobilidade', value: 8 },
    { label: 'Suporte', value: 9 }
  ],
  traits: ['Distancia', 'Buffs', 'Sustain', 'Mobilidade'],
  styles: [
    {
      title: 'Distancia',
      image: '/dev-references/visual/elfa-pose-arqueira-agachada.png',
      description: 'Joga pelas bordas do combate, mantendo angulo seguro para punir inimigos antes que encostem.'
    },
    {
      title: 'Buffs',
      image: '/dev-references/visual/elfa-aileen-bow-referencia.png',
      description: 'Fortalece a party com Greater Defense e Greater Damage, aumentando a margem de erro do grupo.'
    },
    {
      title: 'Sustain',
      image: '/dev-references/visual/elfa-asa-lv3-ingame.png',
      description: 'Mantem aliados vivos em hunts longas, bosses e eventos onde controle de recursos decide a luta.'
    },
    {
      title: 'Mobilidade',
      image: '/dev-references/visual/elfa-hero-aprovada-asa-voo.png',
      description: 'Recompensa reposicionamento constante, leitura de terreno e dominio da distancia ideal.'
    }
  ],
  sections: [
    {
      anchor: 'personagem-evolucao',
      kicker: 'Evolucao',
      title: 'Linha de classes',
      description: 'Base de progressao por temporada e evolucao da personagem.',
      items: ['Fairy Elf', 'Muse Elf', 'High Elf', 'Noble Elf - high-version futuro']
    },
    {
      anchor: 'personagem-builds',
      kicker: 'Builds',
      title: 'Linhas de jogo',
      description: 'Rotas principais para organizar os guias e equipamentos.',
      items: [
        'Agility Elf: dano fisico a distancia, attack speed e defesa.',
        'Energy Elf: cura, Greater Defense, Greater Damage e suporte de party.',
        'Hibrida: equilibrio entre dano e suporte, pendente de validacao no servidor.'
      ]
    },
    {
      anchor: 'personagem-skills',
      kicker: 'Skills',
      title: 'Catalogo principal',
      description: 'Skills classicas que precisam aparecer no perfil da personagem.',
      items: [
        'Triple Shot',
        'Heal',
        'Greater Defense',
        'Greater Damage',
        'Penetration',
        'Ice Arrow',
        'Infinity Arrow',
        'Summons'
      ]
    },
    {
      anchor: 'personagem-equipamentos',
      kicker: 'Equipamentos',
      title: 'Progressao visual',
      description: 'Familias iniciais para cruzar com Sets, armas, asas e referencias.',
      items: [
        'Sets: Vine, Silk, Wind, Spirit, Guardian, Iris, Holy Spirit, Divine e Red Spirit.',
        'Armas: bows, crossbows, arrows, bolts e quivers.',
        'Asas: Wings of Elf, Wings of Spirit, Wings of Life e Wing of Illusion para high-version.'
      ]
    }
  ]
}

const activeFairyElfStyle = computed(() =>
  fairyElfProfile.styles[activeFairyElfStyleIndex.value % fairyElfProfile.styles.length] || fairyElfProfile.styles[0]
)

const radarPoint = (index: number, value: number, maxValue: number) => {
  const center = 110
  const radius = 92
  const angle = -Math.PI / 2 + index * ((Math.PI * 2) / 5)
  const normalizedValue = Math.max(0, Math.min(value / maxValue, 1))
  const distance = radius * normalizedValue

  return {
    x: Number((center + Math.cos(angle) * distance).toFixed(2)),
    y: Number((center + Math.sin(angle) * distance).toFixed(2))
  }
}

const radarLabel = (index: number, label: string) => {
  const center = 110
  const radius = 104
  const angle = -Math.PI / 2 + index * ((Math.PI * 2) / 5)

  return {
    label,
    x: Number((center + Math.cos(angle) * radius).toFixed(2)),
    y: Number((center + Math.sin(angle) * radius + 4).toFixed(2))
  }
}

const fairyElfRadarMax = computed(() =>
  Math.max(...fairyElfProfile.baseStats.map((stat) => stat.value), 1)
)
const fairyElfRadarDots = computed(() =>
  fairyElfProfile.baseStats.map((stat, index) => ({
    label: stat.label,
    ...radarPoint(index, stat.value, fairyElfRadarMax.value)
  }))
)
const fairyElfRadarPoints = computed(() =>
  fairyElfRadarDots.value.map((point) => `${point.x},${point.y}`).join(' ')
)
const fairyElfRadarLabels = computed(() =>
  fairyElfProfile.baseStats.map((stat, index) => radarLabel(index, stat.label))
)

const tutorialSection: WikiCategory = {
  title: 'Tutoriais',
  description: 'Guias separados por topicos para uso, progressao, itens e sistemas do servidor.',
  links: ['Primeiros passos', 'Como jogar', 'Itens Excellent', 'Itens Ancient', 'Itens Socket', 'Archangel', 'Chaos Machine', 'Comercio e loja pessoal']
}

const navigationSections = computed<WikiSection[]>(() =>
  [...wikiCategories.value, tutorialSection].map((category) => ({
    ...category,
    key: slugify(category.title),
    topics: linksForCategory(category)
  }))
)

const wikiLandingCategories = computed(() => {
  const sectionByTitle = (title: string, fallback: string) =>
    navigationSections.value.find((section) => slugify(section.title).includes(title))?.key || fallback

  return [
    { key: sectionByTitle('personagens', 'personagens'), title: 'Personagens', description: 'Classes, evoluções e estilos de jogo.', icon: 'characters' },
    { key: sectionByTitle('equipamentos', 'equipamentos'), title: 'Itens', description: 'Sets, armas, asas e acessórios.', icon: 'items' },
    { key: sectionByTitle('mapas', 'mapas-e-pvm'), title: 'Mapas', description: 'Mundos, spots, monstros e chefes.', icon: 'maps' },
    { key: sectionByTitle('builds', 'builds'), title: 'Progresso', description: 'Builds, evolução e rotas de avanço.', icon: 'progress' },
    { key: sectionByTitle('chaos-machine', 'chaos-machine'), title: 'Sistemas', description: 'Combinações e sistemas do servidor.', icon: 'systems' },
    { key: sectionByTitle('tutoriais', 'tutoriais'), title: 'Guias', description: 'Tutoriais para começar e evoluir.', icon: 'book' }
  ]
})

const wikiFeaturedTopics = [
  { label: 'Asas', section: 'equipamentos', key: 'asas-e-capas', icon: Sparkles },
  { label: 'Itens Excellent', section: 'tutoriais', key: 'itens-excellent', icon: Gem },
  { label: 'Castle Siege', section: 'eventos', key: 'castle-siege', icon: Shield },
  { label: 'Chaos Machine', section: 'chaos-machine', key: 'chaos-weapon-mix', icon: Settings },
  { label: 'Guia de lugares', section: 'mapas-e-pvm', key: 'mapas', icon: Map },
  { label: 'Pets', section: 'equipamentos', key: 'pets-e-mounts', icon: Boxes }
]
const wikiRecentUpdates = [
  { title: 'Atualização de conteúdo e equipamentos', date: '31 jul. 2026' },
  { title: 'Novos filtros para a biblioteca', date: '30 jul. 2026' },
  { title: 'Mapas, monstros e bosses revisados', date: '29 jul. 2026' },
  { title: 'Guias de personagens organizados', date: '28 jul. 2026' },
  { title: 'Itens da Season 6 consolidados', date: '27 jul. 2026' }
]

const activeSection = computed(() =>
  navigationSections.value.find((section) => section.key === activeSectionKey.value)
)

const activeTopics = computed(() => activeSection.value?.topics || [])
const activeTopic = computed(() => activeTopics.value.find((topic) => topic.key === activeTopicKey.value))
const isCharactersSection = computed(() => activeSectionKey.value === 'personagens')
const isFairyElfTopic = computed(() => activeSectionKey.value === 'personagens' && activeTopicKey.value === 'fairy-elf')
const isSetsTopic = computed(() => activeSectionKey.value === 'equipamentos' && activeTopicKey.value === 'sets')
const isEquipmentLanding = computed(() => activeSectionKey.value === 'equipamentos' && !activeTopicKey.value)
const equipmentTutorialCards = [
  {
    kicker: 'Sets e armaduras',
    title: 'Normal, Excellent, Ancient, Socket, Lucky e Mastery ficam juntos em Sets',
    description: 'O tipo muda as opcoes, origem e progressao, mas o item continua sendo uma armadura ou set. Por isso a wiki mostra essas variacoes no mesmo catalogo de Sets, com filtro por tipo.'
  },
  {
    kicker: 'Normal e excellent',
    title: 'A maioria dos itens normais tambem pode existir como Excellent',
    description: 'Leather, Bloodangel e muitas outras familias podem aparecer em versao normal e excellent. A versao Excellent adiciona linhas verdes possiveis, alem de Luck e Additional quando aplicavel.'
  },
  {
    kicker: 'Ancient',
    title: 'Ancient e uma versao especial do set',
    description: 'Itens Ancient usam pecas especificas e bonus por quantidade equipada. Alguns vêm de bosses como Kundun em Kalima ou eventos especificos, variando conforme a versao do servidor.'
  },
  {
    kicker: 'Socket',
    title: 'Socket nao e apenas um item 380 com adicional',
    description: 'Sets Socket usam Seed Sphere e combinacoes proprias. Mesmo quando estao na faixa 380, eles nao seguem a mesma regra do Jewel of Guardian usada por itens 380 comuns.'
  },
  {
    kicker: 'Mastery e Ruud',
    title: 'Bloodangel e familias modernas possuem progressao propria',
    description: 'Familias como Bloodangel, Darkangel, Holyangel, Soul, Blue Eye e superiores podem ter obtencao e upgrades ligados a Ruud, NPCs e sistemas modernos, alem de circularem via trade entre jogadores.'
  },
  {
    kicker: 'Outros equipamentos',
    title: 'Armas, escudos, asas, capas, acessorios, pets e jewels ficam separados',
    description: 'Esses itens têm regras, slots e usos diferentes das armaduras. Por isso ficam em topicos proprios dentro de Equipamentos, mantendo Sets como a casa das armaduras.'
  }
]
const weaponAndShieldCategories = ['Axe', 'Mace', 'Bow', 'Spear', 'Sword', 'Staff', 'Stick', 'Scepter', 'Lance', 'Rune Mace', 'Short Sword', 'Quiver', 'Claw', 'Magic Gun', 'Shield']
const armorPieceCategories = ['Armor', 'Pants', 'Helm', 'Boots', 'Gloves']
const ancientEquipmentCategories = ['Ancient Normal', 'Set Lucky']
const masteryAncientCategories = ['Bloodangel Ancient', 'Darkangel Ancient', 'Holyangel Ancient', 'Soul Ancient', 'Blue Eye Ancient', 'Manticore Ancient', 'Silver Heart Ancient', 'Brilliant Ancient', 'Apocalypse Ancient', 'Primordial Ancient']
const socketSetNames = ['Titan', 'Brave', 'Hades', 'Seraphim', 'Phantom', 'Destroy', 'Crimson', 'Eternal', 'Queen']
const masteryAncientSetNames = ['Bloodangel', 'Darkangel', 'Holyangel', 'Blue Eye', 'Manticore', 'Silver Heart', 'Brilliant', 'Apocalypse', 'Primordial']
const equipmentCatalogTopicConfigs: Record<string, { title: string, categories: string[], filter?: (item: GuideEquipmentSummary) => boolean }> = {
  armas: {
    title: 'Catalogo de armas e escudos',
    categories: weaponAndShieldCategories
  },
  'armas-e-escudos': {
    title: 'Catalogo de armas e escudos',
    categories: weaponAndShieldCategories
  },
  asas: {
    title: 'Catalogo de asas e capas',
    categories: ['Wings']
  },
  'asas-e-capas': {
    title: 'Catalogo de asas e capas',
    categories: ['Wings']
  },
  acessorios: {
    title: 'Catalogo de acessorios',
    categories: ['Earring', 'Pentagram']
  },
  'pets-e-mounts': {
    title: 'Catalogo de pets e mounts',
    categories: ['Muun']
  }
}
const excellentWeaponOptions: EquipmentOptionRule[] = [
  { key: 'excellent-dmg-rate', label: 'Excellent Damage Chance +10%', scope: 'excellent', appliesTo: 'weapon' },
  { key: 'excellent-level-dmg', label: 'Attack/Wizardry Damage +1 per 20 levels', scope: 'excellent', appliesTo: 'weapon' },
  { key: 'excellent-percent-dmg', label: 'Attack/Wizardry Damage +2%', scope: 'excellent', appliesTo: 'weapon' },
  { key: 'excellent-speed', label: 'Attack/Wizardry Speed +7', scope: 'excellent', appliesTo: 'weapon' },
  { key: 'excellent-hp-restore', label: 'Restore 1/8 HP per monster killed', scope: 'excellent', appliesTo: 'weapon' },
  { key: 'excellent-mana-restore', label: 'Restore 1/8 Mana per monster killed', scope: 'excellent', appliesTo: 'weapon' }
]
const wingOptionRules: EquipmentOptionRule[] = [
  { key: 'wing-chaos-machine', label: 'Wings are created through Chaos Machine mixes; they are not normal monster drops.', scope: 'normal', appliesTo: 'all' },
  { key: 'wing-damage-increase', label: 'Damage increase scales with wing level.', scope: 'normal', appliesTo: 'all' },
  { key: 'wing-damage-absorb', label: 'Damage absorption scales with wing level.', scope: 'normal', appliesTo: 'all' },
  { key: 'wing-luck', label: 'May have Luck: Soul success rate +25% and Critical Damage Rate +5%.', scope: 'normal', appliesTo: 'all' },
  { key: 'wing-recovery', label: 'Can roll HP/Mana recovery and enemy defense ignore/return options depending on wing tier.', scope: 'normal', appliesTo: 'all' },
  { key: 'wing-life-cost', label: 'Some wings reduce HP after successful attacks, depending on tier/version.', scope: 'normal', appliesTo: 'all' }
]
const equipmentCatalogConfig = computed(() => equipmentCatalogTopicConfigs[activeTopicKey.value])
const isEquipmentCatalogTopic = computed(() => activeSectionKey.value === 'equipamentos' && Boolean(equipmentCatalogConfig.value))
const knowledgeTopicConfigs: Record<string, KnowledgeTopicConfig> = {
  personagens: { kicker: 'Personagens', kind: 'CHARACTER', description: 'Personagens, classes, evolucoes e conteudos coletados para cada arquétipo.' },
  equipamentos: { kicker: 'Equipamentos', kind: 'ITEM', description: 'Conteudos tecnicos sobre equipamentos, tipos, adicionais, familias e sistemas.' },
  formulas: { kicker: 'Formulas', kind: 'SKILL', search: 'formula', description: 'Formulas coletadas para status, dano, defesa, experiencia e sistemas das classes.' },
  'status-de-personagens': { kicker: 'Formulas', kind: 'SKILL', search: 'status', description: 'Dados de status, atributos, multiplicadores e leitura tecnica dos personagens.' },
  experiencia: { kicker: 'Formulas', kind: 'DROP', search: 'experiencia', description: 'Conteudos coletados sobre experiencia, progressao, mapas e condicoes de evolucao.' },
  'taxas-do-servidor': { kicker: 'Servidor', kind: 'DROP', search: 'taxa', description: 'Referencias para taxas, regras globais e configuracoes do servidor.' },
  pvp: { kicker: 'Builds', kind: 'SKILL', search: 'pvp', description: 'Referencias para combate, rotas de build e leitura de performance em PvP.' },
  pvm: { kicker: 'Builds', kind: 'DROP', search: 'pvm', description: 'Referencias para progressao PvM, spots, monstros e equipamentos de farm.' },
  boss: { kicker: 'Builds', kind: 'DROP', search: 'boss', description: 'Referencias para bosses, mapas especiais e drops de alto valor.' },
  eventos: { kicker: 'Eventos', kind: 'EVENT', description: 'Eventos coletados para organizacao de regras, recompensas e rotinas.' },
  'chaos-weapon-mix': { kicker: 'Chaos Machine', kind: 'ITEM', search: 'chaos', description: 'Tutoriais e referencias de combinacoes usando Chaos Machine.' },
  'wing-mix': { kicker: 'Chaos Machine', kind: 'ITEM', search: 'wing', description: 'Referencias para criacao, evolucao e leitura de asas e capas.' },
  'socket-mix': { kicker: 'Chaos Machine', kind: 'ITEM', search: 'socket', description: 'Dados sobre Socket, Seed Sphere e combinacoes relacionadas.' },
  'jewel-mix': { kicker: 'Chaos Machine', kind: 'ITEM', search: 'jewel', description: 'Dados sobre jewels, adicionais, refinamento e interacoes com equipamentos.' },
  'eventos-de-mix': { kicker: 'Chaos Machine', kind: 'EVENT', search: 'mix', description: 'Eventos e regras especiais ligados a mixes e combinacoes.' },
  mapas: { kicker: 'Mapas', kind: 'MAP', description: 'Mapas coletados, com imagens, descricoes, entradas, areas e dados para spots.' },
  'spots-de-up': { kicker: 'Spots de up', kind: 'MAP', search: 'spot', description: 'Spots e rotas de up relacionados aos mapas e monstros coletados.' },
  monstros: { kicker: 'Monstros', kind: 'DROP', description: 'Monstros, familias, aparicoes, drops e dados coletados para PvM.' },
  bosses: { kicker: 'Bosses', kind: 'DROP', search: 'boss', description: 'Bosses e referencias de drops, eventos e mapas especiais.' },
  drops: { kicker: 'Drops', kind: 'DROP', description: 'Drops coletados por mapa, monstro, evento e sistema.' },
  'blood-castle': { kicker: 'Evento', kind: 'EVENT', search: 'blood castle', description: 'Dados do Blood Castle: entradas, regras, recompensas e referencias.' },
  'devil-square': { kicker: 'Evento', kind: 'EVENT', search: 'devil square', description: 'Dados do Devil Square: regras, ondas e recompensas.' },
  'chaos-castle': { kicker: 'Evento', kind: 'EVENT', search: 'chaos castle', description: 'Dados do Chaos Castle: regras, recompensas e funcionamento.' },
  'castle-siege': { kicker: 'Evento', kind: 'EVENT', search: 'castle siege', description: 'Dados do Castle Siege e sistemas ligados ao castelo.' },
  crywolf: { kicker: 'Evento', kind: 'EVENT', search: 'crywolf', description: 'Dados de Crywolf, regras, NPCs e objetivos.' },
  'outros-eventos': { kicker: 'Eventos', kind: 'EVENT', description: 'Eventos coletados que ainda precisam ser classificados.' },
  quests: { kicker: 'Quests', kind: 'QUEST', description: 'Quests coletadas para evolucao, liberacao de classe e sistemas.' },
  npcs: { kicker: 'NPCs', kind: 'NPC', description: 'NPCs coletados, funcoes, mapas e sistemas relacionados.' },
  'como-jogar': { kicker: 'Tutorial', search: 'como jogar', description: 'Conteudos introdutorios para novos jogadores.' },
  'primeiros-passos': { kicker: 'Tutorial', search: 'primeiros passos', description: 'Primeiros passos, interface, sistemas basicos e rotas iniciais.' },
  'itens-excellent': { kicker: 'Tutorial', kind: 'ITEM', search: 'excellent', description: 'Leitura e regras de itens Excellent, linhas verdes e adicionais possiveis.' },
  'itens-ancient': { kicker: 'Tutorial', kind: 'ITEM', search: 'ancient', description: 'Leitura de Ancient, set option info e bonus por quantidade equipada.' },
  'itens-socket': { kicker: 'Tutorial', kind: 'ITEM', search: 'socket', description: 'Leitura de Socket Items, sockets e Seed Spheres.' },
  archangel: { kicker: 'Tutorial', kind: 'ITEM', search: 'archangel', description: 'Armas Archangel, upgrades, status e leitura de tooltip.' },
  'chaos-machine': { kicker: 'Tutorial', kind: 'ITEM', search: 'chaos', description: 'Tutoriais sobre mixes, materiais, NPCs e taxas.' },
  'comercio-e-loja-pessoal': { kicker: 'Tutorial', search: 'loja pessoal', description: 'Troca, comercio entre jogadores, loja pessoal e sistemas economicos.' }
}
const sectionKnowledgeConfigs: Record<string, KnowledgeTopicConfig> = {
  formulas: { kicker: 'Formulas', kind: 'SKILL', description: 'Base completa de formulas, status, taxas e calculos coletados para a Wiki.' },
  builds: { kicker: 'Builds', kind: 'SKILL', description: 'Base completa de builds, rotas de progressao, combate e referencias de classe.' },
  'chaos-machine': { kicker: 'Chaos Machine', kind: 'SYSTEM', description: 'Base completa de Chaos Machine, mixes, joias, socket e sistemas relacionados.' },
  'mapas-e-pvm': { kicker: 'Mapas e PvM', kind: 'DROP', description: 'Base completa de mapas, monstros, bosses, spots e drops coletados.' },
  eventos: { kicker: 'Eventos', kind: 'EVENT', description: 'Base completa de eventos, regras, recompensas e rotinas do servidor.' },
  'quests-e-npcs': { kicker: 'Quests e NPCs', description: 'Base completa de quests, NPCs, primeiros passos e guias de jogo.' },
  tutoriais: { kicker: 'Tutoriais', kind: 'GUIDE', description: 'Base completa de tutoriais e regras de leitura para jogadores e equipe.' }
}
const genericKnowledgeConfig = computed<KnowledgeTopicConfig | null>(() => {
  if (!activeSectionKey.value || activeSectionKey.value === 'equipamentos' || activeSectionKey.value === 'personagens') {
    return null
  }

  if (activeTopicKey.value) {
    return {
      kicker: activeSection.value?.title || 'Wiki',
      search: activeTopic.value?.label || activeTopicKey.value,
      description: contentDescription.value
    }
  }

  return sectionKnowledgeConfigs[activeSectionKey.value] || null
})
const activeKnowledgeTopicConfig = computed(() =>
  knowledgeTopicConfigs[activeTopicKey.value] ||
  sectionKnowledgeConfigs[activeSectionKey.value] ||
  genericKnowledgeConfig.value
)
const isKnowledgeTopic = computed(() => Boolean(activeKnowledgeTopicConfig.value))
const knowledgeTopicDescription = computed(() => activeKnowledgeTopicConfig.value?.description || contentDescription.value)
const guiamuSourcesForTopic = computed(() =>
  activeTopicKey.value ? getGuiamuSourcesForTopic(activeTopicKey.value) : []
)
const contentTitle = computed(() => activeTopic.value?.label || activeSection.value?.title || 'Wiki')
const contentDescription = computed(() =>
  activeTopic.value
    ? `Conteudo de ${activeTopic.value.label} dentro da area ${activeSection.value?.title}.`
    : activeSection.value?.description || 'Selecione uma categoria no menu lateral.'
)
const contentBadge = computed(() => activeTopic.value ? activeSection.value?.title : 'Selecione')

const filteredWikiCharacters = computed(() =>
  wikiCharacterRows.value.filter((character) => isWikiAdmin.value || character.isSeasonSixBase || character.minSeason <= 6)
)
const apiDerivedWikiCharacters = computed<WikiCharacterRecord[]>(() =>
  characterKnowledgeEntries.value
    .filter((entry) =>
      entry.kind === 'CHARACTER' &&
      (entry.slug.startsWith('personagem-') || entry.sourceUrl?.startsWith('internal://bloodmoon/wiki/personagem-'))
    )
    .map((entry) => {
      const headings = entryHeadings(entry)
      const classNames = (headings.length ? headings : [entry.title]).filter(Boolean)
      const name = classNames[0] || entry.title
      const minSeason = entry.seasonMin || 1

      return {
        key: slugify(name),
        name,
        sortOrder: characterOrder.indexOf(name) === -1 ? 999 : characterOrder.indexOf(name) + 1,
        minSeason,
        isSeasonSixBase: entry.scope === 'SEASON_6' || minSeason <= 6,
        classes: classNames.map((className, index) => ({
          key: slugify(className),
          name: className,
          tier: index + 1,
          minSeason,
          isSeasonSixBase: entry.scope === 'SEASON_6' || minSeason <= 6
        }))
      }
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.minSeason - b.minSeason || a.name.localeCompare(b.name))
)
const wikiCharacterRows = computed(() =>
  wikiCharacters.value.length ? wikiCharacters.value : apiDerivedWikiCharacters.value
)
const activeCharacter = computed(() =>
  activeTopicKey.value
    ? filteredWikiCharacters.value.find((character) => character.key === activeTopicKey.value)
    : null
)
const activeCharacterDescription = computed(() => {
  if (!activeCharacter.value) {
    return wikiCharactersLoading.value
      ? 'Carregando personagens cadastrados na base da API.'
      : 'Lista de personagens e evolucoes cadastradas na base, em ordem de lancamento. Personagens futuros aparecem apenas para administradores.'
  }

  const classes = activeCharacter.value.classes.map((classItem) => classItem.name).join(' > ')
  return `${activeCharacter.value.name} entrou na base na Season ${activeCharacter.value.minSeason}. Evolucao: ${classes}.`
})
const characterKnowledgePool = computed(() =>
  characterKnowledgeEntries.value.filter((entry) => ['CHARACTER', 'SKILL', 'GUIDE', 'LORE'].includes(entry.kind))
)
const activeCharacterKnowledgeEntries = computed(() => {
  if (!activeCharacter.value) return []

  const terms = [activeCharacter.value.name, ...activeCharacter.value.classes.map((classItem) => classItem.name)]
    .map((term) => term.toLowerCase())

  return characterKnowledgePool.value.filter((entry) => {
    const haystack = [entry.title, entry.summary, JSON.stringify(entry.rawData || {})].join(' ').toLowerCase()
    return terms.some((term) => haystack.includes(term))
  }).slice(0, 8)
})
const characterKnowledgeCount = (characterName: string) => {
  const terms = [characterName, ...(characterEvolutionMap[characterName] || [])].map((term) => term.toLowerCase())
  return characterKnowledgePool.value.filter((entry) => {
    const haystack = [entry.title, entry.summary, JSON.stringify(entry.rawData || {})].join(' ').toLowerCase()
    return terms.some((term) => haystack.includes(term))
  }).length
}
const characterEquipmentCount = (characterName: string) =>
  apiSetCards.value.filter((set) => set.characterName === characterName || set.baseClasses?.includes(characterName)).length

const rawDataObject = (entry: WikiKnowledgeEntry) =>
  entry.normalizedData || entry.rawData || {}
const entryHeadings = (entry: WikiKnowledgeEntry) => {
  const raw = rawDataObject(entry)
  const headings = Array.isArray(raw.headings) ? raw.headings : []

  return headings
    .map((heading) => typeof heading === 'object' && heading && 'text' in heading ? String((heading as { text: unknown }).text) : '')
    .filter((heading) => heading && !/cookie consent|voce tambem pode gostar|você também pode gostar/i.test(heading))
}
const entrySummary = (entry: WikiKnowledgeEntry) => {
  if (entry.summary) return entry.summary

  const headings = entryHeadings(entry)
  if (headings.length > 1) {
    return headings.slice(1, 4).join(' | ')
  }

  const raw = rawDataObject(entry)
  const paragraphCount = typeof raw.paragraphCount === 'number' ? raw.paragraphCount : 0
  const tableCount = typeof raw.tableCount === 'number' ? raw.tableCount : 0
  const imageCount = typeof raw.imageCount === 'number' ? raw.imageCount : 0
  return `${paragraphCount} paragrafos coletados, ${tableCount} tabelas e ${imageCount} imagens vinculadas para revisao.`
}
const entryStats = (entry: WikiKnowledgeEntry) => {
  const raw = rawDataObject(entry)
  const paragraphCount = typeof raw.paragraphCount === 'number' ? raw.paragraphCount : 0
  const tableCount = typeof raw.tableCount === 'number' ? raw.tableCount : 0
  const imageCount = typeof raw.imageCount === 'number' ? raw.imageCount : entry.assets?.length || 0

  return `${paragraphCount} textos | ${tableCount} tabelas | ${imageCount} imagens`
}
const entryImage = (entry: WikiKnowledgeEntry) => {
  const asset = entry.assets?.find((item) => item.asset.publicPath || item.asset.sourceUrl)
  return asset?.asset.publicPath || asset?.asset.sourceUrl || ''
}

const loadWikiCharacters = async () => {
  wikiCharactersLoading.value = true
  try {
    wikiCharacters.value = await wikiApi.characters() as WikiCharacterRecord[]
  } catch {
    wikiCharacters.value = []
  } finally {
    wikiCharactersLoading.value = false
  }
}

const loadKnowledgeEntries = async () => {
  const config = activeKnowledgeTopicConfig.value
  if (!config) {
    knowledgeEntries.value = []
    knowledgeEntriesTotal.value = 0
    knowledgeEntriesTotalPages.value = 1
    return
  }

  knowledgeEntriesLoading.value = true
  knowledgeEntriesError.value = ''

  try {
    const querySearch = [config.search, knowledgeSearch.value].filter(Boolean).join(' ')
    const response = await wikiApi.entries({
      kind: config.kind,
      scope: knowledgeScopeFilter.value || undefined,
      season: wikiSeason.value,
      search: querySearch,
      page: knowledgePage.value,
      pageSize: 24
    }) as WikiPaginatedResponse<WikiKnowledgeEntry>

    knowledgeEntries.value = response.data
    knowledgeEntriesTotal.value = response.total
    knowledgeEntriesTotalPages.value = response.totalPages
  } catch (error) {
    knowledgeEntries.value = []
    knowledgeEntriesTotal.value = 0
    knowledgeEntriesTotalPages.value = 1
    knowledgeEntriesError.value = error instanceof Error ? error.message : 'Nao foi possivel carregar dados da wiki.'
  } finally {
    knowledgeEntriesLoading.value = false
  }
}

const loadCharacterKnowledgePool = async () => {
  try {
    const responses = await Promise.all(
      ['CHARACTER', 'SKILL', 'GUIDE'].map((kind) =>
        wikiApi.entries({ kind, page: 1, pageSize: 120 }) as Promise<WikiPaginatedResponse<WikiKnowledgeEntry>>
      )
    )
    characterKnowledgeEntries.value = responses.flatMap((response) => response.data)
  } catch {
    // A lista de personagens continua funcionando mesmo sem textos coletados.
    characterKnowledgeEntries.value = []
  }
}

const normalizeSetName = (title: string) => {
  let name = title.replace(/\s+Set$/i, '').trim()

  for (const piece of setPieceNames) {
    name = name.replace(new RegExp(`\\s+${piece}(?=\\s+(ATK|ENE)$|$)`, 'i'), '').trim()
  }

  return name.replace(/\s+/g, ' ')
}

const setPieceName = (title: string) => {
  const piece = setPieceNames.find((name) => new RegExp(`\\b${name}\\b`, 'i').test(title))
  const variant = setVariantNames.find((name) => new RegExp(`\\b${name}\\b`, 'i').test(title))

  return [piece || 'Set', variant].filter(Boolean).join(' ')
}

const setTier = (name: string) => {
  const index = setPowerOrder.findIndex((item) => item.toLowerCase() === name.toLowerCase())
  return index === -1 ? 1000 : index + 1
}

const normalizeSetReferenceName = (name: string) =>
  name
    .replace(/\s+Set$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const ancientSetEffectPattern = /\b(?:\d+\s+set option|set option|increase|double damage|excellent damage|ignore|wizardry|damage|defense|energy|agility|mana|life|hp|skill)\b/i
const ancientPiecePattern = /\b(?:armor|pants|helm|helmet|boots|gloves|shield|pendant|ring|sword|blade|axe|mace|bow|crossbow|staff|stick|scepter|spear|lance|claw|book|orb|rune|gun)\b/i
const isAncientSetEffectText = (value: string) => ancientSetEffectPattern.test(value)
const isAncientPieceText = (value: string) => {
  const normalized = value.trim()

  return Boolean(normalized) &&
    !/^opci/i.test(normalized) &&
    !isAncientSetEffectText(normalized) &&
    ancientPiecePattern.test(normalized)
}
const splitAncientSetEffectText = (value: string) => {
  const normalized = value.replace(/\s+/g, ' ').trim()
  const matches = [...normalized.matchAll(/(?:^|\s)(\d+\s+Set option\s*:\s*)(.*?)(?=\s+\d+\s+Set option\s*:|$)/gi)]

  if (!matches.length && isAncientSetEffectText(normalized)) {
    return [normalized]
  }

  return matches
    .map((match) => `${match[1].trim()} ${match[2].trim()}`.replace(/\s+:/, ':'))
    .filter(Boolean)
}

const setTypeOrder = ['Normal', 'Excellent', 'Socket', 'Ancient', 'Mastery Ancient', 'Lucky']
const qualityOrder: EquipmentQualityKey[] = ['normal', 'excellent', 'ancient', 'socket', 'masteryAncient', 'lucky']
const setTypeFromName = (name: string) => {
  if (socketSetNames.some((socketName) => name.toLowerCase().includes(socketName.toLowerCase()))) {
    return 'Socket'
  }

  return 'Normal'
}
const setQualityFromType = (type: string): EquipmentQualityKey | undefined => ({
  Normal: 'normal',
  Excellent: 'excellent',
  Socket: 'socket',
  Ancient: 'ancient',
  'Mastery Ancient': 'masteryAncient',
  Lucky: 'lucky',
})[type] as EquipmentQualityKey | undefined
const secondClassSetNames = [
  'Black Dragon',
  'Dark Phoenix',
  'Great Dragon',
  'Ashcrow',
  'Grand Soul',
  'Dark Soul',
  'Venom Mist',
  'Eclipse',
  'Iris',
  'Holy Spirit',
  'Divine',
  'Red Spirit',
  'Thunder Hawk',
  'Hurricane',
  'Volcano',
  'Dark Master',
  'Sunlight'
]
const masterySeasonByFamily: Record<string, number> = {
  Bloodangel: 11,
  Darkangel: 12,
  Holyangel: 13,
  Soul: 14,
  'Blue Eye': 15,
  Manticore: 16,
  'Silver Heart': 17,
  Brilliant: 18,
  Apocalypse: 19,
  Primordial: 20
}
const inferRequiredClassTier = (name: string, types: string[] = []) => {
  const normalizedName = name.toLowerCase()

  if (
    ['Bloodangel', 'Darkangel', 'Holyangel', 'Blue Eye', 'Manticore', 'Silver Heart', 'Brilliant', 'Apocalypse', 'Primordial']
      .some((family) => normalizedName.includes(family.toLowerCase()))
  ) {
    return 3
  }

  if (types.includes('Socket')) {
    return 3
  }

  if (secondClassSetNames.some((setName) => normalizedName.includes(setName.toLowerCase()))) {
    return 2
  }

  return 1
}
const inferTargetClassTier = (name: string, types: string[] = []) => {
  const normalizedName = name.toLowerCase()

  if (
    masteryAncientSetNames.some((family) => normalizedName.includes(family.toLowerCase())) ||
    types.includes('Ancient') && masteryAncientCategories.some((category) => normalizedName.includes(category.replace(/\s+Ancient$/i, '').toLowerCase()))
  ) {
    return 3
  }

  if (types.includes('Socket')) {
    return 3
  }

  if (secondClassSetNames.some((setName) => normalizedName.includes(setName.toLowerCase()))) {
    return 2
  }

  return 1
}
const inferMinSeason = (name: string, types: string[] = []) => {
  const normalizedName = name.toLowerCase()
  const masteryFamily = Object.keys(masterySeasonByFamily).find((family) => normalizedName.includes(family.toLowerCase()))

  if (masteryFamily) {
    return masterySeasonByFamily[masteryFamily]
  }

  if (types.includes('Socket')) {
    return 4
  }

  return 1
}
const equipmentItemMinSeason = (item: GuideEquipmentItem | GuideEquipmentSummary) => {
  const normalized = `${item.name} ${item.category}`.toLowerCase()
  const masteryFamily = Object.keys(masterySeasonByFamily).find((family) => normalized.includes(family.toLowerCase()))

  if (masteryFamily) {
    return masterySeasonByFamily[masteryFamily]
  }

  if (item.category === 'Set Lucky') {
    return 6
  }

  return 1
}
const setMatchesSelectedEvolution = (set: SetCard, selectedClass: string) => {
  if (selectedClass === 'Default') {
    return true
  }

  const selectedBaseClass = baseClassFor(selectedClass)

  return set.evolutions.some((className) => baseClassFor(className) === selectedBaseClass) &&
    classTier(selectedClass) === set.targetClassTier
}
const setVisibleInSeason = (set: SetCard) => set.minSeason <= wikiSeason.value
const sortSetTypes = (types: string[]) =>
  types.sort((a, b) => {
    const aIndex = setTypeOrder.indexOf(a)
    const bIndex = setTypeOrder.indexOf(b)

    return (aIndex === -1 ? 1000 : aIndex) - (bIndex === -1 ? 1000 : bIndex) || a.localeCompare(b, 'pt-BR')
  })
const sortQualities = (qualities: EquipmentQualityKey[]) =>
  qualities.sort((a, b) => qualityOrder.indexOf(a) - qualityOrder.indexOf(b))
const setTypesToQualities = (types: string[]) =>
  sortQualities(Array.from(new Set(types.map((type) => setQualityFromType(type)).filter(Boolean) as EquipmentQualityKey[])))
const guideSetLookupName = (set: SetCard | null) => set?.guideName || set?.name || ''
const guideArmorItemsByName = (name: string) =>
  guiamuonlineArmorItems.value.filter((item) => item.name.toLowerCase() === name.toLowerCase())
const setBaseNameFromAncient = (item: GuideEquipmentSummary) => {
  if (item.category === 'Ancient Normal' || item.category === 'Set Lucky') {
    const parts = item.name.replace(/\s*\(.+?\)\s*/g, ' ').trim().split(/\s+/)
    return parts.length > 1 ? parts.slice(1).join(' ') : item.name
  }

  const masteryCategory = masteryAncientCategories.find((category) => category === item.category)
  if (masteryCategory) {
    const family = masteryCategory.replace(/\s+Ancient$/i, '')
    const familyIndex = item.name.toLowerCase().indexOf(family.toLowerCase())
    const baseName = familyIndex === -1 ? item.name : item.name.slice(familyIndex)

    return baseName
      .replace(/\s+/g, ' ')
      .trim()
  }

  const armorCandidates = guiamuonlineArmorItems.value.filter((candidate) =>
    candidate.category === 'Armor' &&
    normalizeCatalogSearch(item.name).includes(normalizeCatalogSearch(candidate.name))
  )

  return armorCandidates[0]?.name || item.name.replace(/\s*\(.+?\)\s*/g, ' ').replace(/^(Fury|Absolute|Ancient)\s+/i, '').trim()
}

const setCards = computed<SetCard[]>(() => apiSetCards.value)

const setCharacterOptions = computed(() =>
  characterOrder.filter((character) => setCards.value.some((set) => setVisibleInSeason(set) && canUseClass(set.evolutions, character)))
    .sort((a, b) => characterOrder.indexOf(a) - characterOrder.indexOf(b))
)
const setEvolutionOptions = computed(() => {
  const availableCharacters = setCharacterFilter.value === 'Default'
    ? setCharacterOptions.value
    : [setCharacterFilter.value]

  return availableCharacters.flatMap((character) => characterEvolutionMap[character] || [character])
})
const setDisplayClasses = (set: SetCard) => {
  if (setEvolutionFilter.value !== 'Default') {
    return [setEvolutionFilter.value]
  }

  if (setCharacterFilter.value !== 'Default') {
    const target = set.targetClasses?.find((className) => baseClassFor(className) === setCharacterFilter.value)
    return target ? [target] : []
  }

  return set.targetClasses?.length
    ? sanitizeClassList(set.targetClasses)
    : classesAvailableFromTier(set.evolutions, set.requiredClassTier)
}
const setDisplayCharacter = (set: SetCard) =>
  setCharacterFilter.value !== 'Default' ? setCharacterFilter.value : set.characterName
const setTypeOptions = computed(() =>
  sortSetTypes(Array.from(new Set(setCards.value.flatMap((set) => set.setTypes))))
)
const setEquipmentOptions = computed(() => {
  const availableNames = Array.from(new Set(setCards.value
    .filter(setVisibleInSeason)
    .filter((set) => setCharacterFilter.value === 'Default' || canUseClass(set.evolutions, setCharacterFilter.value))
    .filter((set) => setEvolutionFilter.value === 'Default' || setMatchesSelectedEvolution(set, setEvolutionFilter.value))
    .filter((set) => setTypeFilter.value === 'Default' || set.setTypes.includes(setTypeFilter.value))
    .map((set) => set.name)))

  return availableNames.sort((a, b) => setTier(a) - setTier(b) || a.localeCompare(b, 'pt-BR'))
})
const filteredSetCards = computed(() => {
  const search = setNameSearch.value.trim().toLowerCase()

  return setCards.value.filter((set) => {
    const matchesSeason = setVisibleInSeason(set)
    const matchesCharacter = setCharacterFilter.value === 'Default' || canUseClass(set.evolutions, setCharacterFilter.value)
    const matchesEvolution = setEvolutionFilter.value === 'Default' || setMatchesSelectedEvolution(set, setEvolutionFilter.value)
    const matchesType = setTypeFilter.value === 'Default' || set.setTypes.includes(setTypeFilter.value)
    const matchesEquipment = setEquipmentFilter.value === 'Default' || set.name === setEquipmentFilter.value
    const matchesSearch = !search || set.searchText.includes(search)

    return matchesSeason && matchesCharacter && matchesEvolution && matchesType && matchesEquipment && matchesSearch
  })
})
const setTotalPages = computed(() => Math.max(1, Math.ceil(filteredSetCards.value.length / setPageSize)))
const paginatedSetCards = computed(() => {
  const page = Math.min(setCurrentPage.value, setTotalPages.value)
  const start = (page - 1) * setPageSize

  return filteredSetCards.value.slice(start, start + setPageSize)
})

const equipmentCatalogItems = computed(() => {
  const config = equipmentCatalogConfig.value
  const categories = config?.categories || []
  const categorySet = new Set(categories)

  return muEquipmentIndex.value.filter((item) =>
    categorySet.has(item.category) &&
    equipmentItemMinSeason(item) <= wikiSeason.value &&
    (!config?.filter || config.filter(item))
  )
})
const equipmentCatalogCategories = computed(() =>
  Array.from(new Set(equipmentCatalogItems.value.map((item) => item.category)))
)
const equipmentCatalogClassOptions = computed(() =>
  playableClassNames.filter((className) =>
    equipmentCatalogItems.value.some((item) => canUseClass(item.usableBy, className))
  )
)
const filteredEquipmentCatalogItems = computed(() => {
  const search = normalizeCatalogSearch(equipmentCatalogSearch.value)

  return equipmentCatalogItems.value.filter((item) => {
    const matchesCategory = equipmentCatalogCategoryFilter.value === 'Default' || item.category === equipmentCatalogCategoryFilter.value
    const matchesClass = equipmentCatalogClassFilter.value === 'Default' || canUseClass(item.usableBy, equipmentCatalogClassFilter.value)
    const matchesSearch = !search || normalizeCatalogSearch([
      item.name,
      item.title,
      item.category,
      usableByText(item),
      compactListStats(item)
    ].join(' ')).includes(search)

    return matchesCategory && matchesClass && matchesSearch
  })
})
const equipmentCatalogTotalPages = computed(() => Math.max(1, Math.ceil(filteredEquipmentCatalogItems.value.length / equipmentCatalogPageSize)))
const paginatedEquipmentCatalogItems = computed(() => {
  const page = Math.min(equipmentCatalogCurrentPage.value, equipmentCatalogTotalPages.value)
  const start = (page - 1) * equipmentCatalogPageSize

  return filteredEquipmentCatalogItems.value.slice(start, start + equipmentCatalogPageSize)
})

const guideSetSummaryItems = (set: SetCard | null) => {
  if (!set) {
    return [] as GuideEquipmentSummary[]
  }

  return setModalPieces
    .map((piece) => guiamuonlineArmorItems.value.find((item) => item.category === piece.guideCategory && item.name === guideSetLookupName(set)))
    .filter(Boolean) as GuideEquipmentSummary[]
}

const staticFullSetImage = (set: SetCard | null) => {
  if (!set) {
    return undefined
  }

  const setSlug = slugify(set.name)
  const characterAlias = set.characterName === 'Fairy Elf' ? 'elf' : slugify(set.characterName)
  const candidates = [
    `${setSlug}-set`,
    `${setSlug}-${characterAlias}-set`,
    `excellent-${setSlug}-set`,
    `excellent-${setSlug}-${characterAlias}-set`
  ]
  const exact = fullSetImageLibrary.value.find((image) => candidates.includes(image.key))
  if (exact) {
    return exact.publicPath
  }

  const prefix = fullSetImageLibrary.value.find((image) =>
    candidates.some((candidate) => image.key.startsWith(`${candidate}-`))
  )
  if (prefix) {
    return prefix.publicPath
  }

  const loose = fullSetImageLibrary.value.find((image) =>
    image.key.includes(setSlug) &&
    image.key.includes('set') &&
    (!set.characterName.includes('Elf') || image.key.includes('elf'))
  )

  return loose?.publicPath
}

const setPreviewImage = (set: SetCard) =>
  staticFullSetImage(set) ||
  set.fullSetImage ||
  set.pieceCards.find((piece) => piece.image)?.image ||
  guideSetSummaryItems(set).find((item) => item.image.publicPath)?.image.publicPath ||
  undefined

const selectedSetFullImage = computed(() =>
  staticFullSetImage(selectedSet.value) || selectedSet.value?.fullSetImage
)

const selectedAncientReference = computed(() => {
  if (!selectedSet.value) {
    return null
  }

  const possibleSetNames = new Set([
    normalizeSetReferenceName(selectedSet.value.name),
    normalizeSetReferenceName(selectedSet.value.guideName || selectedSet.value.name)
  ])
  const characterName = selectedSet.value.characterName.toLowerCase()

  return ancientSetReferences.value.find((reference) => {
    const referenceName = normalizeSetReferenceName(reference.name)
    const referenceClasses = reference.classes?.map((item) => item.toLowerCase()) || []

    return possibleSetNames.has(referenceName) && (!referenceClasses.length || referenceClasses.includes(characterName))
  }) || null
})

const selectedAncientCatalogItem = computed(() => {
  if (!selectedSet.value) {
    return null
  }

  const ancientCategories = [...ancientEquipmentCategories, ...masteryAncientCategories]
  const selectedKey = selectedSet.value.key.toLowerCase()
  const selectedName = normalizeSetReferenceName(selectedSet.value.name)
  const selectedGuideName = normalizeSetReferenceName(selectedSet.value.guideName || selectedSet.value.name)

  return muEquipmentIndex.value.find((item) => ancientCategories.includes(item.category) && selectedKey.endsWith(item.key.toLowerCase())) ||
    muEquipmentIndex.value.find((item) =>
      ancientCategories.includes(item.category) &&
      (
        normalizeSetReferenceName(item.name) === selectedName ||
        normalizeSetReferenceName(setBaseNameFromAncient(item)) === selectedGuideName
      )
    ) ||
    null
})

const selectedAncientSetEffectRows = computed<EquipmentOptionRule[]>(() => {
  const rows: EquipmentOptionRule[] = []
  const seen = new Set<string>()
  const addRow = (label: string) => {
    const normalized = label.replace(/\s+/g, ' ').trim()
    if (!normalized || seen.has(normalized.toLowerCase()) || /^opci/i.test(normalized)) {
      return
    }

    seen.add(normalized.toLowerCase())
    rows.push({
      key: `ancient-set-effect-${rows.length}`,
      label: normalized,
      scope: 'ancient',
      appliesTo: 'armor'
    })
  }

  selectedAncientReference.value?.setOptions?.forEach((option) => {
    addRow(`${option.pieces} Set option: ${option.option}`)
  })

  Object.values(selectedAncientCatalogItem.value?.listStats || {})
    .flatMap(splitAncientSetEffectText)
    .forEach(addRow)

  selectedSet.value?.dbSetOptions?.forEach(addRow)

  return rows
})
const selectedAncientSetTitle = computed(() =>
  selectedAncientReference.value?.name ||
  selectedAncientCatalogItem.value?.name ||
  `${selectedSet.value?.name || 'Ancient'} Set`
)
const selectedAncientSetPieceNames = computed(() => {
  const fromReference = selectedAncientReference.value?.pieces?.map((piece) => piece.name) || []
  if (fromReference.length) {
    return fromReference
  }

  const fromCatalog = Object.values(selectedAncientCatalogItem.value?.listStats || {})
    .filter(isAncientPieceText)
  if (fromCatalog.length) {
    return Array.from(new Set(fromCatalog))
  }

  return Array.from(new Set(selectedSet.value?.pieces || []))
})
const selectedAncientSetDisplayRows = computed(() =>
  selectedAncientSetEffectRows.value.map((row) => ({
    ...row,
    label: row.label
      .replace(/^(\d+)\s+Set option\s*:\s*/i, '$1 equipamentos: ')
      .replace(/^full-or-additional\s+Set option\s*:\s*/i, 'Set completo/adicional: ')
      .replace(/^additional\s+Set option\s*:\s*/i, 'Adicional: ')
  }))
)

const luckySetNames = ['Lucky']

const selectedSetName = computed(() => selectedSet.value?.name || '')
const selectedSetGuideName = computed(() => guideSetLookupName(selectedSet.value))
const isSocketSet = computed(() => selectedSet.value?.setTypes.includes('Socket') || socketSetNames.some((name) => selectedSetGuideName.value.toLowerCase().includes(name.toLowerCase())))
const isMasteryAncientSet = computed(() => masteryAncientSetNames.some((name) => selectedSetGuideName.value.toLowerCase().includes(name.toLowerCase())))
const isLuckySet = computed(() => luckySetNames.some((name) => selectedSetName.value.toLowerCase().includes(name.toLowerCase())))

const selectedAvailableQualities = computed<EquipmentQualityKey[]>(() => {
  if (isSocketSet.value) {
    return ['socket']
  }

  if (selectedSet.value?.availableQualities.length) {
    if (isMasteryAncientSet.value && selectedSet.value.availableQualities.includes('ancient')) {
      return sortQualities(Array.from(new Set(['normal', 'excellent', ...selectedSet.value.availableQualities] as EquipmentQualityKey[])))
    }

    return selectedSet.value.availableQualities
  }

  if (isLuckySet.value) {
    return ['lucky']
  }

  if (isMasteryAncientSet.value) {
    return ['normal', 'excellent', 'ancient']
  }

  if (selectedAncientReference.value) {
    return ['ancient']
  }

  return ['normal', 'excellent']
})

const itemRequiredLevel = (item: GuideEquipmentItem | GuideEquipmentSummary) =>
  Number(String(item.listStats?.requiredLevel || '').replace(/[^\d.-]/g, ''))
const wingTier = (name: string) => {
  const normalizedName = normalizeCatalogSearch(name)
  if (['satan', 'heaven', 'elf', 'mistery'].some((tierName) => normalizedName.includes(tierName))) {
    return 'Level 1'
  }

  if (['dragon', 'soul', 'spirit', 'darkness', 'despair'].some((tierName) => normalizedName.includes(tierName))) {
    return 'Level 2'
  }

  if (['storm', 'eternal', 'illusion', 'ruin', 'dimension', 'lord', 'fighter'].some((tierName) => normalizedName.includes(tierName))) {
    return 'Level 3'
  }

  if (['conqueror', 'angel', 'fate', 'annihilation', 'heaven', 'silence', 'judgment', 'transcendence'].some((tierName) => normalizedName.includes(tierName))) {
    return 'Level alto'
  }

  return 'Validar tier'
}

const optionAppliesToKind = (option: EquipmentOptionRule, kind: 'armor' | 'weapon' | 'shield' | 'socket') =>
  option.appliesTo === 'all' ||
  option.appliesTo === kind ||
  (kind === 'shield' && option.appliesTo === 'armor')
const armorNormalOptionRows = computed(() =>
  baseLuckAndAdditionalOptions.filter((option) => optionAppliesToKind(option, 'armor'))
)

const selectedEquipmentOptionRows = computed<EquipmentOptionRule[]>(() => {
  if (setQuality.value === 'lucky') {
    return luckySetOptions
  }

  if (setQuality.value === 'masteryAncient' || (setQuality.value === 'ancient' && isMasteryAncientSet.value)) {
    return [...armorNormalOptionRows.value, ...masteryAncientOptions]
  }

  if (setQuality.value === 'ancient') {
    return armorNormalOptionRows.value
  }

  if (setQuality.value === 'socket') {
    return [...armorNormalOptionRows.value, ...socketSeedSphereOptions]
  }

  if (setQuality.value === 'excellent') {
    return [...armorNormalOptionRows.value, ...excellentDefenseOptions]
  }

  return armorNormalOptionRows.value
})

const qualityButtonClass = (quality: EquipmentQualityKey) => quality === setQuality.value
  ? {
      normal: 'border-ember/60 bg-ember/20 text-white',
      excellent: 'border-emerald-400/60 bg-emerald-400/15 text-white',
      ancient: 'border-lime-400/60 bg-lime-400/15 text-white',
      socket: 'border-violet-400/60 bg-violet-400/15 text-white',
      masteryAncient: 'border-amber-300/60 bg-amber-300/15 text-white',
      lucky: 'border-amber-300/60 bg-amber-300/15 text-white'
    }[quality]
  : 'border-white/10 bg-white/[0.04] text-zinc-400'

const equipmentQualityButtonClass = (quality: EquipmentQualityKey) => quality === selectedEquipmentQuality.value
  ? {
      normal: 'border-ember/60 bg-ember/20 text-white',
      excellent: 'border-emerald-400/60 bg-emerald-400/15 text-white',
      ancient: 'border-lime-400/60 bg-lime-400/15 text-white',
      socket: 'border-violet-400/60 bg-violet-400/15 text-white',
      masteryAncient: 'border-amber-300/60 bg-amber-300/15 text-white',
      lucky: 'border-amber-300/60 bg-amber-300/15 text-white'
    }[quality]
  : 'border-white/10 bg-white/[0.04] text-zinc-400'

const optionClass = (option: EquipmentOptionRule) => ({
  'border-sky-400/20 bg-sky-400/[0.05] text-sky-300': option.scope === 'normal',
  'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-300': option.scope === 'excellent',
  'border-lime-400/20 bg-lime-400/[0.06] text-lime-300': option.scope === 'ancient',
  'border-violet-400/20 bg-violet-400/[0.06] text-violet-300': option.scope === 'socket',
  'border-amber-300/20 bg-amber-300/[0.06] text-amber-200': option.scope === 'mastery' || option.scope === 'lucky',
  'border-yellow-300/20 bg-yellow-300/[0.06] text-yellow-200': option.scope === 'harmony',
  'border-fuchsia-300/20 bg-fuchsia-300/[0.06] text-fuchsia-200': option.scope === 'guardian'
})

const normalizeCatalogSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const compactListStats = (item: GuideEquipmentItem | GuideEquipmentSummary) =>
  Object.entries(item.listStats || {})
    .filter(([, value]) => value && value !== '~')
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' - ') || 'Dados detalhados disponiveis no item'

const usableByText = (item: GuideEquipmentItem | GuideEquipmentSummary) =>
  sanitizeClassList(item.usableBy).length ? sanitizeClassList(item.usableBy).join(', ') : 'Classe indicada na descricao'

const inheritedVisualBaseName = (item: GuideEquipmentItem | GuideEquipmentSummary) => {
  if (item.image.publicPath) {
    return ''
  }

  if (item.category === 'Ancient Normal' || item.category === 'Set Lucky') {
    const parts = item.name.replace(/\s*\(.+?\)\s*/g, ' ').trim().split(/\s+/)
    return parts.length > 1 ? parts.slice(1).join(' ') : ''
  }

  const masteryCategory = masteryAncientCategories.find((category) => category === item.category)
  if (masteryCategory) {
    return masteryCategory.replace(/\s+Ancient$/i, '')
  }

  return ''
}

const inheritedVisualItem = (item: GuideEquipmentItem | GuideEquipmentSummary) => {
  const baseName = inheritedVisualBaseName(item)

  if (!baseName) {
    return null
  }

  const normalizedBase = normalizeCatalogSearch(baseName)
  const candidates = muEquipmentIndex.value.filter((candidate) =>
    armorPieceCategories.includes(candidate.category) &&
    Boolean(candidate.image.publicPath) &&
    normalizeCatalogSearch(candidate.name) === normalizedBase
  )

  return candidates.find((candidate) => candidate.category === 'Armor') || candidates[0] || null
}

const equipmentCatalogPreviewImage = (item: GuideEquipmentItem | GuideEquipmentSummary | null) => {
  if (!item) {
    return null
  }

  return item.image.publicPath || inheritedVisualItem(item)?.image.publicPath || null
}

const equipmentCatalogImageStatus = (item: GuideEquipmentItem | GuideEquipmentSummary) => {
  if (item.image.publicPath) {
    return 'Imagem local'
  }

  return inheritedVisualItem(item) ? 'Imagem herdada do visual normal' : 'Imagem pendente'
}

const selectedEquipmentDisplayItem = computed(() => selectedEquipmentItem.value || selectedEquipmentSummary.value)
const selectedEquipmentLevelZeroStats = computed(() =>
  selectedEquipmentItem.value?.levelStats.find((stat) => stat.itemLevel === 0) ||
  selectedEquipmentItem.value?.levelStats[0] ||
  null
)
const selectedEquipmentLevelStats = computed(() =>
  selectedEquipmentItem.value?.levelStats.find((stat) => stat.itemLevel === selectedEquipmentBlessingLevel.value) ||
  selectedEquipmentLevelZeroStats.value
)
const isSelectedEquipmentWing = computed(() => selectedEquipmentDisplayItem.value?.category === 'Wings')
const isSelectedEquipmentShield = computed(() => selectedEquipmentDisplayItem.value?.category === 'Shield')
const selectedEquipmentKind = computed<'weapon' | 'shield' | 'wing' | 'armor'>(() => {
  if (isSelectedEquipmentWing.value) {
    return 'wing'
  }

  if (isSelectedEquipmentShield.value) {
    return 'shield'
  }

  return 'weapon'
})
const selectedEquipmentAvailableQualities = computed<EquipmentQualityKey[]>(() => {
  const item = selectedEquipmentDisplayItem.value
  if (!item || isSelectedEquipmentWing.value) {
    return ['normal']
  }

  return item.listStats.excellentDrop && item.listStats.excellentDrop !== '~'
    ? ['normal', 'excellent']
    : ['normal']
})
const selectedCatalogEquipmentOptionRows = computed(() => {
  const item = selectedEquipmentDisplayItem.value
  if (!item) {
    return [] as EquipmentOptionRule[]
  }

  if (isSelectedEquipmentWing.value) {
    return wingOptionRules
  }

  const appliesToCurrentItem = (option: EquipmentOptionRule) =>
    optionAppliesToKind(option, selectedEquipmentKind.value === 'wing' ? 'armor' : selectedEquipmentKind.value)
  const baseOptions = baseLuckAndAdditionalOptions.filter(appliesToCurrentItem)
  const excellentOptions = selectedEquipmentQuality.value === 'excellent'
    ? [...excellentDefenseOptions, ...excellentWeaponOptions].filter(appliesToCurrentItem)
    : []

  return [...baseOptions, ...excellentOptions]
})
const selectedEquipmentStatRows = computed(() => {
  const item = selectedEquipmentDisplayItem.value
  const stat = selectedEquipmentLevelStats.value

  if (!item) {
    return [] as { label: string, value: string | number }[]
  }

  if (isSelectedEquipmentWing.value) {
    return [
      { label: 'Categoria', value: item.category },
      { label: 'Tier', value: wingTier(item.name) },
      { label: 'Level requerido', value: item.listStats.normalDrop },
      { label: 'Origem', value: 'Chaos Machine' },
      { label: 'Pode equipar', value: usableByText(item) }
    ].filter((row) => row.value !== null && row.value !== undefined && row.value !== '~' && row.value !== '')
  }

  const rows = [
    { label: 'Categoria', value: item.category },
    { label: 'Normal drop', value: item.listStats.normalDrop },
    { label: 'Excellent drop', value: selectedEquipmentAvailableQualities.value.includes('excellent') ? item.listStats.excellentDrop : undefined },
    { label: 'Attack speed', value: stat?.attackSpeed ?? item.listStats.attackSpeed },
    { label: 'Defense', value: stat?.defense },
    { label: 'Damage min', value: stat?.damageMin },
    { label: 'Damage max', value: stat?.damageMax },
    { label: 'Durability', value: stat?.durability },
    { label: 'Required strength', value: stat?.requiredStrength },
    { label: 'Required agility', value: stat?.requiredAgility },
    { label: 'Excellent required strength', value: selectedEquipmentQuality.value === 'excellent' ? stat?.excellentRequiredStrength : undefined },
    { label: 'Excellent required agility', value: selectedEquipmentQuality.value === 'excellent' ? stat?.excellentRequiredAgility : undefined }
  ]

  return rows.filter((row) => row.value !== null && row.value !== undefined && row.value !== '~' && row.value !== '')
})

const selectedSetUsableByClasses = computed(() => {
  if ((setQuality.value === 'ancient' || setQuality.value === 'masteryAncient') && selectedAncientReference.value?.classes?.length) {
    return sanitizeClassList(selectedAncientReference.value.classes)
  }

  const classes = sanitizeClassList(selectedGuideSetItems.value.flatMap((item) => item?.usableBy || []))

  const rawClasses = classes.length
    ? Array.from(new Set(classes))
    : selectedSet.value?.evolutions || []

  return selectedSet.value
    ? classesAvailableFromTier(rawClasses, selectedSet.value.requiredClassTier)
    : rawClasses
})

const fallbackPieceDefense = (pieceIndex: number) => {
  const tier = selectedSet.value?.tier === 1000 ? 1 : selectedSet.value?.tier || 1
  return Math.max(4, Math.round(tier * 2.4 + pieceIndex * 3))
}

const guideDefenseAtLevel = (category: string, name: string, level: number, fallbackIndex: number) => {
  const guideItem = selectedGuideSetItems.value.find((item) => item.category === category && item.name === name)
  const stat = guideItem?.levelStats.find((item) => item.itemLevel === level)
  const defense = setQuality.value === 'excellent'
    ? stat?.excellentDefense ?? stat?.defense
    : stat?.defense

  return defense ?? fallbackPieceDefense(fallbackIndex)
}

const ancientPartCategory = (name: string) => {
  if (/\bhelm(?:et)?\b/i.test(name)) return 'Helm'
  if (/\barmor\b/i.test(name)) return 'Armor'
  if (/\bpants\b/i.test(name)) return 'Pants'
  if (/\bgloves\b/i.test(name)) return 'Gloves'
  if (/\bboots\b/i.test(name)) return 'Boots'
  if (/\bshield\b/i.test(name)) return 'Shield'
  if (/\bring\b/i.test(name)) return 'Ring'
  if (/\bpendant\b/i.test(name)) return 'Pendant'
  if (/\b(sword|blade|axe|mace|bow|crossbow|staff|stick|scepter|spear|lance|claw|book|orb|rune|gun|star)\b/i.test(name)) return 'Weapon'

  return 'Item'
}
const selectedAncientDetailParts = computed(() =>
  setQuality.value === 'ancient' || setQuality.value === 'masteryAncient'
    ? selectedAncientSetItem.value?.detailParts || selectedAncientSetItem.value?.parts || []
    : []
)
const statAtBlessing = (stats: GuideEquipmentItem['levelStats'] | undefined) =>
  stats?.find((item) => item.itemLevel === blessingLevel.value) || stats?.find((item) => item.itemLevel === 0) || stats?.[0] || null

const selectedSetPiecesWithData = computed(() => {
  const usedAncientParts = new Set<string>()
  const mainPieces = setModalPieces.map((piece, index) => {
    const lookupName = guideSetLookupName(selectedSet.value)
    const guideItem = selectedSet.value
      ? selectedGuideSetItems.value.find((item) => item.category === piece.guideCategory && item.name === lookupName)
      : null
    const ancientPart = selectedAncientDetailParts.value.find((candidate) =>
      piece.aliases.some((alias) => ancientPartCategory(candidate.name) === alias)
    )
    if (ancientPart) {
      usedAncientParts.add(ancientPart.name)
    }
    const guideLevelStats = guideItem?.levelStats.find((item) => item.itemLevel === blessingLevel.value)
    const ancientLevelStats = statAtBlessing(ancientPart?.levelStats)
    const assetPiece = selectedSet.value?.pieceCards.find((candidate) =>
      piece.aliases.some((alias) => candidate.label.toLowerCase().includes(alias.toLowerCase()) || candidate.title.toLowerCase().includes(alias.toLowerCase()))
    )
    const referencePiece = selectedAncientReference.value?.pieces?.find((candidate) =>
      piece.aliases.some((alias) => candidate.name.toLowerCase().includes(alias.toLowerCase()))
    )
    const guideDefense = ancientLevelStats?.defense ?? (setQuality.value === 'excellent'
      ? guideLevelStats?.excellentDefense ?? guideLevelStats?.defense
      : guideLevelStats?.defense)
    const guideStrength = ancientLevelStats?.requiredStrength ?? (setQuality.value === 'excellent'
      ? guideLevelStats?.excellentRequiredStrength ?? guideLevelStats?.requiredStrength
      : guideLevelStats?.requiredStrength)
    const guideAgility = ancientLevelStats?.requiredAgility ?? (setQuality.value === 'excellent'
      ? guideLevelStats?.excellentRequiredAgility ?? guideLevelStats?.requiredAgility
      : guideLevelStats?.requiredAgility)
    const defense = guideDefense ?? referencePiece?.defense ?? fallbackPieceDefense(index + 1)
    const hasMovementLine = blessingLevel.value > 0 && ['boots', 'gloves'].includes(piece.key)
    const speedLabel = hasMovementLine
      ? piece.key === 'boots'
        ? 'Running speed increase'
        : 'Swimming speed increase'
      : ''
    const speedValue = hasMovementLine ? 'se blessado/refinado' : ''
    const baseTitle = ancientPart?.name || guideItem?.title || assetPiece?.title || referencePiece?.name || `${selectedSet.value?.name || 'Set'} ${piece.label}`
    const displayTitle = setQuality.value === 'excellent' && !/^excellent\s/i.test(baseTitle)
      ? `Excellent ${baseTitle}`
      : baseTitle
    const requiredStrength = guideStrength ?? referencePiece?.requirements?.strength
    const requiredAgility = guideAgility ?? referencePiece?.requirements?.agility
    const durability = ancientLevelStats?.durability ?? guideLevelStats?.durability ?? Math.max(30, 60 + (selectedSet.value?.tier === 1000 ? 1 : selectedSet.value?.tier || 1))
    const requiredLevel = guideItem?.listStats.requiredLevel
    const usableBy = selectedSetUsableByClasses.value

    return {
      ...piece,
      title: baseTitle,
      displayTitle,
      image: ancientPart?.image.publicPath || ancientPart?.image.sourceUrl || assetPiece?.image || guideItem?.image.publicPath || guideItem?.image.sourceUrl,
      defense,
      defenseLabel: piece.key === 'armor' ? 'Armor' : 'Defense',
      speedLabel,
      speedValue,
      durability,
      requiredLevel,
      requiredStrength,
      requiredAgility,
      usableBy
    }
  })
  const extraPieces = selectedAncientDetailParts.value
    .filter((part) => !usedAncientParts.has(part.name))
    .map((part, index) => {
      const stat = statAtBlessing(part.levelStats)
      const category = ancientPartCategory(part.name)

      return {
        key: `ancient-extra-${slugify(part.name)}-${index}`,
        label: category,
        guideCategory: category,
        aliases: [category],
        title: part.name,
        displayTitle: part.name,
        image: part.image.publicPath || part.image.sourceUrl,
        defense: stat?.damageMax ?? stat?.defense ?? '-',
        defenseLabel: stat?.damageMax ? 'Damage max' : category === 'Shield' ? 'Defense' : 'Info',
        speedLabel: '',
        speedValue: '',
        durability: stat?.durability ?? '-',
        requiredLevel: undefined,
        requiredStrength: stat?.requiredStrength ?? '-',
        requiredAgility: stat?.requiredAgility ?? '-',
        usableBy: selectedSetUsableByClasses.value
      }
    })

  return [...mainPieces, ...extraPieces]
})

const selectedSetDefense = computed(() => {
  const lookupName = guideSetLookupName(selectedSet.value)
  const defensivePieces = selectedSetPiecesWithData.value.filter((piece) =>
    ['helm', 'armor', 'pants', 'gloves', 'boots'].includes(piece.key) || ['Helm', 'Armor', 'Pants', 'Gloves', 'Boots', 'Shield'].includes(piece.label)
  )
  const total = defensivePieces.reduce((sum, piece) => sum + (typeof piece.defense === 'number' ? piece.defense : 0), 0)
  const base = selectedSet.value
    ? setModalPieces.reduce((sum, piece, index) => sum + guideDefenseAtLevel(piece.guideCategory, lookupName, 0, index + 1), 0)
    : total
  const bonus = Math.max(0, total - base)

  return {
    base,
    bonus,
    total
  }
})

const openSetModal = async (set: SetCard) => {
  const loadId = selectedGuideLoadId.value + 1
  selectedGuideLoadId.value = loadId
  selectedSet.value = set
  selectedGuideSetItems.value = []
  selectedAncientSetItem.value = null
  const filteredQuality = setTypeFilter.value === 'Default'
    ? undefined
    : setQualityFromType(setTypeFilter.value)
  setQuality.value = filteredQuality && selectedAvailableQualities.value.includes(filteredQuality)
    ? filteredQuality
    : selectedAvailableQualities.value[0] || 'normal'
  blessingLevel.value = 0
  const ancientSummary = selectedAncientCatalogItem.value
  const [items, ancientItem] = await Promise.all([
    loadGuideSetItems(set.guideName || set.name),
    ancientSummary ? findMuEquipmentItem(ancientSummary.category, ancientSummary.name) : Promise.resolve(null)
  ])

  if (selectedGuideLoadId.value === loadId && selectedSet.value?.key === set.key) {
    selectedGuideSetItems.value = items
    selectedAncientSetItem.value = ancientItem
  }
}

const closeSetModal = () => {
  selectedGuideLoadId.value += 1
  selectedSet.value = null
  selectedGuideSetItems.value = []
  selectedAncientSetItem.value = null
}

const openEquipmentItemModal = async (item: GuideEquipmentSummary) => {
  const loadId = selectedEquipmentLoadId.value + 1
  selectedEquipmentLoadId.value = loadId
  selectedEquipmentSummary.value = item
  selectedEquipmentItem.value = null
  selectedEquipmentQuality.value = 'normal'
  selectedEquipmentBlessingLevel.value = 0
  const detail = await findMuEquipmentItem(item.category, item.name)

  if (selectedEquipmentLoadId.value === loadId && selectedEquipmentSummary.value?.key === item.key) {
    selectedEquipmentItem.value = detail
  }
}

const closeEquipmentItemModal = () => {
  selectedEquipmentLoadId.value += 1
  selectedEquipmentSummary.value = null
  selectedEquipmentItem.value = null
  selectedEquipmentQuality.value = 'normal'
  selectedEquipmentBlessingLevel.value = 0
}

let setCardsLoadId = 0

const loadSetCardsFromApi = async () => {
  const loadId = ++setCardsLoadId
  setCardsLoading.value = true
  setCardsError.value = ''

  try {
    const pageSize = 120
    const firstPage = await wikiApi.equipmentSets({
      season: wikiSeason.value,
      page: 1,
      pageSize
    }) as WikiPaginatedResponse<SetCard>
    const restPages = firstPage.totalPages > 1
      ? await Promise.all(Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
          wikiApi.equipmentSets({
            season: wikiSeason.value,
            page: index + 2,
            pageSize
          }) as Promise<WikiPaginatedResponse<SetCard>>
        ))
      : []
    const missing = await wikiApi.equipmentMissingReferences({
      season: wikiSeason.value
    }) as { totals: SetMissingTotals }

    if (loadId !== setCardsLoadId) {
      return
    }

    apiSetCards.value = [firstPage, ...restPages]
      .flatMap((page) => page.data)
      .map((set) => {
        const isSocket = set.setTypes.includes('Socket') || set.availableQualities.includes('socket')

        return {
          ...set,
          availableQualities: isSocket ? ['socket'] : sortQualities(set.availableQualities),
          setTypes: isSocket ? ['Socket'] : sortSetTypes(set.setTypes),
          searchText: set.searchText || [
            set.name,
            set.guideName,
            set.category,
            set.characterName,
            ...set.evolutions,
            ...set.setTypes,
            ...set.pieces,
            ...(set.dbSetOptions || [])
          ].join(' ').toLowerCase()
        }
      })
    setCardsMissingTotals.value = missing.totals
  } catch (error) {
    if (loadId !== setCardsLoadId) {
      return
    }

    console.error(error)
    setCardsError.value = 'Nao foi possivel carregar os sets do banco de dados.'
    apiSetCards.value = []
    setCardsMissingTotals.value = null
  } finally {
    if (loadId === setCardsLoadId) {
      setCardsLoading.value = false
    }
  }
}

watch(setCharacterFilter, () => {
  setEvolutionFilter.value = 'Default'
  setEquipmentFilter.value = 'Default'
  setCurrentPage.value = 1
})

watch(setEvolutionFilter, () => {
  setEquipmentFilter.value = 'Default'
  setCurrentPage.value = 1
})

watch(setTypeFilter, () => {
  setEquipmentFilter.value = 'Default'
  setCurrentPage.value = 1
})

watch([setEquipmentFilter, setNameSearch], () => {
  setCurrentPage.value = 1
})

watch(wikiSeason, () => {
  setEquipmentFilter.value = 'Default'
  setCurrentPage.value = 1
  equipmentCatalogCurrentPage.value = 1
  void loadSetCardsFromApi()
  if (isKnowledgeTopic.value) {
    knowledgePage.value = 1
    void loadKnowledgeEntries()
  }
})

watch(availableWikiSeasons, (seasons) => {
  if (!seasons.includes(wikiSeason.value)) {
    wikiSeason.value = seasons[0] || 6
  }
})

watch(isWikiAdmin, () => {
  wikiSeason.value = 6
  isWikiSeasonOpen.value = false
}, { immediate: true })

watch(activeTopicKey, () => {
  equipmentCatalogCategoryFilter.value = 'Default'
  equipmentCatalogClassFilter.value = 'Default'
  equipmentCatalogSearch.value = ''
  equipmentCatalogCurrentPage.value = 1
  knowledgeSearch.value = ''
  knowledgeScopeFilter.value = ''
  knowledgePage.value = 1
  if (isKnowledgeTopic.value) {
    void loadKnowledgeEntries()
  }
  closeEquipmentItemModal()
})

watch([knowledgePage, knowledgeScopeFilter], () => {
  if (isKnowledgeTopic.value) {
    void loadKnowledgeEntries()
  }
})

watch(knowledgeSearch, () => {
  knowledgePage.value = 1
  if (isKnowledgeTopic.value) {
    void loadKnowledgeEntries()
  }
})

watch([equipmentCatalogCategoryFilter, equipmentCatalogClassFilter, equipmentCatalogSearch], () => {
  equipmentCatalogCurrentPage.value = 1
})

watch(setTotalPages, (totalPages) => {
  if (setCurrentPage.value > totalPages) {
    setCurrentPage.value = totalPages
  }
})

watch(equipmentCatalogTotalPages, (totalPages) => {
  if (equipmentCatalogCurrentPage.value > totalPages) {
    equipmentCatalogCurrentPage.value = totalPages
  }
})

watch(selectedAvailableQualities, (qualities) => {
  if (qualities.length && !qualities.includes(setQuality.value)) {
    setQuality.value = qualities[0]
  }
})

watch(selectedEquipmentAvailableQualities, (qualities) => {
  if (qualities.length && !qualities.includes(selectedEquipmentQuality.value)) {
    selectedEquipmentQuality.value = qualities[0]
  }
})

onMounted(() => {
  if (window.innerWidth < 1024) {
    isWikiAsideCollapsed.value = true
  }
  loadSession()
  void loadSetCardsFromApi()
  void ensureWikiStaticData()
  void loadWikiCharacters()
  void loadCharacterKnowledgePool()
  fairyElfStyleTimer = setInterval(() => {
    activeFairyElfStyleIndex.value = (activeFairyElfStyleIndex.value + 1) % fairyElfProfile.styles.length
  }, 5000)
})

onBeforeUnmount(() => {
  if (fairyElfStyleTimer) {
    clearInterval(fairyElfStyleTimer)
  }
})

watch(navigationSections, (sections) => {
  const validKeys = sections.map((section) => section.key)
  openSections.value = openSections.value.filter((key) => validKeys.includes(key))

  if (activeSectionKey.value && !validKeys.includes(activeSectionKey.value)) {
    activeSectionKey.value = ''
    activeTopicKey.value = ''
  }
}, { immediate: true })

const selectSection = (sectionKey: string) => {
  if (isWikiAsideCollapsed.value) {
    isWikiAsideCollapsed.value = false
    activeSectionKey.value = sectionKey
    activeTopicKey.value = ''
    openSections.value = [sectionKey]
    return
  }

  activeSectionKey.value = sectionKey
  activeTopicKey.value = ''
  openSections.value = openSections.value.includes(sectionKey)
    ? []
    : [sectionKey]
}

const selectTopic = (sectionKey: string, topicKey: string) => {
  const section = navigationSections.value.find((item) => item.key === sectionKey)
  const topic = section?.topics.find((item) => item.key === topicKey)
  if (!topic || topic.disabled) {
    return
  }

  activeSectionKey.value = sectionKey
  activeTopicKey.value = topicKey
  openSections.value = [sectionKey]

  if (sectionKey === 'personagens') {
    isWikiAsideCollapsed.value = true
  }
}

function linksForCategory (category: WikiCategory): WikiTopic[] {
  return category.links.map((label) => ({
    key: slugify(label),
    label,
    disabled: false
  }))
}

function slugify (value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
</script>

<style scoped>
.wiki-hero{position:relative;min-height:330px;overflow:hidden;border-bottom:1px solid #d5ccc4}.wiki-hero-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:right 34%;filter:grayscale(.55) sepia(.45);opacity:.25}.wiki-hero-overlay{position:absolute;inset:0;background:linear-gradient(90deg,#f3f0ea 0%,rgba(243,240,234,.93) 58%,rgba(243,240,234,.52) 100%)}.wiki-hero-content{position:relative;z-index:1;display:flex;min-height:330px;flex-direction:column;justify-content:center;padding-block:42px}.wiki-hero-content>p{display:flex;align-items:center;gap:7px;color:#73090b;font-size:9px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}.wiki-hero-content h1{margin-top:8px;color:#171313;font-size:38px;font-weight:500;text-transform:uppercase}.wiki-hero-content h1 span{color:#73090b}.wiki-hero-content small{margin-top:7px;color:#645d58;font-size:11px}.wiki-search{display:flex;width:min(100%,680px);height:43px;align-items:center;gap:9px;margin-top:20px;border:1px solid #d3cac1;background:rgba(255,255,255,.82);padding:0 14px;color:#7d716b}.wiki-search input{min-width:0;flex:1;background:transparent;font-size:11px}.wiki-popular{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:12px}.wiki-popular strong{margin-right:4px;color:#73090b;font-size:8px;text-transform:uppercase}.wiki-popular button{border:1px solid #cabfb6;background:rgba(255,255,255,.65);padding:4px 8px;color:#5e534d;font-size:8px}.wiki-popular button:hover{border-color:#73090b;color:#73090b}.wiki-shell{padding-block:34px 60px}.wiki-shell-landing{display:block}.wiki-landing-panel{background:transparent}.wiki-landing{max-width:1080px;min-height:420px;margin-inline:auto}.wiki-landing>header{text-align:center}.wiki-landing>header p{color:#73090b;font-size:9px;font-weight:900;letter-spacing:.13em;text-transform:uppercase}.wiki-landing>header h2{margin-top:5px;color:#3c1717;font-size:24px;font-weight:800;text-transform:uppercase}.wiki-landing>header span{display:block;width:5px;height:5px;margin:9px auto 0;transform:rotate(45deg);background:#73090b}.wiki-category-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:26px}.wiki-category-card{position:relative;display:grid;min-height:104px;grid-template-columns:68px minmax(0,1fr) 18px;align-items:center;gap:13px;border:1px solid #cfc4ba;background:rgba(255,255,255,.5);padding:15px 18px;text-align:left;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}.wiki-category-card:before,.wiki-category-card:after{position:absolute;width:11px;height:11px;content:''}.wiki-category-card:before{left:-1px;top:-1px;border-left:2px solid #73090b;border-top:2px solid #73090b}.wiki-category-card:after{right:-1px;bottom:-1px;border-right:2px solid #73090b;border-bottom:2px solid #73090b}.wiki-category-card:hover{transform:translateY(-2px);border-color:#a78e83;box-shadow:0 9px 20px rgba(84,8,9,.09)}.wiki-category-icon{display:grid;width:58px;height:58px;place-items:center;border-right:1px solid #d6cdc5;color:#73090b}.wiki-category-icon svg{width:34px;height:34px;stroke-width:1.25}.wiki-category-card strong{display:block;color:#5a1114;font-family:Cinzel,serif;font-size:13px;text-transform:uppercase}.wiki-category-card small{display:block;margin-top:5px;color:#796e68;font-size:9px;line-height:1.4}.wiki-category-arrow{color:#947c72}.wiki-lower-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:28px}.wiki-list-panel{position:relative;border:1px solid #cfc4ba;background:rgba(255,255,255,.45);padding:18px 22px 14px}.wiki-list-panel h3{padding-bottom:12px;border-bottom:1px solid #d9d0c8;color:#5b1114;font-family:Cinzel,serif;font-size:14px;text-transform:uppercase}.wiki-list-panel button,.wiki-list-panel article{display:grid;width:100%;min-height:40px;grid-template-columns:30px 1fr auto;align-items:center;gap:9px;border-bottom:1px solid #e0d8d0;text-align:left}.wiki-list-panel button:hover strong{color:#73090b}.wiki-topic-thumb,.wiki-list-panel article>span{display:grid;width:24px;height:24px;place-items:center;background:#ebe4dd;color:#73090b}.wiki-list-panel strong{font-size:9px}.wiki-list-panel time{color:#897c75;font-size:8px}.wiki-list-panel>a{display:block;margin-top:12px;color:#73090b;font-size:8px;font-weight:900;text-align:center;text-transform:uppercase}.wiki-list-panel:before,.wiki-list-panel:after{position:absolute;width:12px;height:12px;content:''}.wiki-list-panel:before{left:-1px;top:-1px;border-left:2px solid #73090b;border-top:2px solid #73090b}.wiki-list-panel:after{right:-1px;bottom:-1px;border-right:2px solid #73090b;border-bottom:2px solid #73090b}
.bm-style-card-enter-active,
.bm-style-card-leave-active {
  transition: opacity 260ms ease, transform 260ms ease;
}

.bm-style-card-enter-from {
  opacity: 0;
  transform: translateX(14px);
}

.bm-style-card-leave-to {
  opacity: 0;
  transform: translateX(-14px);
}

.bm-style-copy-enter-active,
.bm-style-copy-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.bm-style-copy-enter-from,
.bm-style-copy-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
@media (max-width: 1023px) {
  .wiki-hero,.wiki-hero-content{min-height:300px}
  .wiki-category-grid{grid-template-columns:repeat(2,1fr)}
  .is-wiki-collapsed { min-height: 56px; }
  .is-wiki-collapsed nav { display: none; }
}
@media (max-width: 767px) {
  .wiki-hero,.wiki-hero-content{min-height:285px}.wiki-hero-content h1{font-size:29px}.wiki-category-grid,.wiki-lower-grid{grid-template-columns:1fr}.wiki-category-card{min-height:92px;grid-template-columns:58px 1fr 16px;padding:12px}.wiki-category-icon{width:48px;height:48px}.wiki-category-icon svg{width:28px;height:28px}.wiki-shell{padding-block:26px 44px}
}
</style>

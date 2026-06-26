type LocaleCode = 'pt-BR' | 'pt-PT' | 'es-ES' | 'en-US' | 'en-GB' | 'fr-FR' | 'de-DE' | 'it-IT'

type LocaleDictionary = {
  common: Record<string, string>
  nav: Array<{ label: string; to: string }>
  stats: Array<{ label: string; value: string }>
  news: Array<{ tag: string; title: string; date: string; excerpt: string }>
  guideCategories: Array<{ title: string; description: string; links: string[] }>
  rankingTypes: string[]
}

export const localeOptions: Array<{ code: LocaleCode; label: string; short: string }> = [
  { code: 'pt-BR', label: 'Português Brasil', short: 'PT-BR' },
  { code: 'pt-PT', label: 'Português Portugal', short: 'PT-PT' },
  { code: 'es-ES', label: 'Español', short: 'ES' },
  { code: 'en-US', label: 'English United States', short: 'EN-US' },
  { code: 'en-GB', label: 'English United Kingdom', short: 'EN-GB' },
  { code: 'fr-FR', label: 'Français', short: 'FR' },
  { code: 'de-DE', label: 'Deutsch', short: 'DE' },
  { code: 'it-IT', label: 'Italiano', short: 'IT' }
]

const baseRankingRows = [
  { pos: 1, name: 'Arkhon', class: 'Blade Master', score: '182 Resets', guild: 'Eclipse' },
  { pos: 2, name: 'Nyxara', class: 'Grand Master', score: '174 Resets', guild: 'Blood Pact' },
  { pos: 3, name: 'Velkan', class: 'Duel Master', score: '168 Resets', guild: 'Noctis' },
  { pos: 4, name: 'Seraph', class: 'High Elf', score: '159 Resets', guild: 'Moonfall' },
  { pos: 5, name: 'Kael', class: 'Lord Emperor', score: '151 Resets', guild: 'Abyssal' }
]

const nav = {
  pt: [
    { label: 'Notícias', to: '/noticias' },
    { label: 'Downloads', to: '/downloads' },
    { label: 'Rankings', to: '/rankings' },
    { label: 'Wiki', to: '/wiki' },
    { label: 'About', to: '/about' }
  ],
  es: [
    { label: 'Noticias', to: '/noticias' },
    { label: 'Descargas', to: '/downloads' },
    { label: 'Rankings', to: '/rankings' },
    { label: 'Wiki', to: '/wiki' },
    { label: 'Acerca de', to: '/about' }
  ],
  en: [
    { label: 'News', to: '/noticias' },
    { label: 'Downloads', to: '/downloads' },
    { label: 'Rankings', to: '/rankings' },
    { label: 'Wiki', to: '/wiki' },
    { label: 'About', to: '/about' }
  ],
  fr: [
    { label: 'Actualités', to: '/noticias' },
    { label: 'Téléchargements', to: '/downloads' },
    { label: 'Classements', to: '/rankings' },
    { label: 'Wiki', to: '/wiki' },
    { label: 'À propos', to: '/about' }
  ],
  de: [
    { label: 'Neuigkeiten', to: '/noticias' },
    { label: 'Downloads', to: '/downloads' },
    { label: 'Ranglisten', to: '/rankings' },
    { label: 'Wiki', to: '/wiki' },
    { label: 'Über uns', to: '/about' }
  ],
  it: [
    { label: 'Notizie', to: '/noticias' },
    { label: 'Download', to: '/downloads' },
    { label: 'Classifiche', to: '/rankings' },
    { label: 'Wiki', to: '/wiki' },
    { label: 'Info', to: '/about' }
  ]
}
const characterLinksByRelease = [
  'Dark Knight',
  'Dark Wizard',
  'Fairy Elf',
  'Magic Gladiator',
  'Dark Lord',
  'Summoner',
  'Rage Fighter',
  'Grow Lancer',
  'Rune Mage',
  'Slayer',
  'Gun Crusher',
  'White Wizard',
  'Mage'
]
const ptCommon = {
  login: 'Login',
  register: 'Registrar',
  darkMode: 'Modo escuro',
  lightMode: 'Modo claro',
  language: 'Idioma',
  previousSlide: 'Slide anterior',
  nextSlide: 'Próximo slide',
  heroKicker: 'Servidor Mu Online Premium',
  heroTitle: 'Blood Moon',
  heroDescription:
    'Uma experiência dark fantasy com progressão equilibrada, eventos constantes, rankings competitivos e guias completos para dominar a temporada.',
  createAccount: 'Criar conta',
  downloadClient: 'Baixar cliente',
  eventKicker: 'Evento especial',
  eventTitle: 'Noite da Lua Rubra',
  eventDescription: 'Criaturas raras surgem em Noria, Lorencia e Devias com drops temporários, bônus de experiência e recompensas para guilds.',
  viewNews: 'Ver notícias',
  eventGuides: 'Guias do evento',
  rankingKicker: 'Temporada competitiva',
  rankingTitle: 'Rankings em Disputa',
  rankingDescription: 'Acompanhe resets, PvP, guilds e eventos em uma temporada preparada para futuras integrações em tempo real.',
  viewRankings: 'Ver rankings',
  knowServer: 'Conhecer servidor',
  latestNews: 'Últimas notícias',
  followSeason: 'Acompanhe a temporada',
  topReset: 'Top reset',
  hall: 'Hall da Lua',
  guideLibrary: 'Biblioteca Blood Moon',
  modularContent: 'Conteúdo modular pronto para evolução com dados reais.',
  footerText: 'Portal oficial fictício do Blood Moon, preparado para notícias, rankings, guias e integrações futuras.',
  navigation: 'Navegação',
  social: 'Social',
  server: 'Servidor',
  contact: 'Contato',
  copyright: '© 2026 Blood Moon. Projeto demonstrativo para servidor Mu Online.'
  ,
  downloadsKicker: 'Instalação',
  downloadsDescription: 'Cliente completo, patch, launcher e ferramentas extras com requisitos preparados para publicação oficial.',
  requirements: 'Requisitos',
  minimum: 'Mínimos',
  recommended: 'Recomendados',
  fullClient: 'Cliente completo',
  fullClientDescription: 'Pacote completo para novos jogadores iniciarem sem atualizações adicionais.',
  updatePatch: 'Patch de Atualização',
  updatePatchDescription: 'Correções e arquivos recentes para manter o cliente sincronizado.',
  officialLauncher: 'Launcher Oficial',
  officialLauncherDescription: 'Inicializador com verificação automática e notícias do servidor.',
  playerExtras: 'Extras do Jogador',
  playerExtrasDescription: 'Utilitários visuais e arquivos opcionais para suporte.',
  access: 'Acesso',
  emailOrUser: 'E-mail ou usuário',
  password: 'Senha',
  enter: 'Entrar',
  newAccount: 'Nova conta',
  user: 'Usuário',
  confirmPassword: 'Confirmar senha',
  rankingsKicker: 'Competição',
  rankingsDescription: 'Visualização principal dos rankings. Por padrão, o portal abre o Ranking de Reset.',
  rankingOf: 'Ranking de'
}

const dictionaries: Record<LocaleCode, LocaleDictionary> = {
  'pt-BR': {
    common: ptCommon,
    nav: nav.pt,
    rankingTypes: ['Level', 'Reset', 'Master Reset', 'PvP', 'Guilds', 'Eventos'],
    stats: [
      { label: 'XP', value: '999x' },
      { label: 'Drop', value: '80%' },
      { label: 'Reset', value: 'Habilitado' },
      { label: 'Master Reset', value: 'Habilitado' },
      { label: 'Castle Siege', value: 'Ativo' },
      { label: 'Eventos', value: 'Automáticos' }
    ],
    news: [
      {
        tag: 'Evento',
        title: 'A Noite da Lua Rubra começa neste sábado',
        date: '04 Jun 2026',
        excerpt: 'Monstros especiais invadem mapas clássicos com drops temporários e bônus de experiência.'
      },
      {
        tag: 'Atualização',
        title: 'Balanceamento inicial das classes liberado',
        date: '02 Jun 2026',
        excerpt: 'Ajustes fictícios em dano, defesa e progressão deixam o começo da temporada mais competitivo.'
      },
      {
        tag: 'Manutenção',
        title: 'Janela técnica semanal confirmada',
        date: '31 Mai 2026',
        excerpt: 'Serviços internos serão revisados para preparar futuras integrações com rankings e painel.'
      }
    ],
    guideCategories: [
      { title: 'Personagens', description: 'Classes, histórias, pontos fortes e builds.', links: characterLinksByRelease },
      { title: 'Equipamentos', description: 'Sets, armas, escudos, asas, acessorios e itens especiais.', links: ['Sets', 'Armas e Escudos', 'Asas e Capas', 'Acessorios', 'Pets e Mounts', 'Consumiveis', 'Jewels', 'Itens Excellent', 'Itens Ancient', 'Itens Socket'] },
      { title: 'Fórmulas', description: 'Status, experiência e taxas do servidor.', links: ['Status de Personagens', 'Experiência', 'Taxas do Servidor'] },
      { title: 'Builds', description: 'Rotas de progressão para PvP, PvM e eventos.', links: ['PvP', 'PvM', 'Boss', 'Eventos'] },
      { title: 'Chaos Machine', description: 'Combinações, materiais, taxas e dicas.', links: ['Chaos Weapon Mix', 'Wing Mix', 'Socket Mix', 'Jewel Mix', 'Eventos de Mix'] },
      { title: 'Mapas e PvM', description: 'Mapas, spots de up, monstros, bosses e drops.', links: ['Mapas', 'Spots de Up', 'Monstros', 'Bosses', 'Drops'] },
      { title: 'Eventos', description: 'Eventos, recompensas, regras e horarios.', links: ['Blood Castle', 'Devil Square', 'Chaos Castle', 'Castle Siege', 'Crywolf', 'Outros Eventos'] },
      { title: 'Quests e NPCs', description: 'Quests, NPCs, tutoriais e primeiros passos.', links: ['Quests', 'NPCs', 'Como jogar', 'Primeiros passos'] }
    ]
  },
  'pt-PT': {
    common: { ...ptCommon, register: 'Registar', createAccount: 'Criar conta', footerText: 'Portal oficial fictício do Blood Moon, preparado para notícias, rankings, guias e integrações futuras.' },
    nav: nav.pt,
    rankingTypes: ['Level', 'Reset', 'Master Reset', 'PvP', 'Guilds', 'Eventos'],
    stats: [
      { label: 'XP', value: '999x' },
      { label: 'Drop', value: '80%' },
      { label: 'Reset', value: 'Ativado' },
      { label: 'Master Reset', value: 'Ativado' },
      { label: 'Castle Siege', value: 'Ativo' },
      { label: 'Eventos', value: 'Automáticos' }
    ],
    news: [
      {
        tag: 'Evento',
        title: 'A Noite da Lua Rubra começa neste sábado',
        date: '04 Jun 2026',
        excerpt: 'Monstros especiais invadem mapas clássicos com drops temporários e bónus de experiência.'
      },
      {
        tag: 'Atualização',
        title: 'Balanceamento inicial das classes libertado',
        date: '02 Jun 2026',
        excerpt: 'Ajustes fictícios em dano, defesa e progressão tornam o início da temporada mais competitivo.'
      },
      {
        tag: 'Manutenção',
        title: 'Janela técnica semanal confirmada',
        date: '31 Mai 2026',
        excerpt: 'Serviços internos serão revistos para preparar futuras integrações com rankings e painel.'
      }
    ],
    guideCategories: [
      { title: 'Personagens', description: 'Classes, histórias, pontos fortes e builds.', links: characterLinksByRelease },
      { title: 'Equipamentos', description: 'Sets, armas, escudos, asas, acessorios e itens especiais.', links: ['Sets', 'Armas e Escudos', 'Asas e Capas', 'Acessorios', 'Pets e Mounts', 'Consumiveis', 'Jewels', 'Itens Excellent', 'Itens Ancient', 'Itens Socket'] },
      { title: 'Fórmulas', description: 'Status, experiência e taxas do servidor.', links: ['Status de Personagens', 'Experiência', 'Taxas do Servidor'] },
      { title: 'Builds', description: 'Rotas de progressão para PvP, PvM e eventos.', links: ['PvP', 'PvM', 'Boss', 'Eventos'] },
      { title: 'Chaos Machine', description: 'Combinações, materiais, taxas e dicas.', links: ['Chaos Weapon Mix', 'Wing Mix', 'Socket Mix', 'Jewel Mix', 'Eventos de Mix'] },
      { title: 'Mapas e PvM', description: 'Mapas, spots de up, monstros, bosses e drops.', links: ['Mapas', 'Spots de Up', 'Monstros', 'Bosses', 'Drops'] },
      { title: 'Eventos', description: 'Eventos, recompensas, regras e horarios.', links: ['Blood Castle', 'Devil Square', 'Chaos Castle', 'Castle Siege', 'Crywolf', 'Outros Eventos'] },
      { title: 'Quests e NPCs', description: 'Quests, NPCs, tutoriais e primeiros passos.', links: ['Quests', 'NPCs', 'Como jogar', 'Primeiros passos'] }
    ]
  },
  'es-ES': {
    common: {
      login: 'Iniciar sesión',
      register: 'Registrarse',
      darkMode: 'Modo oscuro',
      lightMode: 'Modo claro',
      language: 'Idioma',
      previousSlide: 'Slide anterior',
      nextSlide: 'Siguiente slide',
      heroKicker: 'Servidor Mu Online Premium',
      heroTitle: 'Blood Moon',
      heroDescription: 'Una experiencia dark fantasy con progresión equilibrada, eventos constantes, rankings competitivos y guías completas para dominar la temporada.',
      createAccount: 'Crear cuenta',
      downloadClient: 'Descargar cliente',
      eventKicker: 'Evento especial',
      eventTitle: 'Noche de la Luna Rubra',
      eventDescription: 'Criaturas raras aparecen en Noria, Lorencia y Devias con drops temporales, bonus de experiencia y recompensas para clanes.',
      viewNews: 'Ver noticias',
      eventGuides: 'Guías del evento',
      rankingKicker: 'Temporada competitiva',
      rankingTitle: 'Rankings en disputa',
      rankingDescription: 'Sigue resets, PvP, clanes y eventos en una temporada preparada para futuras integraciones en tiempo real.',
      viewRankings: 'Ver rankings',
      knowServer: 'Conocer servidor',
      latestNews: 'Últimas noticias',
      followSeason: 'Sigue la temporada',
      topReset: 'Top reset',
      hall: 'Salón de la Luna',
      guideLibrary: 'Biblioteca Blood Moon',
      modularContent: 'Contenido modular listo para evolucionar con datos reales.',
      footerText: 'Portal oficial ficticio de Blood Moon, preparado para noticias, rankings, guías e integraciones futuras.',
      navigation: 'Navegación',
      social: 'Social',
      server: 'Servidor',
      contact: 'Contacto',
      copyright: '© 2026 Blood Moon. Proyecto demostrativo para servidor Mu Online.'
    },
    nav: nav.es,
    rankingTypes: ['Nivel', 'Reset', 'Master Reset', 'PvP', 'Clanes', 'Eventos'],
    stats: [
      { label: 'XP', value: '999x' },
      { label: 'Drop', value: '80%' },
      { label: 'Reset', value: 'Activado' },
      { label: 'Master Reset', value: 'Activado' },
      { label: 'Castle Siege', value: 'Activo' },
      { label: 'Eventos', value: 'Automáticos' }
    ],
    news: [
      { tag: 'Evento', title: 'La Noche de la Luna Rubra empieza este sábado', date: '04 Jun 2026', excerpt: 'Monstruos especiales invaden mapas clásicos con drops temporales y bonus de experiencia.' },
      { tag: 'Actualización', title: 'Balance inicial de clases liberado', date: '02 Jun 2026', excerpt: 'Ajustes ficticios de daño, defensa y progresión hacen más competitivo el inicio de temporada.' },
      { tag: 'Mantenimiento', title: 'Ventana técnica semanal confirmada', date: '31 May 2026', excerpt: 'Servicios internos serán revisados para preparar futuras integraciones con rankings y panel.' }
    ],
    guideCategories: [
      { title: 'Personajes', description: 'Clases, historias, fortalezas y builds.', links: characterLinksByRelease },
      { title: 'Equipamiento', description: 'Sets, armas, escudos, alas, accesorios e items especiales.', links: ['Sets', 'Armas y Escudos', 'Alas y Capas', 'Accesorios', 'Pets y Mounts', 'Consumibles', 'Jewels', 'Items Excellent', 'Items Ancient', 'Items Socket'] },
      { title: 'Fórmulas', description: 'Status, experiencia y tasas del servidor.', links: ['Status de Personajes', 'Experiencia', 'Tasas del Servidor'] },
      { title: 'Builds', description: 'Rutas de progresión para PvP, PvM y eventos.', links: ['PvP', 'PvM', 'Boss', 'Eventos'] },
      { title: 'Chaos Machine', description: 'Combinaciones, materiales, tasas y consejos.', links: ['Chaos Weapon Mix', 'Wing Mix', 'Socket Mix', 'Jewel Mix', 'Eventos de Mix'] },
      { title: 'Mapas y PvM', description: 'Mapas, spots, monstruos, bosses y drops.', links: ['Mapas', 'Spots de Level', 'Monstruos', 'Bosses', 'Drops'] },
      { title: 'Eventos', description: 'Eventos, recompensas, reglas y horarios.', links: ['Blood Castle', 'Devil Square', 'Chaos Castle', 'Castle Siege', 'Crywolf', 'Otros Eventos'] },
      { title: 'Quests y NPCs', description: 'Quests, NPCs, tutoriales y primeros pasos.', links: ['Quests', 'NPCs', 'Como jugar', 'Primeros pasos'] }
    ]
  },
  'en-US': makeEnglish('US'),
  'en-GB': makeEnglish('UK'),
  'fr-FR': makeEuropean('fr'),
  'de-DE': makeEuropean('de'),
  'it-IT': makeEuropean('it')
}

function makeEnglish(region: 'US' | 'UK'): LocaleDictionary {
  return {
    common: {
      login: 'Login',
      register: 'Register',
      darkMode: 'Dark mode',
      lightMode: 'Light mode',
      language: 'Language',
      previousSlide: 'Previous slide',
      nextSlide: 'Next slide',
      heroKicker: 'Premium Mu Online Server',
      heroTitle: 'Blood Moon',
      heroDescription: 'A dark fantasy experience with balanced progression, constant events, competitive rankings, and complete guides to master the season.',
      createAccount: 'Create account',
      downloadClient: 'Download client',
      eventKicker: 'Special event',
      eventTitle: 'Night of the Crimson Moon',
      eventDescription: 'Rare creatures appear in Noria, Lorencia, and Devias with temporary drops, experience bonuses, and guild rewards.',
      viewNews: 'View news',
      eventGuides: 'Event guides',
      rankingKicker: 'Competitive season',
      rankingTitle: 'Rankings in Contest',
      rankingDescription: 'Follow resets, PvP, guilds, and events in a season prepared for future real-time integrations.',
      viewRankings: 'View rankings',
      knowServer: 'Discover server',
      latestNews: 'Latest news',
      followSeason: 'Follow the season',
      topReset: 'Top reset',
      hall: 'Moon Hall',
      guideLibrary: 'Blood Moon Library',
      modularContent: 'Modular content ready to evolve with real data.',
      footerText: 'Fictional official Blood Moon portal, prepared for news, rankings, guides, and future integrations.',
      navigation: 'Navigation',
      social: 'Social',
      server: 'Server',
      contact: 'Contact',
      copyright: '© 2026 Blood Moon. Demo project for a Mu Online server.'
      ,
      downloadsKicker: 'Installation',
      downloadsDescription: 'Full client, patch, launcher, and extra tools with requirements prepared for official publishing.',
      requirements: 'Requirements',
      minimum: 'Minimum',
      recommended: 'Recommended',
      fullClient: 'Full client',
      fullClientDescription: 'Complete package for new players to start without additional updates.',
      updatePatch: 'Update Patch',
      updatePatchDescription: 'Recent fixes and files to keep the client synchronized.',
      officialLauncher: 'Official Launcher',
      officialLauncherDescription: 'Launcher with automatic verification and server news.',
      playerExtras: 'Player Extras',
      playerExtrasDescription: 'Visual utilities and optional support files.',
      access: 'Access',
      emailOrUser: 'Email or username',
      password: 'Password',
      enter: 'Enter',
      newAccount: 'New account',
      user: 'Username',
      confirmPassword: 'Confirm password',
      rankingsKicker: 'Competition',
      rankingsDescription: 'Main rankings view. By default, the portal opens the Reset Ranking.',
      rankingOf: 'Ranking of'
    },
    nav: nav.en,
    rankingTypes: ['Level', 'Reset', 'Master Reset', 'PvP', 'Guilds', 'Events'],
    stats: [
      { label: 'XP', value: '999x' },
      { label: 'Drop', value: '80%' },
      { label: 'Reset', value: 'Enabled' },
      { label: 'Master Reset', value: 'Enabled' },
      { label: 'Castle Siege', value: 'Active' },
      { label: 'Events', value: 'Automatic' }
    ],
    news: [
      { tag: 'Event', title: 'Night of the Crimson Moon begins this Saturday', date: region === 'US' ? 'Jun 04, 2026' : '04 Jun 2026', excerpt: 'Special monsters invade classic maps with temporary drops and experience bonuses.' },
      { tag: 'Update', title: 'Initial class balancing released', date: region === 'US' ? 'Jun 02, 2026' : '02 Jun 2026', excerpt: 'Fictional damage, defence, and progression adjustments make the season start more competitive.' },
      { tag: 'Maintenance', title: 'Weekly technical window confirmed', date: region === 'US' ? 'May 31, 2026' : '31 May 2026', excerpt: 'Internal services will be reviewed to prepare future integrations with rankings and the player panel.' }
    ],
    guideCategories: [
      { title: 'Characters', description: 'Classes, lore, strengths, and builds.', links: characterLinksByRelease },
      { title: 'Equipment', description: 'Sets, weapons, shields, wings, accessories, and special items.', links: ['Sets', 'Weapons and Shields', 'Wings and Capes', 'Accessories', 'Pets and Mounts', 'Consumables', 'Jewels', 'Excellent Items', 'Ancient Items', 'Socket Items'] },
      { title: 'Formulas', description: 'Character stats, experience, and server rates.', links: ['Character Stats', 'Experience', 'Server Rates'] },
      { title: 'Builds', description: 'Progression routes for PvP, PvM, and events.', links: ['PvP', 'PvM', 'Boss', 'Events'] },
      { title: 'Chaos Machine', description: 'Mixes, materials, rates, and tips.', links: ['Chaos Weapon Mix', 'Wing Mix', 'Socket Mix', 'Jewel Mix', 'Mix Events'] },
      { title: 'Maps and PvM', description: 'Maps, leveling spots, monsters, bosses, and drops.', links: ['Maps', 'Leveling Spots', 'Monsters', 'Bosses', 'Drops'] },
      { title: 'Events', description: 'Events, rewards, rules, and schedules.', links: ['Blood Castle', 'Devil Square', 'Chaos Castle', 'Castle Siege', 'Crywolf', 'Other Events'] },
      { title: 'Quests and NPCs', description: 'Quests, NPCs, tutorials, and first steps.', links: ['Quests', 'NPCs', 'How to Play', 'First Steps'] }
    ]
  }
}

function makeEuropean(locale: 'fr' | 'de' | 'it'): LocaleDictionary {
  const labels = {
    fr: { nav: nav.fr, login: 'Connexion', register: 'Inscription', language: 'Langue', latestNews: 'Dernières actualités', followSeason: 'Suivre la saison', enabled: 'Activé', active: 'Actif', automatic: 'Automatiques', hall: 'Hall de la Lune' },
    de: { nav: nav.de, login: 'Login', register: 'Registrieren', language: 'Sprache', latestNews: 'Neueste Nachrichten', followSeason: 'Saison verfolgen', enabled: 'Aktiviert', active: 'Aktiv', automatic: 'Automatisch', hall: 'Mondhalle' },
    it: { nav: nav.it, login: 'Login', register: 'Registrati', language: 'Lingua', latestNews: 'Ultime notizie', followSeason: 'Segui la stagione', enabled: 'Abilitato', active: 'Attivo', automatic: 'Automatici', hall: 'Sala della Luna' }
  }[locale]

  return {
    common: {
      ...makeEnglish('UK').common,
      login: labels.login,
      register: labels.register,
      language: labels.language,
      latestNews: labels.latestNews,
      followSeason: labels.followSeason,
      hall: labels.hall
    },
    nav: labels.nav,
    rankingTypes: makeEnglish('UK').rankingTypes,
    stats: [
      { label: 'XP', value: '999x' },
      { label: 'Drop', value: '80%' },
      { label: 'Reset', value: labels.enabled },
      { label: 'Master Reset', value: labels.enabled },
      { label: 'Castle Siege', value: labels.active },
      { label: 'Events', value: labels.automatic }
    ],
    news: makeEnglish('UK').news,
    guideCategories: makeEnglish('UK').guideCategories
  }
}

export const useLocale = () => {
  const locale = useState<LocaleCode>('blood-moon-locale', () => 'pt-BR')

  const setLocale = (code: LocaleCode) => {
    locale.value = code
    if (import.meta.client) {
      localStorage.setItem('blood-moon-locale', code)
      document.documentElement.lang = code
    }
  }

  if (import.meta.client) {
    const saved = localStorage.getItem('blood-moon-locale') as LocaleCode | null
    if (saved && localeOptions.some((option) => option.code === saved)) {
      locale.value = saved
      document.documentElement.lang = saved
    }
  }

  const dictionary = computed(() => dictionaries[locale.value] || dictionaries['pt-BR'])
  const t = (key: keyof LocaleDictionary['common']) =>
    dictionary.value.common[key] || dictionaries['en-US'].common[key] || dictionaries['pt-BR'].common[key] || String(key)
  const currentLocale = computed(() => localeOptions.find((option) => option.code === locale.value) || localeOptions[0])

  return {
    locale,
    localeOptions,
    currentLocale,
    setLocale,
    t,
    dictionary,
    rankingRows: baseRankingRows
  }
}

export const mainNav = [
  { label: 'Notícias', to: '/noticias' },
  { label: 'Downloads', to: '/downloads' },
  { label: 'Rankings', to: '/rankings' },
  { label: 'Wiki', to: '/wiki' },
  { label: 'About', to: '/about' }
]

export const rankingTypes = ['Level', 'Reset', 'Master Reset', 'PvP', 'Guilds', 'Eventos']
export const characterLinksByRelease = [
  'Dark Knight',
  'Dark Wizard',
  'Fairy Elf',
  'Magic Gladiator',
  'Dark Lord',
  'Summoner',
  'Rage Fighter'
]

export const guideCategories = [
  {
    title: 'Personagens',
    description: 'Classes, histórias, pontos fortes e builds.',
    links: characterLinksByRelease
  },
  {
    title: 'Equipamentos',
    description: 'Sets, armas, asas e acessórios.',
    links: ['Sets', 'Armas e Escudos', 'Asas e Capas', 'Acessórios', 'Pets e Mounts', 'Consumíveis', 'Jewels']
  },
  {
    title: 'Fórmulas',
    description: 'Status, experiência e taxas do servidor.',
    links: ['Status de Personagens', 'Experiência', 'Taxas do Servidor']
  },
  {
    title: 'Builds',
    description: 'Rotas de progressão para PvP, PvM e eventos.',
    links: ['PvP', 'PvM', 'Boss', 'Eventos']
  },
  {
    title: 'Chaos Machine',
    description: 'Combinações, materiais, taxas e dicas.',
    links: ['Chaos Weapon Mix', 'Wing Mix', 'Socket Mix', 'Jewel Mix', 'Eventos de Mix']
  },
  {
    title: 'Monstros',
    description: 'Spots, bosses, drops e melhores rotas.',
    links: ['Spots de Up', 'Bosses', 'Drops']
  }
]

export const serverStats = [
  { label: 'Versão', value: 'Season 6' }
]

export const news = [
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
]

export const rankingRows: Array<{ pos: number; name: string; class: string; score: string; guild: string }> = [
]

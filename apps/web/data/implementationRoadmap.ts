export type RoadmapStatus = 'A fazer' | 'Em andamento' | 'Bloqueado' | 'Base coletada' | 'Validar'
export type RoadmapPriority = 'Alta' | 'Media' | 'Baixa'

export type RoadmapItem = {
  title: string
  area: string
  status: RoadmapStatus
  priority: RoadmapPriority
  summary: string
  collectedData: string[]
  nextSteps: string[]
}

export const roadmapStatusLabels: RoadmapStatus[] = ['A fazer', 'Em andamento', 'Bloqueado', 'Base coletada', 'Validar']
export const roadmapPriorityLabels: RoadmapPriority[] = ['Alta', 'Media', 'Baixa']

export const implementationRoadmap: RoadmapItem[] = [
  {
    title: 'Wiki de personagens por classe',
    area: 'Personagens',
    status: 'Em andamento',
    priority: 'Alta',
    summary: 'Transformar os dados coletados em paginas completas para cada personagem, mantendo a ordem de lancamento e bloqueando classes futuras para players.',
    collectedData: [
      'Fairy Elf com lore, formulas, skills, armas, sets e wings',
      'Dark Lord com referencias visuais e direcao artistica',
      'Lista de personagens v6, validar e high-version-futuro',
      'MegaMu com NPCs e origem de skills'
    ],
    nextSteps: [
      'Completar pagina da Fairy Elf com dados coletados',
      'Replicar estrutura para Dark Knight, Dark Wizard, Magic Gladiator, Dark Lord e Rage Fighter',
      'Deixar Grow Lancer em diante visivel apenas para admin e desabilitado para players',
      'Adicionar filtros por classe, build, skill e equipamento relacionado'
    ]
  },
  {
    title: 'Ferramenta de item com upgrade +0 ate +15',
    area: 'Equipamentos',
    status: 'A fazer',
    priority: 'Alta',
    summary: 'Criar um visual bonito para selecionar level do item e recalcular dano, requisitos e tooltip em tempo real.',
    collectedData: [
      'Divine Sword of Archangel +0: 220 ~ 230, speed 45, STR 381, AGI 149',
      'Curva de bonus +0 ate +15',
      'Padrao visual de arma fisica e magica',
      'Regra de nome rosado para Archangel'
    ],
    nextSteps: [
      'Criar componente de tooltip de item',
      'Criar seletor +0 ate +15 com visual Blood Moon',
      'Separar campos de dano fisico, dano magico, wizardry, harmony, excellent, luck e skill',
      'Integrar com Archangel e depois expandir para todas as armas'
    ]
  },
  {
    title: 'Sistema completo de Socket Items',
    area: 'Equipamentos',
    status: 'Base coletada',
    priority: 'Alta',
    summary: 'Socket e um sistema complexo e precisa virar pagina dedicada, calculadora e modelo de dados separado.',
    collectedData: [
      'Seed, Sphere e Seed Sphere',
      'Seed Options por elemento',
      'Bonus Socket Option por tier',
      'Socket Set Bonus',
      'Weapons, shields, armor sets e mastery socket content',
      'Manifesto de URLs de imagens da pagina Socket'
    ],
    nextSteps: [
      'Criar pagina de guia Socket Items',
      'Criar calculadora de sockets por item',
      'Modelar socket como lista ordenada com elemento, opcao, level e bonus ativo',
      'Baixar/espelhar imagens quando a conexao com MU Online Fanz permitir'
    ]
  },
  {
    title: 'Ancient Sets e bonus por pecas',
    area: 'Equipamentos',
    status: 'Base coletada',
    priority: 'Alta',
    summary: 'Criar uma wiki de Ancient Sets com bonus ativos/inativos e filtros por classe, peca e set.',
    collectedData: [
      'Conceito de Ancient Set Item',
      'Ancient Option, Set Option, Luck, Harmony e Life como camadas separadas',
      'Lista de sets por classe',
      'Exemplos estruturados como Anonymous, Warrior, Kantata, Drake e Gywen'
    ],
    nextSteps: [
      'Completar detalhes de todos os sets Ancient',
      'Criar filtro por classe e peca',
      'Mostrar bonus conforme quantidade de pecas',
      'Validar quais Ancient existem no servidor v6'
    ]
  },
  {
    title: 'Excellent Items e opcoes especiais',
    area: 'Equipamentos',
    status: 'Base coletada',
    priority: 'Alta',
    summary: 'Transformar os dados de Excellent em pagina de referencia e em regras reutilizaveis no tooltip.',
    collectedData: [
      'Opcoes Excellent ofensivas, defensivas e economicas',
      'Drops e obtencao por conteudo',
      'Regras de FO, Rare Item Ticket e sistemas modernos',
      'Padroes de cor e leitura visual'
    ],
    nextSteps: [
      'Criar pagina Excellent Items',
      'Criar tabela filtravel por tipo de opcao',
      'Integrar opcoes Excellent no tooltip de item',
      'Separar conteudo v6 de high-version-futuro'
    ]
  },
  {
    title: 'Archangel e Blessed Archangel',
    area: 'Equipamentos',
    status: 'Validar',
    priority: 'Alta',
    summary: 'Completar os dados de todas as armas Archangel e Blessed usando as paginas individuais do item database.',
    collectedData: [
      'Base da Divine Sword confirmada por screenshot',
      'Curva +0 ate +15',
      'Lista preparada para Sword, Staff, Crossbow, Scepter, Stick, Claws e Lance',
      'Regras visuais de nome rosado'
    ],
    nextSteps: [
      'Confirmar valores das outras Archangel quando o site permitir acesso',
      'Preencher dano, speed, requisitos e classes de cada arma',
      'Adicionar imagens locais de cada item',
      'Criar familia Archangel no CRUD de equipamentos'
    ]
  },
  {
    title: 'Guias avancados de itens MU Online Fanz',
    area: 'Equipamentos',
    status: 'Base coletada',
    priority: 'Alta',
    summary: 'Consolidar as novas paginas de itens em modelos reutilizaveis para wiki, filtros, tooltips e futuras versoes do servidor.',
    collectedData: [
      'Enhanced Sets, Enhanced Weapons, Mastery Sets e Mastery Weapons',
      'Moss Items, Siege Items, Lucky Sets, Wings/Capes, Necklaces e Rings',
      'URLs confirmadas para imagens de Moss e Wings',
      'Indice do Item Database com amostras e fila de coleta'
    ],
    nextSteps: [
      'Criar paginas dedicadas para cada familia de item',
      'Separar conteudo v6 de high-version-futuro',
      'Adicionar filtros por classe, tier, origem, compatibilidade e imagem disponivel',
      'Integrar os dados no painel Referencias Dev e nos tooltips futuros'
    ]
  },
  {
    title: 'Galeria de referencias e imagens externas',
    area: 'Referencias',
    status: 'Bloqueado',
    priority: 'Alta',
    summary: 'Espelhar imagens dos sites de referencia e organizar por personagem, equipamento, mapa, monstro, sistema e fonte.',
    collectedData: [
      '240 imagens locais da Fairy Elf ja espelhadas',
      'Manifesto de imagens Socket',
      'Crawler de MU Online Fanz criado',
      'Fila de paginas reais criada em source-seeds.json'
    ],
    nextSteps: [
      'Rodar o espelhador quando a conexao com muonlinefanz.com funcionar',
      'Separar imagens originais de versoes otimizadas Blood Moon',
      'Exibir imagens espelhadas no painel Referencias Dev',
      'Manter imagens de terceiros apenas como referencia original'
    ]
  },
  {
    title: 'CRUD real de referencias e imagens',
    area: 'Painel admin',
    status: 'A fazer',
    priority: 'Alta',
    summary: 'O CRUD atual funciona como prototipo local; falta backend/persistencia real para upload, edicao e exclusao.',
    collectedData: [
      'Tela Referencias Dev criada',
      'Formulario de nova referencia, editar, excluir e upload local',
      'Separacao por biblioteca, grupo, categoria e status'
    ],
    nextSteps: [
      'Criar API/backend para salvar imagens',
      'Persistir referencias em banco ou arquivo administrativo',
      'Adicionar permissoes apenas para admin',
      'Adicionar historico de alteracao e origem da fonte'
    ]
  },
  {
    title: 'Guias de equipamentos com mais colunas',
    area: 'Guias',
    status: 'Em andamento',
    priority: 'Media',
    summary: 'As paginas de guias precisam usar largura ampla, sem lateral desnecessaria, para caber filtros e muitos cards.',
    collectedData: [
      'Pagina Sets ja usa container amplo',
      'Cards ja consultam referencias de equipamentos',
      'Regras visuais de upgrade, buff e +15 registradas'
    ],
    nextSteps: [
      'Aplicar o mesmo padrao em Ancient, Excellent, Socket e Archangel',
      'Adicionar filtros por classe, tipo, compatibilidade e imagem disponivel',
      'Evitar cards com fonte/origem poluindo o visual final',
      'Criar estado vazio claro quando nenhum filtro estiver selecionado'
    ]
  },
  {
    title: 'Painel de conta do jogador',
    area: 'Conta',
    status: 'A fazer',
    priority: 'Media',
    summary: 'A area do jogador precisa concentrar gerenciamento de personagens, conta, loja e moedas.',
    collectedData: [
      'Dropdown de boas-vindas ja existe',
      'Moedas: WCoin, Goblin Point e Hunt Point',
      'Rotas base de painel, personagens, conta, loja e recarga'
    ],
    nextSteps: [
      'Criar dados reais de personagens da conta',
      'Criar troca de senha usando Personal ID apenas quando logado',
      'Criar tela de recarga',
      'Separar dashboard administrativo de area comum do jogador'
    ]
  },
  {
    title: 'Cadastro, recuperacao e login real',
    area: 'Conta',
    status: 'A fazer',
    priority: 'Media',
    summary: 'O fluxo visual existe, mas ainda precisa integrar com uma base real de contas e regras de seguranca.',
    collectedData: [
      'Formulario de cadastro com nome, usuario, senha, email, Personal ID, referencia e termos',
      'Recuperacao de conta ajustada para usar email',
      'Conta admin de teste: admin/admin'
    ],
    nextSteps: [
      'Criar backend de autenticacao',
      'Validar usuario/email duplicado',
      'Criar envio real de recuperacao por email',
      'Remover credenciais mockadas quando o backend entrar'
    ]
  },
  {
    title: 'Conteudo visual gerado e otimizado',
    area: 'Arte',
    status: 'Em andamento',
    priority: 'Media',
    summary: 'As imagens finais do site precisam ser proprias, mais realistas e sem depender de imagens externas com marca d agua.',
    collectedData: [
      'Fairy Elf aprovada com asa lv3 grande como referencia',
      'Dark Lord com referencias de armor, capa, corvo e scepter',
      'Diretrizes de realismo e composicao registradas',
      'Regras de brilho, buff, bless e +15 registradas'
    ],
    nextSteps: [
      'Organizar imagens geradas separadas das referencias originais',
      'Criar versoes otimizadas dos equipamentos sem perder essencia',
      'Criar artes de personagens restantes',
      'Garantir composicao com respiro para nao cortar cabeca/personagem em resolucoes menores'
    ]
  },
  {
    title: 'Internacionalizacao completa',
    area: 'Site',
    status: 'A fazer',
    priority: 'Baixa',
    summary: 'O seletor de idioma existe, mas todo conteudo novo precisa entrar com chaves de traducao.',
    collectedData: [
      'Dropdown de idiomas no header',
      'Idiomas base definidos: PT-BR, PT-PT, ES, EN-US, EN-GB, FR, DE, IT'
    ],
    nextSteps: [
      'Mapear textos das novas paginas para traducoes',
      'Evitar texto solto em componentes',
      'Criar fallback por idioma',
      'Revisar nomes tecnicos que devem permanecer em ingles'
    ]
  }
]

export const roadmapAreas = Array.from(new Set(implementationRoadmap.map((item) => item.area))).sort()

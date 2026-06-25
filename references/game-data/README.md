# Referencias de game data

Este diretorio centraliza dados externos para a wiki e os guias do Blood Moon.

## Politica

- Ler `source-collection-policy.md` antes de transformar qualquer referencia em pagina final.
- Conteudo de v6 tem prioridade para o servidor atual.
- Conteudo moderno deve ser preservado como `high-version-futuro`, pois pode alimentar um servidor paralelo de versao mais alta.
- Dados externos precisam de validacao antes de virar texto final do site.

## Fontes coletadas

### MegaMu forum - skills

Arquivo:

- `megamu-skills-reference.md`
- `megamu-skills-data.json`

Fonte:

- https://megamu.net/forum/showthread.php?tid=11675

Conteudo catalogado:

- NPCs de skills.
- Skills por classe.
- Skills por arma/item.
- Quest Marlon.
- Dark Horse e Dark Raven.
- Castle Siege.
- Drops de livros/orbs.
- Conteudo Ruud e classes modernas para high-version-futuro.

### MU Online Fanz - Fairy Elf

Arquivo:

- `muonlinefanz-elf-reference.md`
- `muonlinefanz-elf-data.json`

Fonte:

- https://muonlinefanz.com/guide/characters/elf/

Conteudo catalogado:

- Lore e identidade da Fairy Elf.
- Evolucao de classe.
- Base stats.
- Formulas de ataque, defesa, HP, Mana, AG e SD.
- Skills.
- Armas, bows, crossbows e quivers.
- Shields.
- Armor sets.
- Wings.
- Master Skill Tree e Skill Enhancement Tree para high-version-futuro.

### MU Online Fanz - Excellent Items

Arquivo:

- `muonlinefanz-excellent-items-reference.md`
- `muonlinefanz-excellent-items-data.json`

Fonte:

- https://muonlinefanz.com/guide/items/excellent/

Conteudo catalogado:

- Conceito de itens Excellent.
- Formas de obtencao por mapas, bosses, eventos e sistemas modernos.
- Drops especificos de baixo level por mapa/monstro.
- Opcoes Excellent ofensivas, defensivas e economicas.
- Dados numericos brutos das opcoes Excellent regulares, 3rd class e 4th class.
- Diferenca entre Excellent, FO, upgrade/bless, +15, Harmony, Luck, Skill e Additional Option.
- Notas de interpretacao visual para nao confundir brilho de upgrade ou buff com caracteristica base do item.
- Checklist para modelagem futura no CRUD/admin de equipamentos.

### MU Online Fanz - Archangel Items

Arquivo:

- `muonlinefanz-archangel-items-reference.md`
- `muonlinefanz-archangel-items-data.json`

Fonte:

- https://muonlinefanz.com/tools/items/data/itemdb/Divine%20Sword%20of%20Archangel.php
- https://muonlinefanz.com/guide/items/archangel-items/

Conteudo catalogado:

- Divine Sword of Archangel com dados confirmados por screenshot.
- Curva de bonus por item level `+0` ate `+15`.
- Estrutura para armas Archangel e Blessed Archangel.
- Separacao de armas fisicas e magicas.
- Regras de tooltip para nome rosado, Harmony, Excellent e upgrade.
- Pendencias de validacao para cada pagina especifica.

### MU Online Fanz - Ancient Items

Arquivo:

- `muonlinefanz-ancient-items-reference.md`
- `muonlinefanz-ancient-items-data.json`

Fonte:

- https://muonlinefanz.com/guide/items/ancient/

Conteudo catalogado:

- Conceito de Ancient Set Item.
- Regras de Ancient Option e Set Option.
- Formas de obtencao separadas por v6/validar/high-version-futuro.
- Lista de Ancient Sets por classe.
- Exemplos estruturados de sets para modelar a futura wiki.
- Notas para filtros, tooltip e painel administrativo.

### MU Online Fanz - Socket Items

Arquivo:

- `muonlinefanz-socket-items-reference.md`
- `muonlinefanz-socket-items-data.json`
- `../game-assets/muonlinefanz/socket/manifest.json`

Fonte:

- https://muonlinefanz.com/guide/items/socket/

Conteudo catalogado:

- Regras gerais de Socket Items.
- Fluxo de Seed, Sphere e Seed Sphere.
- Seed Options ofensivas e defensivas.
- Limites maximos de opcoes socket.
- Bonus Socket Option por tier e combinacao.
- Socket Set Bonus.
- Weapons, shields, armor sets e mastery socket content.
- Manifesto de URLs das imagens encontradas para espelhamento posterior.

### MU Online Fanz - lote de guias de itens

Arquivo:

- `muonlinefanz-item-guides-batch-reference.md`
- `muonlinefanz-item-guides-batch-data.json`

Fontes:

- https://muonlinefanz.com/guide/items/enhanced-sets/
- https://muonlinefanz.com/guide/items/enhanced-weapons/
- https://muonlinefanz.com/guide/items/mastery-weapons/
- https://muonlinefanz.com/guide/items/mastery-sets/
- https://muonlinefanz.com/guide/items/moss/
- https://muonlinefanz.com/guide/items/siege/
- https://muonlinefanz.com/guide/items/lucky/
- https://muonlinefanz.com/guide/items/wings/
- https://muonlinefanz.com/guide/items/necklace/
- https://muonlinefanz.com/guide/items/ring/
- https://muonlinefanz.com/tools/items/

Conteudo catalogado:

- Enhanced Sets e Weapons.
- Mastery Sets e Weapons.
- Moss Items.
- Siege Items / 380 items.
- Lucky Ticket Sets.
- Wings & Capes.
- Rings e Necklaces.
- Item Database como ponto de entrada para crawling futuro.

## Proximas coletas recomendadas

- MU Online Fanz - Dark Knight.
- MU Online Fanz - Dark Wizard.
- MU Online Fanz - Dark Lord.
- MU Online Fanz - Summoner, se entrar no escopo.
- Guias de equipamentos por set/weapon, quando existirem paginas separadas.

## Galeria de desenvolvimento

- Rota administrativa no site: `/painel/admin/referencias`.
- Rota antiga `/dev/referencias`: redireciona para a area administrativa.
- Catalogo usado pela rota: `data/devReferenceAssets.ts`.
- Imagens espelhadas para o navegador: `public/dev-references/visual`.
- Objetivo: separar referencias de personagens, equipamentos, mapas, monstros e fontes para avaliacao visual antes de publicar no site principal.

# MU Online Fanz - Excellent Items reference

Fonte: https://muonlinefanz.com/guide/items/excellent/

Coletado em: 2026-06-12

Status: referencia bruta para wiki, equipamentos, drops e sistemas. Validar contra a versao do servidor Blood Moon antes de publicar.

Dados estruturados: `muonlinefanz-excellent-items-data.json`

## Escopo

Pagina dedicada aos itens Excellent de MU Online, explicando o que sao, como obter, quais mapas/monstros podem dropar, quais opcoes especiais podem existir e como sistemas de versoes mais recentes alteram as possibilidades.

## Conceito geral

- Itens Excellent sao variantes mais raras e poderosas de itens normais.
- Podem ter uma ou mais opcoes Excellent.
- As opcoes modificam ataque, dano, defesa, vida, mana, recuperacao, reflet, zen e outros atributos.
- O guia usa exemplos de armas, sets e joias/itens de evento para explicar obtencao e raridade.
- Itens dropados por monstros podem ter ate 2 opcoes Excellent.
- Itens obtidos via Lord Mix podem ter ate 4 opcoes Excellent.
- Em regras regulares, a pagina descreve 12 opcoes Excellent totais, 6 defensivas e 6 ofensivas.

## Formas de obtencao

### Drops em mapas

Excellent items podem dropar em mapas e monstros especificos. A pagina destaca exemplos como:

- Tarkan;
- Kanturu Ruins;
- Raklion;
- Aida;
- Swamp of Calmness;
- mapas/eventos de tier superior conforme versao.

### Bosses e eventos

Tambem podem vir de monstros especiais, bosses e eventos. A pagina cita o uso de:

- box/event reward;
- boss reward;
- eventos de alto nivel;
- sistemas modernos com ticket/box conforme versao.

### Jewel of Harmony, adicionais e refinamento

O guia se conecta com sistemas de melhoria do item. Para o nosso uso, separar:

- Excellent Options: propriedades especiais nativas do item excellent;
- Harmony Options: sistema separado de refinamento;
- Additional Option: bonus adicional obtido por sistemas/joias;
- Luck/Skill: propriedades de item que podem coexistir, mas nao sao a mesma coisa que Excellent Option.

## Drops especificos de baixo level

Catalogado como dados brutos no JSON:

- Lorencia: Hound, Elite Bull Fighter, Lich, Giant e Skeleton.
- Noria: Goblin, Elite Goblin, Beetle Monster, Hunter e Agon.
- Devias: Hommerd.
- Kalima 1: Rogue Centurion.

Cada monstro tem itens Excellent especificos associados no arquivo estruturado.

## Tabela de referencia por mapa e monstro

Usar esta secao como checklist de drops, nao como tabela final. Os dados precisam ser validados para a versao 6 do Blood Moon.

### Tarkan

Uso: referencia classica para drops excellent de tier medio/alto.

Itens esperados:

- armas e sets excellent de progressao intermediaria;
- itens de classes classicas conforme monstro e level.

### Kanturu Ruins

Uso: progressao acima de mapas classicos.

Itens esperados:

- equipamentos excellent de tier superior;
- itens que podem servir como referencia para areas futuras da wiki.

### Raklion

Uso: mapa de tier alto.

Itens esperados:

- equipamentos excellent mais avancados;
- referencia importante para servidor de versao mais alta.

### Aida

Uso: mapa intermediario/alto, com drops variados.

Itens esperados:

- armas, sets e acessorios excellent conforme monstro.

### Swamp of Calmness

Uso: conteudo moderno/alto.

Itens esperados:

- equipamentos excellent e progressionais mais avancados;
- preservar como high-version-futuro quando nao existir na v6.

## Opcoes Excellent em armas

Possiveis efeitos ofensivos para armas:

- aumento de dano excellent;
- chance de dano excellent;
- aumento de dano por level;
- aumento de velocidade de ataque;
- recuperacao de vida apos matar monstro;
- recuperacao de mana apos matar monstro.

Dados numericos padrao:

- Excellent Damage Chance: +10%.
- ATK/WIZ DMG por 20 levels: +1.
- ATK/WIZ DMG: +2%.
- ATK/WIZ Speed: +7.
- Restore HP por monstro morto: 1/8.
- Restore Mana por monstro morto: 1/8.

Aplicacao no Blood Moon:

- usar em wiki de armas;
- explicar diferenca entre dano base, adicional, luck e excellent;
- criar filtros futuros por opcao excellent.

## Opcoes Excellent em sets/armaduras

Possiveis efeitos defensivos:

- aumento de vida maxima;
- aumento de mana maxima;
- diminuicao de dano recebido;
- refletir dano;
- aumento de taxa de defesa;
- aumento de zen drop.

Dados numericos padrao:

- HP: +4%.
- Mana: +4%.
- DEF Rate: +10%.
- Decrease Damage: +4%.
- Reflect Damage: +5%.
- Zen drop: +30%.

## Opcoes Excellent de 3rd class

Preservar como `high-version-futuro` para o servidor atual.

Regras de limite:

- Armor/defensivo: ate 2 opcoes Excellent.
- Weapon/offensivo: ate 3 opcoes Excellent.

Defensivas:

- HP +165.
- Mana +165.
- DEF Rate +10%.
- Decrease Damage +45.
- Reflect Damage +5%.
- Zen drop +42%.

Ofensivas:

- Excellent Damage Chance +10%.
- ATK/WIZ DMG +1.5 a +1.8 por 20 levels.
- ATK/WIZ DMG +42 a +51.
- ATK/WIZ Speed +7.
- Restore HP 1/8 por monstro morto.
- Restore Mana 1/8 por monstro morto.

## Opcoes Excellent de 4th class

Preservar como `high-version-futuro` para o servidor atual.

Regras de limite:

- Armor/defensivo: ate 2 opcoes Excellent.
- Weapon/offensivo: ate 3 opcoes Excellent.

Defensivas:

- HP +165.
- Mana +165.
- DEF Rate +10%.
- Decrease Damage +45.
- Reflect Damage +5%.
- Base DEF +1.5 a cada 20 levels.

Ofensivas:

- Excellent Damage Chance +10%.
- ATK/WIZ DMG +2 a +2.8 por 20 levels.
- ATK/WIZ DMG +57 a +80.
- ATK/WIZ Speed +7.
- Restore HP 1/8 por monstro morto.
- Restore Mana 1/8 por monstro morto.

Aplicacao no Blood Moon:

- usar em wiki de sets;
- criar explicacao para build PvM/PvP;
- separar opcoes defensivas de opcoes economicas como zen.

## Opcoes Excellent em shields

Shields podem ter propriedades defensivas semelhantes a sets, com foco em:

- defesa;
- reducao de dano;
- reflet;
- vida/mana;
- taxa defensiva.

Observacao: validar quais shields existem e quais classes podem usar no servidor.

## Itens FO

FO significa item com todas as principais opcoes Excellent disponiveis para aquele tipo de item.

Uso no site:

- explicar como termo de comunidade;
- nao tratar FO como item separado por padrao;
- FO e um estado/conjunto de opcoes aplicadas ao item.

## Padrao de tooltip/status de arma fisica

Referencia visual enviada pelo usuario para status de arma de dano fisico.

Estrutura observada:

- Nome do item no topo, com cor indicando categoria/raridade.
- Linha de dano base: exemplo `Damage min-max`.
- Velocidade de ataque.
- Durabilidade atual/maxima.
- Forca requerida.
- Agilidade requerida.
- Restricoes de classe em linhas vermelhas quando aplicavel.
- Se houver opcao de skill, aparece uma linha de clique/skill.
- Opcoes Excellent aparecem em linhas azuis.
- Luck aparece como linha separada.
- Additional Option aparece como linha separada.
- Harmony Option aparece em amarelo.

Regras de cor registradas:

- Armas do Arcanjo/Archangel usam nome rosado.
- O adicional amarelo vem do sistema Harmony.
- Linhas vermelhas indicam restricao/condicao de uso, como classe que pode equipar.
- Excellent Options devem ser tratadas separadamente de Harmony, Luck, Skill e Additional Option.

Uso futuro:

- criar componente de tooltip de item seguindo essa hierarquia;
- modelar arma fisica com `damageMin`, `damageMax`, `attackSpeed`, `durability`, `requiredStrength`, `requiredAgility`, `allowedClasses`, `skill`, `excellentOptions`, `luck`, `additionalOption` e `harmonyOption`;
- diferenciar cor do nome por familia/tier do item, especialmente Archangel.

## Padrao de tooltip/status de arma magica

Referencia visual enviada pelo usuario: `Divine Stick of the Archangel +9`, arma do Arcanjo para Summoner.

Diferenca principal: esta arma e de dano magico/wizardry, nao dano fisico.

Estrutura observada:

- Nome rosado por ser arma do Arcanjo/Archangel.
- Linha de poder magico: exemplo `One handed attack power: min-max`.
- Velocidade de ataque.
- Durabilidade atual/maxima.
- Forca requerida.
- Agilidade requerida.
- Linha de aumento de Wizardry, exemplo `Increases wizardry by 104%`.
- Classe permitida: Summoner.
- Opcoes Excellent em azul com foco em Wizardry.
- Pode ter recuperacao de Life/Mana por monstro morto.

Opcoes Excellent observadas/esperadas em arma magica:

- Increase Excellent Damage Chance.
- WIZ Dmg increases by 1 every 20Lv.
- WIZ Dmg increases by 2%.
- Increase attack/wizardry speed.
- Obtains Life when monster is killed.
- Obtains Mana when monster is killed.

Uso futuro:

- criar modelo separado para arma magica;
- nao preencher apenas `damageMin`/`damageMax` fisico quando o item for stick/staff/scepter magico;
- usar campos como `wizardryPowerMin`, `wizardryPowerMax`, `wizardryIncreasePercent` e `magicExcellentOptions`;
- manter Archangel com nome rosado independentemente de ser arma fisica ou magica.

## Rare Item Ticket e conteudo moderno

A pagina menciona sistemas modernos de obtencao. Para o Blood Moon:

- classificar como `high-version-futuro` quando nao existir na versao atual;
- guardar nomenclatura e fluxo para servidor paralelo futuro;
- nao misturar com mecanicas v6 sem validacao.

## Imagens e assets

Imagens da pagina devem ser tratadas como referencia externa:

- nao remover marcas d'agua;
- guardar origem e URL;
- se for usar visualmente no site, gerar versao otimizada propria;
- manter a essencia do item e respeitar as regras de `references/game-assets/optimization-guidelines.md`.

## Regras de interpretacao visual

Ao analisar imagens excellent:

- brilho forte pode representar upgrade/bless, nao necessariamente excellent;
- aura +15 pode criar linhas/arcos/chifres brancos e nao deve ser confundida com parte fisica do set;
- buffs, barras e efeitos temporarios de XP nao fazem parte do equipamento;
- excellent e upgrade sao conceitos separados.

## Uso planejado no projeto

- Criar secao de wiki: `Itens Excellent`.
- Adicionar filtros por tipo de opcao.
- Cruzar com equipamentos ja catalogados da Fairy Elf.
- Replicar estrutura para Dark Knight, Dark Wizard, Magic Gladiator, Dark Lord e Rage Fighter.
- Marcar dados de versoes superiores como futuro.
- Usar como base para CRUD/admin de equipamentos.

## Checklist para implementacao futura

- Modelar `excellentOptions` nos objetos de equipamentos.
- Carregar `muonlinefanz-excellent-items-data.json` como semente de opcoes Excellent e drops.
- Criar tipo do item: arma, set, shield, accessory, wing/cape, consumivel/evento.
- Separar `baseItem`, `excellentState`, `upgradeLevel`, `harmonyOption`, `luck`, `skill` e `additionalOption`.
- Para arma fisica, separar dano minimo, dano maximo, velocidade, durabilidade, requisitos e classes permitidas.
- Para arma magica, separar poder magico/wizardry, percentual de wizardry, velocidade, durabilidade, requisitos e classes permitidas.
- Criar campo `versionScope`: v6, validar, high-version-futuro.
- Criar campo `dropSources`: mapa, monstro, evento, box, boss.
- Criar campo `visualState`: neutro, upado, +15, buffado/captura.

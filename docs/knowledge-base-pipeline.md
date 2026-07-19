# Knowledge Base Pipeline

Este documento define o fluxo oficial para coleta, revisao, banco de dados e publicacao da base de conhecimento do Blood Moon.

## Ordem de trabalho

1. Coletar a menor unidade possivel de cada fonte externa.
2. Salvar o bruto em `references/game-data` e `references/game-assets`.
3. Normalizar para um indice unico, sem apagar o bruto.
4. Deduplicar por URL, titulo, texto e SHA1 de imagem.
5. Importar para o banco relacional via Prisma como registros editoriais.
6. Revisar no painel administrativo.
7. Aprovar, remasterizar ou arquivar.
8. Publicar no site somente o que estiver aprovado.

## Coleta atual

Fontes coletadas:

- GuiaMu Argentina: `https://guiamu.com.ar/?lang=pt`
- Webzen Game Info PT: `https://muonline.webzen.com/pt/gameinfo`

Artefatos:

- Dados brutos: `references/game-data/source-harvest`
- Imagens e HTML bruto: `references/game-assets/source-harvest`
- Indice normalizado: `references/game-data/source-harvest/normalized-index.json`
- Relatorio: `references/game-data/source-harvest/normalization-report.md`
- Plano de importacao: `references/game-data/source-harvest/postgres-import-plan.json`
- Plano de equipamentos: `references/game-data/equipment-postgres-import-plan.json`
- Auditoria de equipamentos: `references/game-data/equipment-remap-audit.md`

Totais da coleta:

- 436 paginas brutas.
- 330 registros canonicos.
- 106 paginas duplicadas colapsadas.
- 7072 registros brutos de imagem.
- 1537 imagens unicas por SHA1.

Totais do plano PostgreSQL:

- 2 fontes.
- 330 entradas de conhecimento.
- 1537 assets.
- 1672 vinculos entre entradas e assets.
- 12 entradas off-topic arquivaveis.
- 45 entradas de temporada futura.
- 7 entradas detectadas como Season 6.

Totais importados e verificados no PostgreSQL local:

- 2 fontes.
- 330 entradas de conhecimento.
- 1537 assets de referencia.
- 1672 vinculos entre entradas e assets.
- 1719 equipamentos.
- 2729 variantes de equipamento.
- 2511 pecas de equipamento.
- 55 opcoes de equipamento.
- 14 personagens jogaveis catalogados.
- 43 classes/evolucoes catalogadas.
- 9414 vinculos equipamento-classe, separados em `BASE`, `PLAYABLE` e `TARGET`.
- 25990 vinculos equipamento-season.

## Regra para arquivos auxiliares

Nao apagar arquivos auxiliares ainda.

Eles so podem ser removidos quando todos os pontos abaixo forem verdadeiros:

- O registro bruto foi importado para PostgreSQL.
- O `localPath`, `sourceUrl`, `sha1` e metadados foram preservados.
- A imagem ou texto foi revisado no painel admin.
- O status editorial foi definido como `PUBLISHED`, `ARCHIVED` ou `OFF_TOPIC`.
- Existe backup ou migration reproduzivel.

Enquanto isso nao acontecer, `references` e `source-harvest` sao a memoria verificavel do projeto.

## Regra para ajustes globais

Quando uma regra for de familia, ela deve ser aplicada globalmente.

Exemplos:

- Ancient: aplicar a todos os ancient, nao apenas ao set usado como exemplo.
- Excellent: aplicar a todos os equipamentos que podem ter variant Excellent.
- Socket: aplicar a todos os socket items e seus Seed Spheres.
- Lucky: aplicar ao padrao de Lucky Set.
- Mastery Ancient: aplicar a Bloodangel, Darkangel, Holyangel, Soul, Blue Eye, Manticore, Silver Heart, Brilliant, Apocalypse, Primordial e familias futuras.

Fluxo obrigatorio:

1. Ajustar `scripts/remap-equipment-database.mjs`.
2. Rodar `npm run data:remap-equipment`.
3. Verificar `references/game-data/equipment-remap-audit.md`.
4. Somente depois ajustar a UI, se ela ainda precisar de exibicao diferente.

## Banco relacional

O Prisma possui tabelas editoriais para organizar a base. O ambiente de
producao e o desenvolvimento principal usam MySQL/MariaDB; o PostgreSQL local
anterior permanece apenas como referencia de migracao.

- `ReferenceSource`: uma fonte externa ou interna.
- `KnowledgeEntry`: uma pagina, item, skill, mapa, NPC, quest, evento ou regra.
- `ReferenceAsset`: imagem, HTML, texto ou JSON coletado.
- `KnowledgeEntryAsset`: vinculo entre conteudo e asset.
- `EquipmentRecord`: item/equipamento consolidado.
- `EquipmentVariant`: variacoes Normal, Excellent, Ancient, Socket, Lucky e Mastery Ancient.
- `EquipmentPiece`: pecas vinculadas ao equipamento ou set, incluindo ring, pendant, shield e weapon quando fizerem parte de Ancient.
- `EquipmentOption`: efeitos, bonus de set e opcoes coletadas/remapeadas.
- `GameCharacter`: personagem base, na ordem de lancamento e com minimo de season.
- `GameClass`: evolucoes/classes de cada personagem.
- `EquipmentClassLink`: relacao entre equipamento e classe, com papeis:
  - `BASE`: familia principal do personagem.
  - `PLAYABLE`: classes que podem equipar.
  - `TARGET`: classe alvo da progressao exibida nos filtros.
- `EquipmentSeason`: visibilidade por season, separando catalogo publico v6 de conteudo futuro.
- `SiteSetting`: configuracoes editoriais e parametros publicos administraveis,
  sem armazenar segredos de infraestrutura.

Status local verificado:

- Banco: `bloodmoon_portal`
- Banco local principal: MySQL/MariaDB em `localhost:53306`.
- Usuario local: `bloodmoon`
- Cluster local quando Docker falhar: `work/postgres-data`
- Instalacoes novas usam a migration baseline MySQL
  `20260718130000_mysql_baseline`. As migrations historicas em sintaxe
  PostgreSQL foram substituidas porque nao eram executaveis no provedor atual.
- A baseline foi validada em banco MySQL vazio e criou 25 tabelas. O banco local
  existente foi marcado como alinhado com `prisma migrate resolve`, sem apagar
  ou recriar os dados importados.

Comando para preparar o plano de importacao:

```bash
node apps/api/scripts/prepare-source-harvest-import.mjs
```

Esse comando nao grava no banco. Ele transforma `normalized-index.json` em um plano revisavel para importacao controlada.

Comando para criar/atualizar o PostgreSQL local e importar a base consolidada:

```bash
npm run db:setup
npm run db:import
```

O ambiente de deploy cPanel usa MySQL/MariaDB.

URL local padrao esperada pelo script:

```text
mysql://bloodmoon:bloodmoon@localhost:53306/bloodmoon_portal
```

No cPanel, a `DATABASE_URL` real fica em variavel de ambiente do app Node e tambem em `work/cpanel-mysql-production.env` apenas na maquina local de desenvolvimento.

Comando para remapear todos os equipamentos e preparar o plano de importacao:

```bash
npm run data:remap-equipment
```

Toda regra global de equipamento deve ser corrigida no remapeamento, nao direto em um unico card da UI.

## API da Wiki

A API inicial da Wiki fica em `apps/api/src/modules/wiki` e le o PostgreSQL via Prisma.

Endpoints:

- `GET /api/wiki/summary`: totais e agrupamentos de entradas/equipamentos.
- `GET /api/wiki/entries`: lista paginada de conteudos com filtros por `kind`, `scope`, `season` e `search`.
- `GET /api/wiki/characters`: lista personagens e evolucoes em ordem de lancamento, incluindo season minima e flag de base Season 6.
- `GET /api/wiki/equipment`: lista paginada de equipamentos com filtros por `group`, `quality`, `season`, `character`, `className`, `category` e `search`.
- `GET /api/wiki/equipment/sets`: lista sets ja agrupados com pecas, qualidades, classes, opcoes de set e pendencias.
- `GET /api/wiki/equipment/missing-references`: lista pendencias de imagem, opcoes de set e mapeamento de classe.
- `GET /api/wiki/equipment/:key`: detalhe de um equipamento com variantes, pecas e opcoes.

Regra tecnica:

- A pagina Wiki do frontend deve migrar progressivamente para estes endpoints.
- JSON grande importado diretamente em `apps/web/pages/wiki.vue` e apenas uma etapa temporaria.
- Consultas por personagem/classe usam tabelas relacionais, nao JSON.
- `character` filtra a familia do personagem.
- `className` filtra o papel `TARGET`, ou seja, a progressao esperada do item. Exemplo: `Leather` nao deve aparecer como alvo de `Blade Knight`; `Dragon`, `Black Dragon` e equivalentes entram na progressao da segunda classe.
- Quando `season <= 6`, a API filtra equipamentos por `EquipmentSeason.visibility = SEASON_6`.
- Admin deve consultar temporadas futuras com `season=21` ou outro valor superior quando a UI de permissao estiver conectada.
- Catalogo de sets da Wiki deve consumir `equipment/sets` e nunca montar sets no frontend a partir de varias fontes locais.
- Equipamentos sem imagem devem continuar renderizando como objeto valido com placeholder `Sem foto`, nome, pecas e pendencias.
- A aba `Personagens` deve consumir `characters` e cruzar conteudos relacionados usando entradas `CHARACTER`, `SKILL`, `GUIDE` e `LORE`.
- Topicos genericos da Wiki, incluindo `Tutoriais`, `Mapas`, `Spots`, `Drops`, `Eventos`, `Quests`, `NPCs` e formulas, devem renderizar `KnowledgeEntry` paginado via `entries` antes de ganhar layouts especificos.
- Quando a classificacao bruta ainda estiver incompleta, a UI pode usar filtros amplos para manter conteudo visivel, mas a correcao definitiva deve acontecer no normalizador/importador.

## Painel administrativo de conteudo

O painel administrativo precisa controlar todo o site, pois havera mais de um administrador.

Escopo desejado:

- Gerenciar contas administrativas, permissoes e trilha de auditoria.
- Criar, editar, publicar, despublicar e arquivar noticias.
- Criar, editar e revisar paginas da Wiki.
- Criar, editar, importar e revisar equipamentos, incluindo itens exclusivos do servidor.
- Vincular pecas em sets sem expor cada peca como item solto na listagem principal.
- Gerenciar imagens originais, remasterizadas e publicaveis.
- Gerenciar referencias, fontes externas, status editorial e pendencias.
- Gerenciar personagens, classes, mapas, monstros, drops, skills, eventos, quests, NPCs e tutoriais.
- Gerenciar loja, recargas, moedas e produtos usando `ShopProduct`, `RechargePackage`, `PurchaseIntent` e `RechargeIntent` no PostgreSQL.
- Gerenciar um CMS administrativo completo para noticias, paginas institucionais, banners, carrossel da home, links do header/footer, parametros do servidor, guias da Wiki, lojas e itens exclusivos.
- Permitir que administradores criem itens exclusivos do servidor com imagem, tipo, classe alvo, season, opcoes, requisitos, fonte interna e status editorial.
- Registrar auditoria para toda acao sensivel: criacao, edicao, exclusao, publicacao, upload, alteracao de permissao e entrega de item.

Campos importantes:

- `kind`: tipo do conteudo, como `CHARACTER`, `EQUIPMENT`, `MAP`, `SKILL`, `EVENT`.
- `scope`: separa `SEASON_6`, `FUTURE_SEASON`, `ALL_SEASONS`, `OFF_TOPIC` e `NEEDS_REVIEW`.
- `status`: fluxo editorial entre `RAW`, `NORMALIZED`, `REVIEWED`, `APPROVED`, `REMASTER_PENDING`, `PUBLISHED` e `ARCHIVED`.
- `duplicateOfId`: preserva rastreabilidade sem duplicar conteudo publicado.

API administrativa inicial:

- `GET /api/admin/content/summary`: resumo do banco editorial.
- `GET /api/admin/content/entries`: lista `KnowledgeEntry` com filtros.
- `POST /api/admin/content/entries`: cria entrada editorial.
- `PATCH /api/admin/content/entries/:id`: edita entrada editorial.
- `DELETE /api/admin/content/entries/:id`: arquiva entrada editorial.
- `GET`, `POST`, `PATCH` e `DELETE /api/admin/content/settings`: gerencia
  configuracoes editoriais e publicas do portal.
- `GET /api/admin/content/assets`: lista `ReferenceAsset` com filtros.
- `POST /api/admin/content/assets`: cria registro de asset ja existente/catalogado.
- `PATCH /api/admin/content/assets/:id`: edita registro de asset.
- `DELETE /api/admin/content/assets/:id`: arquiva asset.
- `GET /api/admin/content/equipment`: lista `EquipmentRecord` com filtros.
- `GET /api/admin/content/equipment-metadata`: carrega grupos, qualidades,
  personagens, classes e status aceitos pelo editor.
- `GET /api/admin/content/equipment/record/:id`: carrega o equipamento completo.
- `POST /api/admin/content/equipment`: cria equipamento ou item exclusivo.
- `PATCH /api/admin/content/equipment/:id`: edita equipamento.
- `DELETE /api/admin/content/equipment/:id`: arquiva equipamento.
- `GET /api/admin/content/equipment-gaps`: lista equipamentos com imagem ou bonus pendente.

Verificacao atual:

- `GET /api/admin/content/summary` retornou 330 entradas, 1537 assets e 1719 equipamentos.
- `GET /api/admin/content/assets?pageSize=3&kind=IMAGE` retornou 1537 imagens catalogadas.
- `GET /api/admin/content/equipment?pageSize=3&group=SET` retornou 259 sets.
- `POST`, `PATCH` e `DELETE /api/admin/content/equipment` foram validados com
  item temporario contendo variantes, pecas, opcoes, classe e temporada; o
  registro de teste foi removido do banco.
- `GET /api/admin/content/equipment-gaps?pageSize=3` retornou 259 pendencias de imagem/opcoes.
- Mutacoes de `KnowledgeEntry`, `ReferenceAsset`, `EquipmentRecord` e
  `SiteSetting` gravam `AuditEvent` com o administrador autenticado.
- `/api/admin/content` exige Bearer token valido e role `ADMIN` ou `SUPER_ADMIN`.
- Sem token retorna `401`; conta administrativa acessa e conta player recebe `403`.
- O editor de equipamentos controla pecas, variantes, opcoes, vinculos de classe
  e temporadas em uma unica operacao transacional.
- Exclusao no painel significa arquivamento logico e auditavel, nao remocao
  fisica do historico.

## Deduplicacao

Paginas:

- Deduplicar por fonte, titulo canonico e assinatura do texto.
- URLs repetidas devem virar `duplicateUrls`.
- Conteudos parecidos, mas de temporada diferente, nao devem ser apagados sem revisao.

Imagens:

- Deduplicar por SHA1.
- Imagens visualmente iguais com nomes diferentes podem apontar para o mesmo asset.
- Imagens remasterizadas devem virar novo `ReferenceAsset`, com role `remastered` no vinculo.

## Temporadas

O servidor atual usa Season 6 como alvo publico.

- Player ve apenas `SEASON_6` e conteudo aprovado.
- Admin ve `SEASON_6`, `FUTURE_SEASON`, `ALL_SEASONS`, `NEEDS_REVIEW` e material bruto.
- Conteudo moderno deve ser preservado para uso futuro, mas nao pode poluir a Wiki publica de Season 6.

## Regras de publicacao

- Nao publicar imagem externa diretamente sem revisao editorial.
- Marca d'agua, baixa resolucao e item de fonte externa devem entrar em fila de remasterizacao.
- Texto externo deve virar base tecnica, nao copia final sem curadoria.
- Toda mudanca estrutural precisa atualizar este documento ou o README da pasta afetada.

## Lacunas verificadas

Essas lacunas nao devem ser escondidas na UI como se estivessem completas:

- 240 registros Ancient/Lucky/Mastery ainda nao possuem opcoes de set completas no remapeamento atual.
- 259 registros de Ancient/Lucky/Mastery ainda nao possuem imagem local associada.
- 12 entradas `OFF_TOPIC`/arquivadas continuam no banco para rastreabilidade, mas precisam ficar fora das listagens publicas.
- A pagina Wiki ainda importa JSON grande no frontend; o build passa, mas gera chunks grandes. Proximo passo tecnico: servir catalogos via API/PostgreSQL e carregar por demanda.
- 0 registros estao sem mapeamento de personagem/classe apos o remap relacional.
- A progressao de classe agora usa `TARGET`; verificar novos ajustes sempre por regra global, nao por item isolado.

Exemplos validados no banco:

- `ancient-normal-kantata-plate`: possui `Kantata Ring of Wind`, `Kantata Ring of Poison` e opcoes de set importadas.
- `ancient-normal-eplete-scale`: possui `Eplete Shield Plate` e `Eplete Pendant of Lightning`, mas ainda nao possui opcoes de set na fonte estruturada atual.
- `ancient-normal-warrior-leather`: possui pecas e opcoes de set importadas.

# Roadmap modular do CMS Blood Moon

Este documento registra a visao de evoluir o Blood Moon de um site de servidor para uma plataforma modular reutilizavel para outros servidores MU Online.

## Deploy em ambiente PHP/LiteSpeed

O servidor web atual do dominio responde como LiteSpeed com PHP 8.1. Isso significa que ele e adequado para PHP/MuCMS tradicional, mas o nosso projeto atual nao e PHP:

- `apps/web`: Nuxt 4.
- `apps/api`: backend Node/NestJS.
- banco editorial do portal: PostgreSQL no desenho atual.
- banco do jogo: SQL Server `MuOnline` no VPS Windows.

### Fonte web atual

O site publicado em `mubloodmoon.com.br` esta no hospedagem web/cPanel, separado do VPS do jogo.

Estado verificado em 2026-07-16:

- IP do site: `190.102.41.133`.
- Web server: LiteSpeed.
- PHP: 8.1.
- CMS atual: sistema web atual, com `composer.json` em `public_html`.
- Raiz principal: `public_html`.
- Pastas principais: `application`, `assets`, `interface`, `system`, `vendor`.
- O cPanel nao possui banco MySQL listado para esta conta.
- A conexao com o servidor do jogo fica em arquivo PHP de constantes no site atual e deve ser tratada como segredo.

Backup completo do cPanel salvo localmente:

```text
C:\Users\Admin\Documents\BloodMoonBackups\WebSource-web\20260716-cpanel\backup-7.16.2026_12-53-47_mubloodxz.tar.gz
```

SHA256:

```text
B14622C9D71FD5EEFEFF1FC6A51F0B08429D553BC7CDAD0C41EBBBFBB6BB683B
```

O backup possui 10270 entradas e inclui `homedir/public_html`, `dnszones`, `ssl` e metadados do cPanel. Arquivos sensiveis copiados para inspeção temporaria ficam em `work/WebSource-inspect/` e nao devem ser versionados.

### Formas possiveis de publicar

1. **LiteSpeed com suporte a Node.js**
   - Ideal se a hospedagem permitir app Node.
   - Rodar `apps/web` como Nuxt/Nitro e `apps/api` como processo Node.
   - LiteSpeed fica como proxy/reverse proxy.

2. **LiteSpeed servindo site estatico**
   - Gerar `npm run web:generate`.
   - Publicar o output estatico no servidor PHP/LiteSpeed.
   - A API precisa ficar em outro processo/host Node separado.
   - Bom para paginas publicas, ruim para painel/admin em tempo real se nao houver API.

3. **Reescrever backend em PHP**
   - Possivel, mas nao recomendado agora.
   - Aumenta retrabalho, perde a estrutura Node/Nest ja criada e dificulta reaproveitar modulos modernos.

4. **Separar frontend e API**
   - Frontend pode ficar no LiteSpeed.
   - API Node pode ficar na Hostinger Cloud Startup ou VPS do jogo.
   - O navegador fala com `/api`; a API fala com SQL Server/PostgreSQL.

## Regra de seguranca

O navegador nunca deve falar direto com SQL Server ou arquivos sensiveis do MuServer.

Fluxo correto:

```text
Browser
  -> HTTPS
  -> Frontend Nuxt/LiteSpeed
  -> API server-side
  -> adaptadores controlados
  -> SQL Server MuOnline / arquivos MuServer
```

Toda escrita sensivel precisa de:

- permissao;
- validacao;
- transacao;
- idempotencia;
- auditoria;
- rollback testado.

## Backup e fontes reais do servidor

Backup local atual:

```text
C:\Users\Admin\Documents\BloodMoonBackups\game-vps\pre-web-migration-20260716-095739
```

Arquivos principais:

- `MuServer-no-live-logs.zip`
- `MuServer-live-logs-copyable.zip`
- `MuOnline_COPY_ONLY.bak`
- `backup-manifest.json`

Principais fontes encontradas no MuServer:

- `Item_por.txt`, `ItemToolTip_por.txt`, `ItemTooltipText_por.txt`, `test_item.txt`
- `Skill_por.txt`
- `Text_por.txt`
- `MoveReq_por.txt`
- `gate.txt`
- `Minimap_World1_por.txt`, `Minimap_World2_por.txt`
- `Data/CashShop/CashShopProduct.txt`, `CashShopPackage.txt`
- `Data/Character/DefaultClassInfo.txt`
- `Data/Event/*.dat`
- `Data/EventItemBag/*.txt`
- `Data/Custom/*.txt`
- `Backup/Monster.txt`
- `Backup/MonsterSetBase.txt`
- `Backup/Move.txt`

## Export inicial gerado

O primeiro export automatizado do backup do MuServer foi gerado em:

```text
references/game-data/muserver-export
```

Totais atuais:

- 4675 arquivos inventariados;
- 739 itens de `Item_por.txt`;
- 379 skills de `Skill_por.txt`;
- 545 monstros de `Data/Monster/Monster.txt`;
- 3144 spawns/NPCs/spots de `MonsterSetBase.txt`;
- 352 produtos de Cash Shop;
- 147 Event Item Bags.

Arquivos JSON principais:

- `inventory.json`
- `items.json`
- `skills.json`
- `monsters.json`
- `monster-spawns.json`
- `maps-summary.json`
- `cash-shop-products.json`
- `event-item-bags.json`
- `cms-modules.json`
- `summary.json`

API somente leitura criada:

```text
GET /api/muserver-export/summary
GET /api/muserver-export/cms-modules
GET /api/muserver-export/inventory
GET /api/muserver-export/items
GET /api/muserver-export/skills
GET /api/muserver-export/monsters
GET /api/muserver-export/monster-spawns
GET /api/muserver-export/maps
GET /api/muserver-export/cash-shop-products
GET /api/muserver-export/event-item-bags
GET /api/muserver-export/files/:group
```

Esses arquivos devem virar fonte oficial para popular CMS, wiki, loja, eventos, drops, mapas e administracao.

## Etapas de migracao do legado hospedagem web

O site atual do hospedagem web/sistema web atual deve ser tratado como fonte legada, nao como base principal do novo produto.

Etapas:

1. **Catalogar**
   - Backup cPanel salvo fora do projeto.
   - Catalogo seguro gerado em `references/web-source-current/catalog.json`.
   - Documento gerado em `docs/current-web-source-catalog.md`.

2. **Separar por dominio**
   - Admin/contas/personagens.
   - Itens/tooltips/imagens.
   - Loja/marketplace/warehouse.
   - Pagamentos/recargas.
   - Conteudo publico/Wiki/noticias/downloads.

3. **Criar API read-only**
   - Modulo criado: `apps/api/src/modules/web-source`.
   - Objetivo: consultar o legado sem expor credenciais nem acoplar PHP antigo ao app novo.

4. **Criar painel de migracao**
   - Pagina: `apps/web/pages/painel/admin/fontes-web.vue`.
   - Objetivo: ver o que existe, priorizar e decidir o que virar CMS/Wiki/Loja.

5. **Normalizar para o nosso banco**
   - Converter dados de `ServerData` e assets em entidades nossas.
   - Deduplicar imagens e itens.
   - Vincular item, tooltip, imagem, tipo, classe, temporada e modulo.

6. **Publicar por modulo**
   - Wiki consome dados normalizados.
   - Loja consome catalogo aprovado.
   - Admin edita apenas via API com permissao/auditoria.

7. **Reaproveitar em outros projetos**
   - Manter componentes e modulos sem depender do tema Blood Moon quando possivel.
   - Parametrizar cores, nome do servidor, versao, fontes de dados e regras de permissao.

## Modulos independentes alvo

```text
core-auth          login, roles, sessoes, permissoes
core-audit         auditoria e trilha de acoes
cms-content        noticias, paginas, banners, downloads
wiki-engine        personagens, itens, mapas, drops, tutoriais
commerce-shop      loja oficial e catalogo aprovado
commerce-market    marketplace player-to-player
finance-recharge   recargas, moedas, webhooks e comprovantes
game-bridge        leitura/escrita segura no SQL Server/MuServer
legacy-importers   fonte web atual, arquivos MuServer, fontes externas
visual-assets      referencias, imagens aprovadas, remasterizacoes
```

Cada modulo deve ter:

- API propria;
- tipos/contratos claros;
- pagina admin quando precisar de operacao;
- README curto;
- regras de seguranca;
- caminho de importacao/exportacao.

## Modulos do produto

### Core

- autenticacao;
- contas;
- personagens;
- permissoes;
- auditoria;
- configuracoes globais;
- logs;
- notificacoes;
- tarefas agendadas.

### CMS publico

- noticias;
- downloads;
- paginas institucionais;
- sliders/heros;
- SEO;
- banners;
- guias/tutoriais;
- biblioteca de assets.

### Wiki

- personagens;
- classes/evolucoes;
- skills;
- equipamentos;
- sets;
- armas e escudos;
- asas;
- joias;
- itens excellent;
- itens ancient;
- itens socket;
- itens mastery;
- mapas;
- spots;
- monstros;
- drops;
- bosses;
- quests;
- NPCs;
- eventos.

### Servidor MU

- status do servidor;
- ranking;
- resets/master resets;
- moedas;
- cash shop;
- requisitos de reset;
- recompensas;
- eventos custom;
- drops custom;
- comandos;
- configurações de mapas;
- bots/NPCs custom;
- quests custom.

### Loja e marketplace

- produtos administrativos;
- pacotes de recarga;
- historico de compras;
- entrega de itens;
- marketplace player-to-player;
- fila de ponte com o jogo;
- bloqueio/liberacao de item;
- auditoria financeira.

### Revenda/ecossistema

Para vender sistemas e servidores no futuro, separar o produto em modulos ativaveis:

- tema visual;
- pacote de conteudo;
- modulo de loja;
- modulo de marketplace;
- modulo de wiki;
- modulo de rankings;
- modulo de eventos;
- modulo de admin avanzado;
- conector SQL Server;
- conector MuServer files;
- gerador de site estatico;
- instalador/assistente de deploy.

## Plano de migracao dos dados do servidor

### Fase 1 - Inventario

- mapear todos os `.txt`, `.dat`, `.ini`, `.bmd` e fontes relevantes;
- classificar por dominio: itens, skills, monstros, mapas, eventos, cash shop, custom;
- gerar manifestos legiveis em JSON;
- registrar arquivos nao parseados e motivo.

### Fase 2 - Parsers

Criar parsers por tipo:

- item database;
- tooltip de item;
- skills;
- monstros;
- monster set base/spawns;
- cash shop;
- event item bags;
- custom drops;
- custom quests;
- reset/master reset;
- maps/move/gates.

### Fase 3 - Normalizacao

Transformar arquivos MU em objetos de CMS:

- `EquipmentSet`;
- `EquipmentItem`;
- `ItemOption`;
- `CharacterClass`;
- `Skill`;
- `Map`;
- `Monster`;
- `DropTable`;
- `Event`;
- `Quest`;
- `Npc`;
- `ShopProduct`;
- `ServerRule`.

### Fase 4 - API

Expor tudo por API:

- leitura publica para wiki/site;
- leitura administrativa para CMS;
- escrita administrativa com permissao;
- auditoria obrigatoria;
- importacao versionada.

### Fase 5 - Painel administrativo

O painel admin deve controlar o site inteiro:

- criar/editar noticias;
- editar wiki;
- subir imagens;
- editar itens/equipamentos;
- editar loja;
- editar downloads;
- revisar drops/eventos;
- gerenciar contas/personagens;
- configurar recargas/moedas;
- acompanhar fila de integracao com jogo;
- ver auditoria.

## Decisoes importantes

- O CMS deve ser modular, nao uma tela gigante.
- O MuServer e o SQL Server sao fontes sensiveis e devem ficar atras da API.
- O conteudo pode ser importado dos arquivos do servidor, mas toda edicao administrativa precisa registrar origem, usuario e data.
- Para revenda, cada servidor deve poder ter tema, regras e dados proprios sem alterar o core.

## Proximas tarefas recomendadas

1. Criar inventario JSON do backup do MuServer.
2. Criar parsers iniciais para `Item_por.txt`, `Skill_por.txt`, `Monster.txt`, `MonsterSetBase.txt`, `CashShopProduct.txt` e `EventItemBag`.
3. Comparar os dados importados com o que ja existe em `knowledge/`.
4. Consolidar duplicados e marcar lacunas.
5. Popular a API/wiki a partir da base consolidada.
6. Criar telas admin para importar, revisar, aprovar e publicar dados.
7. Preparar deploy hibrido: frontend no LiteSpeed e API Node separada, caso a empresa nao aceite Node no mesmo ambiente.

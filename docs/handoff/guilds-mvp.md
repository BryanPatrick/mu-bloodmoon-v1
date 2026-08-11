# Guilds MVP — resultado da implementação

Etapa "Guilds MVP" (planejamento aprovado em `docs/handoff/` desta sessão). Diretório
público `/guilds`, perfil `/guild/[slug]` e administração `/painel/admin/guildas`.
Backend + frontend + testes E2E + build verificados nesta sessão.

## 1. Migrations criadas

- `apps/api/prisma/migrations/20260811210000_guilds_foundation/migration.sql`
  — 15 tabelas novas (`Guild`, `GuildMember`, `GuildJoinRequest`,
  `GuildFocusAssignment`, `GuildLevelConfig`, `GuildXpConversionRule`,
  `GuildRequest`, `GuildProject`, `GuildMedia`, `GuildTreasury`,
  `GuildTreasuryBalance`, `GuildVault`, `GuildVaultItem`, `GuildMovement`,
  `GuildMovementApproval`), 10 enums novos, mais uma foreign key
  (`Guild.foundedByAccountId -> Account`). Sem `ALTER TABLE` em modelos
  existentes (as duas back-relations em `Account`/`AccountCharacter` são
  campos de relação virtuais, não colunas reais).
- Verificado com as 20 migrations do projeto aplicadas em sequência, do zero,
  em um container MariaDB descartável (nunca `bloodmoon-mysql`).
- Ajuste feito **depois** da verificação inicial: o índice
  `GuildJoinRequest_guildId_characterId_status` deixou de ser `UNIQUE` (era
  um bug real -- ver seção 9).

## 2. Testes executados e resultado

`apps/api/test/guilds.e2e-spec.ts` — **14/14 passando**, dois runs
consecutivos, contra um container MariaDB descartável dedicado
(`bloodmoon-e2e-guilds`). Cobre:

- criação admin-only (403 para player comum, 403 para role `ADMIN` sem a
  permissão, 401 anônimo, 201 para `SUPER_ADMIN` com a permissão);
- slug auto-sufixado em nome duplicado;
- Tesouraria semeada com as 7 chaves de recurso, todas zeradas;
- autorização de edição (não-membro 403, líder 200);
- fluxo de entrada com aprovação (solicitação → listagem restrita a
  LEADER/OFFICER → aprovação → membro real);
- troca de papel (apenas LEADER, 403 para o próprio membro);
- expulsão (exige motivo, exige LEADER/OFFICER);
- saída (líder bloqueado enquanto houver outros membros; membro comum sai
  normalmente; reentrada após expulsão funciona);
- CRUD de `GuildRequest` (disclaimer automático em `LOOKING_FOR_ITEM`);
- CRUD de `GuildProject` (criação exige LEADER/OFFICER/TREASURER);
- CRUD admin de nível e regra de XP, **com asserção de que criar/ativar uma
  regra nunca altera `GuildTreasuryBalance`**;
- suspensão/restauração administrativa (exige motivo).

`npm run api:check` (scaffold + segurança + observability + roadmap + store +
marketplace + community + admin-tasks + admin-reports + guilds + `tsc
--noEmit`) — **OK**, zero erros.

`npm run web:build` — **build completo, zero erros/warnings**.

`eslint` nos arquivos próprios (backend, frontend, testes, scripts) — **zero
erros** (um warning de import não utilizado, corrigido).

Não executado: teste E2E de upload de emblema/banner (fixtures de imagem
binária ficaram fora do escopo desta rodada por tempo) — ver pendências.

## 3. Arquivos criados/alterados

**Novos:**
- `apps/api/prisma/migrations/20260811210000_guilds_foundation/`
- `apps/api/src/modules/guilds/` (`guilds.contract.ts`,
  `guilds.service.ts`, `guilds.controller.ts`, `guilds-admin.service.ts`,
  `guilds-admin.controller.ts`, `guilds-media.service.ts`,
  `guilds.module.ts`, `README.md`)
- `apps/api/src/common/bigint-json.ts` (fix de serialização, ver seção 9)
- `apps/api/scripts/check-guilds-structure.mjs`
- `apps/api/test/guilds.e2e-spec.ts`
- `apps/web/composables/useGuildsApi.ts`
- `apps/web/pages/guilds/index.vue`, `apps/web/pages/guild/[slug].vue`,
  `apps/web/pages/painel/admin/guildas.vue`
- `apps/web/components/guild/` (`GuildProfileHeader.vue`,
  `GuildProfileTabs.vue`, `GuildDirectoryFilters.vue`,
  `GuildPlaceholderView.vue`)
- `apps/web/components/admin/guilds/GuildsAdminManager.vue`

**Alterados (diff pequeno e aditivo em cada um, conforme disciplina de
arquivos compartilhados combinada no plano):**
- `apps/api/prisma/schema.prisma` — bloco `-- Guilds --` no final do arquivo
  + duas back-relations em `Account`/`AccountCharacter`.
- `apps/api/src/app.module.ts` — import + entrada em `imports` +
  string em `apiModules`.
- `apps/api/src/main.ts` — import do fix de BigInt + rota estática
  `/api/media/guild` (paralela à já existente `/api/media/community`).
- `apps/api/src/modules/auth/permissions.ts` — 5 chaves admin +
  `guildsAccess` para players.
- `apps/web/data/security.ts` — espelho byte-a-byte das mesmas chaves.
- `apps/web/components/layout/ManagementShell.vue` — 1 entrada em
  `playerItems` (`/guilds`) + 1 entrada com 14 filhos em
  `administrativeItems` (`/painel/admin/guildas`).
- `apps/api/package.json` — `check-guilds-structure.mjs` encadeado no
  script `check`.

Nenhum arquivo de Marketplace/Loja/Mercado Pago/RechargeIntent/PaymentsModule
foi tocado (ver seção 9).

## 4. Rotas implementadas

**Públicas/jogador** (`/guilds`, ver `apps/api/src/modules/guilds/guilds.controller.ts`):
`GET /guilds`, `GET /guilds/mine`, `GET /guilds/:slug`,
`PATCH /guilds/:slug`, `GET /guilds/:slug/members`,
`GET /guilds/:slug/requests`, `GET /guilds/:slug/projects`,
`GET /guilds/:slug/treasury`, `GET /guilds/:slug/vault`,
`POST /guilds/:slug/emblem`, `POST /guilds/:slug/banner`,
`POST /guilds/:slug/join`, `GET /guilds/:slug/join-requests`,
`POST /guilds/:slug/join-requests/:id/approve`,
`POST /guilds/:slug/join-requests/:id/reject`,
`DELETE /guilds/:slug/members/me`, `PATCH /guilds/:slug/members/:id/role`,
`DELETE /guilds/:slug/members/:id`,
`POST|PATCH|DELETE /guilds/:slug/requests(/:id)`,
`POST|PATCH|DELETE /guilds/:slug/projects(/:id)`.
**Sem `POST /guilds` público** (criação é admin-only nesta rodada).

**Admin** (`/admin/guilds`): `GET /admin/guilds`, `GET /admin/guilds/:id`,
`POST /admin/guilds` (única via de criação), `POST /admin/guilds/:id/actions`
(suspender/restaurar/dissolver), `GET|POST|PATCH /admin/guilds/config/levels(/:id)`,
`GET|POST|PATCH|DELETE /admin/guilds/config/xp-rules(/:id)`,
`GET /admin/guilds/reports`.

> Desvio deliberado do plano original: as rotas de config ficaram em
> `config/levels` e `config/xp-rules` (2 segmentos), não
> `level-config`/`xp-rules` (1 segmento) — um path de 1 segmento colidiria
> com `GET /admin/guilds/:id` na ordem de registro do Express/Nest.

## 5. Telas implementadas

- `/guilds` — diretório com hero, blocos de destaque (Todas/Recrutando/
  Maiores/Guild Level/PvP/Castle Siege/Boss/Farm — todos mapeados para
  filtros reais, nenhum mock), busca, filtros (recrutamento/foco/ordenação),
  grid responsivo, paginação, drawer de filtros no mobile.
- `/guild/[slug]` — header (emblema, nome, tag, descrição, Guild Level/XP,
  membros, líder, foco) + 14 abas: Visão Geral, Membros, Guild Level, Guild
  XP, Solicitações, Projetos (reais) · Tesouraria, Cofre (Tier B, reais e
  vazios) · Feed, Eventos, Guias, Conquistas, Estatísticas, Alianças (Tier C,
  `GuildPlaceholderView` com badge "Preview"/"Em breve").
- `/painel/admin/guildas` — Guildas, Níveis, Regras de XP, Membros,
  Tesouraria, Cofre, Relatórios, Auditoria (reais) · Papéis, Solicitações,
  Projetos, Guias, Eventos, Alianças (preview, "Em breve", sem nenhuma ação
  perigosa renderizada).
- Nav: `/guilds` em `playerItems`; seção "Guildas" com 14 filhos em
  `administrativeItems`, cada filho gated pela permissão correspondente.

## 6. O que está funcional

- CRUD completo de Guild (admin-only na criação), GuildMember, GuildJoinRequest,
  GuildFocusAssignment, GuildRequest, GuildProject.
- Upload real de emblema/banner (Sharp, mesmo pipeline de validação de
  bytes/dimensão/MIME real do `MediaService`, agora também servido
  estaticamente em `/api/media/guild`).
- Tesouraria e Cofre: modelo real, auditável, semeado, **somente leitura**.
- Admin: níveis e regras de XP com CRUD real (regra nunca executa: `active`
  nasce `false`, nenhum endpoint consome as regras).
- RBAC granular ponta a ponta (5 chaves admin + 1 chave de jogador),
  confirmado por teste que `role: ADMIN` sozinho não dá acesso.
- Toda mutação grava em `ObservabilityService.recordOperationalEvent` com
  `module: 'guilds'` (substrato para uma futura Chronicle/histórico).

## 7. O que continua PREVIEW/EM BREVE

- Feed, Eventos, Guias, Conquistas (membro e guilda), Estatísticas, Alianças
  — sem modelo novo, `GuildPlaceholderView` explícito.
- Papéis customizados por guilda (além de LEADER/OFFICER/TREASURER/MEMBER/
  RECRUIT) — documentado, não implementado.
- Leitura administrativa cruzada de Solicitações/Projetos entre guildas —
  não construída nesta rodada (cada guilda já expõe as suas próprias na
  página pública/de membro).
- `GuildMovement`/`GuildMovementApproval` — schema existe, nenhum endpoint
  lê ou escreve.
- Sincronização com MU, Alliance funcional, execução de
  `GuildXpConversionRule` — **não implementados, por instrução explícita**.

## 8. Prints ou descrição da renderização desktop/mobile

Não há acesso a captura de tela neste ambiente (painel do navegador não
compositava frames), então a verificação foi por texto/DOM/console via
Chrome headless:

- **Desktop** (`/guilds`): hero, 8 blocos de destaque, busca, sidebar de
  filtros fixa, grid de 2 colunas — renderiza sem erro de console, estado de
  erro gracioso quando a API não está no ar ("Não foi possível carregar as
  guildas agora." + "Tentar novamente").
- **Mobile 375px** (`/guild/[slug]`): sem erro de console, sem overflow
  horizontal perceptível, estado de erro gracioso idêntico ao desktop.
- **Admin** (`/painel/admin/guildas` sem sessão): redireciona para `/login`
  como as demais páginas administrativas, sem erro de console.
- `npm run web:build`: build de produção completo, 0 erros, 0 warnings,
  chunk `useGuildsApi` presente na saída.

Verificação com dados reais (guilda populada) não foi feita nesta sessão —
exigiria subir a API contra um banco com o schema migrado; a cobertura E2E
(14 cenários reais ponta a ponta) é a validação funcional principal.

## 9. Conflitos encontrados com o outro agente

- Confirmado duas vezes durante a sessão: o outro agente commitou
  `40055e6 feat(commerce): unify official store and player marketplace`
  enquanto esta etapa estava em andamento.
- **Nenhum arquivo de Marketplace/Loja/Mercado Pago/RechargeIntent/
  PaymentsModule foi tocado.**
- `git status` antes de cada edição em arquivo compartilhado (e novamente
  antes deste commit) confirmou: `apps/api/src/modules/auth/captcha.service.ts`,
  `apps/api/scripts/seed-test-accounts.mjs`, `scripts/start-dev.ps1`,
  `package.json` (raiz), `docs/design/asset-inventory.md`,
  `docs/design/figma-handoff-v1.5.md`, `apps/web/public/assets/` e
  `scripts/build-figma-asset-manifest.mjs` têm alterações não commitadas do
  outro agente -- **nenhum desses entra neste commit.**

## 10. Bugs reais encontrados e corrigidos durante a validação

Os testes E2E pegaram dois bugs genuínos antes de qualquer usuário real:

1. **BigInt não serializa em JSON** — `GuildTreasuryBalance.availableAmount`/
   `reservedAmount` e `GuildXpConversionRule.amountRequired` são `BigInt`
   (Zen chega à casa dos bilhões); o serializador padrão do Express quebrava
   com 500 em qualquer resposta que os incluísse. Corrigido com
   `apps/api/src/common/bigint-json.ts` (patch de `BigInt.prototype.toJSON`,
   importado tanto em `main.ts` quanto em `app.module.ts` para cobrir também
   os testes E2E).
2. **`GuildJoinRequest` com `@@unique` errado** — o índice único original
   cobria `(guildId, characterId, status)` para todos os status, não apenas
   `PENDING`. Um personagem que saía e reentrava numa guilda colidia com sua
   própria solicitação `APPROVED` anterior. Corrigido: o índice virou não-único
   (`@@index`) e "no máximo uma solicitação PENDING viva" passou a ser
   garantido na camada de serviço (`guilds.service.ts`, `join()`).
3. **Gap descoberto por inspeção, não pelos testes**: `main.ts` já servia
   `storage/community-media` estaticamente mas nada servia
   `storage/guild-media` — emblemas/banners enviados dariam 404. Corrigido
   com a mesma rota estática, em `/api/media/guild`.

## Pendências para a próxima etapa

- Teste E2E de upload de emblema/banner com fixtures de imagem reais.
- Balanceamento real de `GuildLevelConfig`/`GuildXpConversionRule` (números
  atuais são placeholder).
- Decidir e implementar o fluxo de criação de guilda pós-MVP (self-service
  vs. `GuildClaimRequest` para guildas `GAME`/`IMPORTED`).
- Sincronização real com o banco do jogo (schema de guild do MU ainda não
  auditado neste projeto).
- Motor de Quests/Achievements/Events de guilda, Alliance funcional,
  execução real de `GuildXpConversionRule` e de `GuildMovement` — todos
  explicitamente fora de escopo desta etapa.
- Leitura administrativa cruzada de Requests/Projects entre guildas.

---
status: LIVING_DOCUMENT
category: gameserver/database
audience: internal (engineering)
lastVerified: 2026-08-30
---

# GameServer database lab — source chain, creation, and validation

This document records exactly how the local GameServer¹ database laboratory
was built, per Bryan's "GAMESERVER DATABASE LAB" instructions (2026-08-30):
search locally first, only obtain a production backup if nothing sufficient
already exists locally. **A local copy was found and was sufficient — no
new production backup was created this round.**

## Part 16 fields (source chain)

```
SOURCE_TYPE          = EXISTING_LOCAL_COPY
SOURCE_PATH          = D:\MU\MU-Server\Database\pre-web-migration-20260716-095739\MuOnline_COPY_ONLY.bak
SOURCE_DATE          = 2026-07-16 09:57:58 (backup finish time, from RESTORE HEADERONLY)
SOURCE_DB_VERSION    = SQL Server 2014 (12.0.2000.8), Enterprise Edition, compatibility level 120 -- confirmed via the backup's own manifest and RESTORE HEADERONLY
LAB_CREATED_AT       = 2026-08-30 (this round)
SANITIZATION_VERSION = 1 (references/game-data/sql-discovery/gameserver-lab-20260830/sanitize-lab.sql)
```

## Part 1 — Local search (exhaustive, read-only)

Searched `D:\MU\` recursively for `*.bak`/`*.trn`/`*.mdf`/`*.ldf`/`*.bacpac`/
`*.dacpac` plus every backup-shaped archive (`*.zip`/`*.7z`/`*.rar`) and
every directory Bryan named (backup, database, sql, gameserver, restore,
dump, production, remoteops, etc.). Exactly **one** genuine GameServer²
SQL Server³ backup candidate was found:

| Field | Value |
|---|---|
| Path | `D:\MU\MU-Server\Database\pre-web-migration-20260716-095739\MuOnline_COPY_ONLY.bak` |
| Size | 705,024 bytes (~688 KB) |
| Modified | 2026-07-16 |
| Sibling files | `README.txt`, `backup-manifest.json`, `MuServer-no-live-logs.zip`, `MuServer-live-logs-copyable.zip` (the same snapshot's game-file copy, not database-related) |
| Origin (from `README.txt`/`backup-manifest.json`) | Real production VPS, `WIN-K82J9TU944D`, Windows Server 2012 R2, SQL Server 2014, downloaded and validated at the time (SHA256 of both the ZIP and the `.bak` matched the originals on the VPS, ZIP entry counts confirmed) |
| Database name | `MuOnline` (confirmed via `RESTORE HEADERONLY`) |
| Backup type | Full database backup, `COPY_ONLY` (confirmed: `IsCopyOnly=1`, `BackupTypeDescription=Database`) |

Every other `.bak`/`.zip`/`.rar`/`.sql`/`.gz` match found in `D:\MU\` was
either: a Launcher/client build artifact (irrelevant), a **Portal** MySQL⁴
backup (`database.sql.gz`, `mubloodxz_bloodmoon.sql.gz` — cPanel-hosted
MySQL, a completely different database from the GameServer's SQL Server),
or a cPanel web-hosting file backup — none of these are GameServer SQL
Server candidates. This was confirmed by reading actual file content/
naming conventions, not by extension alone, per Bryan's explicit
instruction not to search by filename only.

## Part 2 — Existing local SQL Server databases

Before this round, the local SQL Server 2022 instance
(`docs/environment/sql-server-test-environment.md`) had only system
databases plus the synthetic `bloodmoon_gamebridge_test` created in the
prior round. **No previously-restored real GameServer database existed
locally.**

## Part 3 — Validation against known production metadata

Before trusting the candidate, its schema was compared against real,
live production metadata already confirmed this session via `bm-sql`
(read-only, `bloodmoon_observer`):

| Check | Production (live, 2026-08-30) | Backup candidate (2026-07-16, after restore) | Result |
|---|---|---|---|
| Foreign keys⁵ in the whole database | Exactly 1 (`FK_CustomQuest_Character`, `CustomQuest.Name → Character.Name`, `ON DELETE CASCADE`) | Exactly 1, identical name/columns/action | MATCH |
| `CustomMarketShop` columns | `ItemGUID`(PK)/`AuthCode`/`SellerAccount`/`SellerName`/`Price`/`PriceType`/`Item`/`Tax` | Byte-for-byte identical (same types, same lengths) | MATCH |
| `T_FriendMain`/`T_FriendList`/`T_WaitFriend` columns | `T_FriendMain`(PK=`GUID`,+`Name`), `T_FriendList`(no PK, `GUID`/`FriendGuid`/`FriendName`/`Del`), `T_WaitFriend`(no PK, `GUID`/`FriendGuid`/`FriendName`) | Byte-for-byte identical | MATCH |

**Conclusion: this backup's schema is a current, exact match for live
production as of today**, despite the backup's data being 6 weeks old.
No schema drift was found between 2026-07-16 and 2026-08-30 for any table
checked.

## Local copy classification

**`USABLE_BUT_STALE`** — real, valid, structurally complete (138 tables,
86 stored procedures, 2 views, 1 trigger, exactly the 1 real FK), schema
confirmed identical to live production, but the *data* reflects
2026-07-16 (4 real accounts, 12 characters) rather than today's larger
roster (9 accounts as of this session's earlier read-only checks). For
the lab's actual purpose — testing GameBridge⁶ against realistic
structure and real relationships — staleness of row count does not
reduce usefulness; the schema and relationship shapes are what matter,
and both are current.

**Decision: sufficient. No new production backup was created this
round**, per Bryan's explicit rule ("Do NOT create a production backup if
a sufficiently current and complete local copy already exists").

## Part 7 — Restore (twice, deliberately)

Two independent restores were performed from the same `.bak` file, each
preceded by an explicit safety-gate check (`SERVER=localhost`,
`DATABASE=<expected lab name>`, `ENVIRONMENT=NON_PRODUCTION`, fail closed
otherwise):

1. **`bloodmoon_gameserver_raw_analysis`** — the preserved, read-only
   source copy. Used only for the schema-parity validation in Part 11
   below; not further modified after that.
2. **`bloodmoon_gameserver_lab`** — the disposable working copy that was
   actually sanitized and is used for all GameBridge testing.

This matches the pattern Bryan specified exactly: raw `.bak` (source) →
read-only preserved source (`_raw_analysis`) → sanitized lab (`_lab`).

**Real issue found and fixed during restore**: both databases came in
with `dbo` owned by a login SID that could not be cleanly impersonated
via `WITH EXECUTE AS OWNER` (the technique `bm_AnonymizeGameAccount`
depends on) — a classic cross-server-restore ownership artifact. Fixed
with `ALTER AUTHORIZATION ON DATABASE::<db> TO sa;` on both databases.
**This is a required step for anyone restoring this specific backup file
in the future**, not a one-off fix; recorded here so it isn't
rediscovered from scratch.

## Part 8 — Personal/sensitive data classification

See `docs/gameserver/database/privacy-data-map.md` for the full field-by-
field classification. Summary: real player identity (login, character
names, email, IP addresses, home address/phone/security-question fields
on `MEMB_INFO`, IP addresses on several `DmN_*` audit-log tables) was
found and classified — all of it was either removed or **pseudonymized**
(see terminology note below) before the lab was considered usable.

## Part 9 — Logical relationship discovery

See `docs/gameserver/database/logical-relationships.md`. Built from the
REAL data before any value was rewritten — most importantly, this
uncovered that `T_FriendMain` contains 5 rows (of 17) referencing
character names that no longer exist in the `Character` table (orphaned
friend-system entries from deleted/renamed characters) — a genuine edge
case, preserved intentionally in the lab rather than "cleaned up."

## Part 10 — Sanitized lab creation

`references/game-data/sql-discovery/gameserver-lab-20260830/sanitize-lab.sql`
is the full, real script used. It builds three small mapping tables
(`dbo.LabLoginMap`, `dbo.LabNameMap`, `dbo.LabGuildMap`, `dbo.LabIpMap`,
kept **inside** `bloodmoon_gameserver_lab` itself as a permanent, in-database
record of the mapping — not dropped after use) from the real distinct
values actually present, then applies the substitution consistently
across every table that references each identity: `MEMB_INFO`,
`AccountCharacter`, `Character`, `Guild`, `GuildMember`, `CustomMarketShop`,
`CashShopData`, `warehouse`, `T_FriendMain`/`T_FriendList`/`T_WaitFriend`,
and the `DmN_*` audit-log tables that had real IP/login data.

### Terminology — precise, per Bryan's instruction

Every substitution in the lab is a **deterministic 1:1 mapping**, fully
recorded in `sanitize-lab.sql` and in the `Lab*Map` tables inside the lab
database itself. Anyone holding this script and the original backup
**can** link a lab value back to the real value it replaced. This is
**PSEUDONYMIZATION**, not anonymization — the lab documentation never
calls it "anonymized" data, precisely because that would overstate the
privacy guarantee.

### What was preserved deliberately

- Real relationship shapes: guild mastership (`labacct01`/`LabChar06` is
  a real guild master; `labacct03`/`LabChar12` is a real guild master
  *and* has 5 real active `CustomMarketShop` listings — a genuine
  compound-block test case).
- Real reset-count edge cases: 104 and 102 resets (the two highest-value
  real characters in this snapshot), now safely pseudonymized.
- The 5 orphaned `T_FriendMain` rows (character names with no matching
  live `Character` row).
- An account with zero characters is **not** present in this particular
  snapshot (all 4 real accounts have ≥1 character) — flagged here as a
  known gap in this specific lab's edge-case coverage, not silently
  assumed covered.

## Part 11 — Validation (raw vs. sanitized)

| Check | `_raw_analysis` | `_lab` (after sanitization) | Result |
|---|---|---|---|
| Tables | 138 | 142 (138 real + 4 new `Lab*Map` mapping tables) | Expected difference, documented |
| Foreign keys | 1 | 1 | MATCH |
| Stored procedures | 86 | 86 | MATCH |
| Views | 2 | 2 | MATCH |
| Triggers | 1 | 1 | MATCH |
| Row counts (`MEMB_INFO`, `Character`, `T_FriendMain`, `CustomMarketShop`, `Guild`, `DmN_IP_Log`) | 4 / 12 / 17 / 5 / 2 / 19 | identical | MATCH |

## Part 12 — GameBridge run against the lab

All four procedures (`bm_GrantVip`, `bm_SyncVipTier`, `bm_AnonymizeGameAccount`,
`bm_PurgeGameAccount`) were installed into `bloodmoon_gameserver_lab` and
exercised against the real (pseudonymized) data —
`references/game-data/sql-discovery/gameserver-lab-20260830/lab-gamebridge-test.sql`,
**11/11 checks PASS**, including:

- `GRANT_VIP`/`SYNC_VIP_TIER` on a real account.
- `ANONYMIZE_GAME_ACCOUNT` correctly `GUILD_MASTER_BLOCKED` on a real
  guild master, and on the compound guild-master+market-seller account
  (guild check fires first, exactly as designed).
- A full, successful `ANONYMIZE_GAME_ACCOUNT` pass on a clean real
  account, verified to remove exactly the one real friend-graph
  relationship it owned while leaving the 16 other rows (including the
  orphaned ones) untouched.
- `PURGE_GAME_ACCOUNT` on a real account with real dependencies across
  `Character`/`AccountCharacter`/`T_FriendMain`/`CashShopData`/`warehouse`,
  verified fully removed from every table, and idempotent on replay
  (`ALREADY_PURGED`).

This is a materially stronger validation than the prior round's 25-table
synthetic schema — same procedures, same result, now proven against the
real 138-table production structure with genuine relational edge cases.

## Part 15 — Raw copy retention recommendation

**Recommendation: `RETAIN_WITH_JUSTIFICATION`.**

Rationale: `bloodmoon_gameserver_raw_analysis` (the unsanitized restored
copy) is the only local artifact that lets a future session re-validate
the sanitized lab's fidelity, or re-derive a richer/updated lab if a
newer backup ever becomes available, without needing to re-obtain
production access. It contains real player PII (4 accounts' worth) and
must never leave this machine, never be committed, and access should stay
restricted to this local SQL Server instance. **Bryan approves
deletion/retention** — this is a recommendation, not a decision already
made.

## Glossary of this document

1. **GameServer**: the server where the game itself runs, distinct from
   the Portal. See `docs/glossary.md`.
2. **GameServer** (repeated for the numbered-footnote convention within
   this specific document, per the house style).
3. **SQL Server**: see `docs/glossary.md`.
4. **MySQL**: the database engine used by the Portal (`apps/api`) — a
   different database entirely from the GameServer's SQL Server.
5. **Foreign key (FK)**: see `docs/glossary.md`.
6. **GameBridge**: see `docs/glossary.md`.

## Addendum — Fase K Parte 1: retenção criptografada da cópia raw (2026-08-30)

Decisão de Bryan: `RAW_COPY_RETENTION = ENCRYPTED_SHORT_TERM_RETENTION`
— preservar o `.bak` original e a fonte de análise raw (investigação
adicional de dados/relacionamentos legados ainda pendente), mas com
acesso local restrito e em forma criptografada. **Nada foi apagado**,
conforme instrução explícita.

**O que foi feito, real e verificado:**

1. Uma cópia criptografada AES-256 do `.bak` original foi criada em
   `D:\MU\.secrets\gameserver-lab-raw-copy-encrypted\MuOnline_COPY_ONLY.bak.aes`
   — fora do repositório Git, no diretório `.secrets/` já usado pelo
   projeto para segredos locais (mesmo padrão de `.secrets/mu-server-ssh`,
   `.secrets/production-snapshots`).
2. A chave AES-256 + IV foi protegida via **DPAPI do Windows**
   (`DataProtectionScope.CurrentUser`) — o mesmo padrão de credencial
   DPAPI já usado para o MySQL local — e salva em
   `encryption-key.dpapi` no mesmo diretório. **Só pode ser
   descriptografada nesta máquina, por esta conta de usuário Windows.**
3. **ACL do diretório restrita** via `icacls` — apenas a conta de usuário
   atual e `BUILTIN\Administradores`, herança removida.
4. **Round-trip verificado**: o arquivo `.aes` foi descriptografado de
   volta para um arquivo temporário e comparado por SHA-256 contra o
   `.bak` original — **hash idêntico, confirmado byte a byte**, depois
   removido o arquivo temporário de teste.
5. O `.bak` original em texto claro (`D:\MU\MU-Server\Database\pre-web-migration-20260716-095739\MuOnline_COPY_ONLY.bak`)
   **NÃO foi movido, renomeado, nem apagado** — permanece exatamente
   onde estava, por instrução explícita ("Do NOT delete anything yet").

**Justificativa de retenção**: a cópia raw (criptografada) e o banco
`bloodmoon_gameserver_raw_analysis` continuam necessários porque a
investigação adicional de dados/relacionamentos legados mencionada por
Bryan (Parte 3, achados do DmN CMS) ainda está em aberto — remover a
fonte agora encerraria essa possibilidade de revalidação sem necessidade.

**Procedimento de destruição eventual** (quando Bryan aprovar):
1. `DROP DATABASE bloodmoon_gameserver_raw_analysis;` (o banco local
   restaurado, não o `.bak`).
2. Apagar `D:\MU\.secrets\gameserver-lab-raw-copy-encrypted\` inteiro
   (arquivo `.aes` + chave `.dpapi` — sem a chave, o `.aes` já é
   inutilizável, mas removê-lo por completo é mais simples que confiar
   só nisso).
3. Decidir separadamente sobre o `.bak` original em texto claro — este
   documento não recomenda apagá-lo junto: ele é a única fonte
   utilizável para reconstruir o laboratório do zero se necessário no
   futuro; sua remoção deveria ser uma decisão own separada, não um
   efeito colateral de limpar a cópia criptografada.

**Lacuna conhecida, reportada honestamente**: o banco
`bloodmoon_gameserver_raw_analysis` (a cópia JÁ RESTAURADA no SQL
Server local) não está protegido por Transparent Data Encryption (TDE)
— esta instância local do SQL Server não tem TDE configurado, e
configurá-lo é uma mudança de infraestrutura real fora do escopo desta
sessão. O controle compensatório hoje é apenas a restrição de acesso do
próprio SQL Server local (login Windows, sem exposição de rede) — não
uma criptografia real em repouso para esse banco especificamente
(distinto da cópia `.aes` do arquivo `.bak`, que É criptografada e
verificada). Recomendação: se a retenção continuar por muito tempo,
avaliar habilitar TDE nesta instância ou derrubar
`bloodmoon_gameserver_raw_analysis` e confiar apenas na cópia `.aes`
para uma eventual reconstrução futura.

## Addendum — Fase K (2026-08-30, mesmo dia, rodada de auditoria completa)

A auditoria completa das 138 tabelas (Fase K) encontrou vazamentos reais
de identidade não pseudonimizada deixados pela primeira versão de
`sanitize-lab.sql` (ver `privacy-data-map.md`, seção "Phase K hardening
addendum"). Isso exigiu um ciclo completo de reconstrução, não apenas
documentação:

1. `bloodmoon_gameserver_lab` foi **descartado e restaurado do zero**
   novamente a partir do mesmo `.bak` original (mesma fonte, mesmo
   `ALTER AUTHORIZATION` necessário — ver Parte 7 acima).
2. `sanitize-lab.sql` corrigido (9 tabelas antes vazando identidade real,
   agora pseudonimizadas; mais um conjunto de tabelas vazias reforçadas
   preventivamente) e reaplicado do zero contra a cópia fresca.
3. As quatro procedures `bm_*` (também corrigidas nesta rodada — ver
   `account-data-map.md`/`stored-procedures.md`) reinstaladas.
4. `lab-gamebridge-test.sql` reexecutado: **11/11 PASS** novamente,
   confirmando que as correções não quebraram nenhum comportamento já
   validado.
5. Uma correção adicional pequena (`RankingKingGuild` removida das duas
   procedures por comparar chave errada) exigiu reinstalar as procedures
   mais uma vez — os `GRANT EXECUTE` foram reaplicados (perdidos no
   `DROP`+`CREATE`), e a suíte completa do Agent (123/123) foi
   reconfirmada limpa.

**Conclusão**: o laboratório sanitizado de hoje (pós Fase K) é uma cópia
genuinamente mais segura que a versão criada na rodada anterior no mesmo
dia — a diferença entre as duas é registrada aqui deliberadamente, não
apagada, seguindo a regra do projeto de nunca sobrescrever histórico
silenciosamente.

## Histórico desta fase (GameServer Database Lab, 2026-08-30)

Registro cronológico desta rodada, para servir de "histórico de fase"
localizado neste documento (não existe hoje um documento único de linha
do tempo — ver a pendência registrada em `docs/README.md`):

1. Bryan instruiu buscar localmente primeiro, antes de qualquer acesso de
   backup a produção — mudança deliberada de abordagem em relação às
   rodadas anteriores (Fases D-I), que haviam usado acesso de leitura a
   produção diretamente.
2. Busca local exaustiva (Parte 1) encontrou um candidato real e único.
3. Candidato validado contra metadados reais de produção já confirmados
   nesta sessão (Parte 3) — MATCH completo, nenhuma nova consulta de
   leitura a produção foi necessária para a validação de schema em si.
4. Duas restaurações locais feitas deliberadamente (`_raw_analysis` +
   `_lab`), problema real de ownership pós-restore encontrado e corrigido
   (`ALTER AUTHORIZATION`), documentado como passo obrigatório reutilizável.
5. Classificação completa de dados pessoais/sensíveis feita ANTES de
   qualquer reescrita de valor (Parte 8 / `privacy-data-map.md`).
6. Relacionamentos lógicos mapeados a partir dos dados reais antes da
   sanitização (Parte 9 / `logical-relationships.md`) — descobriu as 5
   entradas órfãs em `T_FriendMain`, preservadas deliberadamente.
7. Script de sanitização (`sanitize-lab.sql`) escrito, executado,
   validado estruturalmente linha por linha contra a cópia raw (Parte 11).
8. As quatro procedures do GameBridge instaladas e testadas contra o
   laboratório real (Parte 12) — 11/11 PASS, incluindo os dois casos reais
   de bloqueio por guild master (um deles composto com vendedor ativo no
   market).
9. Recomendação de retenção da cópia raw registrada (Parte 15) —
   `RETAIN_WITH_JUSTIFICATION`, aguardando aprovação explícita de Bryan.
10. Conjunto de 11 documentos criado em `docs/gameserver/database/`
    (este documento, `database-overview.md`, `data-dictionary.md`,
    `logical-relationships.md`, `stored-procedures.md`,
    `views-triggers-functions.md`, `account-data-map.md`,
    `character-data-map.md`, `economy-data-map.md`,
    `privacy-data-map.md`, `legacy-unknown-structures.md`), `docs/README.md`
    atualizado, e o manual de operação técnica atualizado com os
    procedimentos de reconstrução do laboratório.

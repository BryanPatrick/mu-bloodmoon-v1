# Prisma

Schema oficial do backend Blood Moon.

## Banco alvo

- MySQL/MariaDB
- Prisma ORM
- `DATABASE_URL` obrigatoria em ambiente real

Exemplo local:

```bash
DATABASE_URL="mysql://bloodmoon:bloodmoon@localhost:53306/bloodmoon_portal"
```

Instalacao nova:

```bash
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

Banco que ja possuia todas as tabelas antes da baseline MySQL:

```bash
npx prisma migrate resolve --applied 20260718130000_mysql_baseline --schema apps/api/prisma/schema.prisma
```

Use `migrate resolve` somente depois de confirmar que o schema existente ja
corresponde ao `schema.prisma`. Ele registra a baseline sem recriar tabelas nem
apagar dados.

Nunca marque migrations funcionais como aplicadas apenas para permitir o boot.
Migrations de papeis, permissoes, suporte, moderacao e launcher precisam ter
seu SQL executado e suas tabelas conferidas no schema real. Em 2026-07-28, esse
atalho deixou `_prisma_migrations` divergente do MySQL e causou Prisma `P2021`
no login de producao.

## Areas atuais

- Contas, moedas e auditoria.
- Fontes de referencia.
- Entradas da base de conhecimento.
- Assets coletados.
- Relacao entre entradas e assets.
- Equipamentos consolidados.
- Variantes, pecas e opcoes de equipamentos.

## Schema

O deploy cPanel atual usa MySQL/MariaDB. Prefira `prisma migrate deploy`; use
`prisma db push` somente em banco vazio ou ambiente controlado.

O bootstrap do cPanel resolve automaticamente apenas a baseline MySQL e a
migration de sessao unica quando as tabelas preexistentes forem detectadas.
Demais migrations devem passar pelo fluxo normal de `migrate deploy`.

## Autorizacao

`Account.role` possui apenas `PLAYER`, `ADMIN` e `SUPER_ADMIN`.
`AccountPermission` permite concessoes ou revogacoes individuais sem alterar a
matriz base do papel. A migration `20260722120000_role_permissions` converte
papeis legados para `ADMIN` antes de restringir o enum.

Plano de importacao gerado a partir das referencias:

- `references/game-data/source-harvest/postgres-import-plan.json`
- `references/game-data/equipment-postgres-import-plan.json`

Gerar novamente:

```bash
node apps/api/scripts/prepare-source-harvest-import.mjs
npm run data:remap-equipment
```

Importar no banco:

```bash
npm run db:import
```

Contagens verificadas no MySQL de producao cPanel em 2026-07-16:

- `ReferenceSource`: 3
- `KnowledgeEntry`: 352
- `ReferenceAsset`: 1537
- `KnowledgeEntryAsset`: 1672
- `EquipmentRecord`: 1719
- `EquipmentVariant`: 2729
- `EquipmentPiece`: 2511
- `EquipmentOption`: 55
- `EquipmentClassLink`: 9414
- `EquipmentSeason`: 25990

Antes de aplicar em ambiente real:

1. Configurar MySQL/MariaDB.
2. Definir `DATABASE_URL`.
3. Rodar `npx prisma validate --schema apps/api/prisma/schema.prisma`.
4. Rodar `npx prisma db push --schema apps/api/prisma/schema.prisma` em banco vazio ou controlado.

Atalho local:

```bash
npm run db:setup
npm run db:import
```

Observacao: o `db:setup` nao cria banco automaticamente em hospedagem compartilhada; ele espera que o banco e usuario ja existam e aplica o schema Prisma.

## Regra

Nao misturar o banco do portal com o banco do servidor MU.

Dados do jogo entram por integracoes controladas, importadores ou views auditadas.

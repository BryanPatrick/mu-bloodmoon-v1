# Prisma

Schema oficial do backend Blood Moon.

## Banco alvo

- PostgreSQL
- Prisma ORM
- `DATABASE_URL` obrigatoria em ambiente real

Exemplo local:

```bash
DATABASE_URL="postgresql://bloodmoon:bloodmoon@localhost:55432/bloodmoon_portal?schema=public"
```

## Areas atuais

- Contas, moedas e auditoria.
- Fontes de referencia.
- Entradas da base de conhecimento.
- Assets coletados.
- Relacao entre entradas e assets.
- Equipamentos consolidados.
- Variantes, pecas e opcoes de equipamentos.

## Migracoes

A migration inicial da base de conhecimento fica em:

- `apps/api/prisma/migrations/20260630195500_knowledge_base/migration.sql`

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

Contagens verificadas no PostgreSQL local:

- `ReferenceSource`: 2
- `KnowledgeEntry`: 330
- `ReferenceAsset`: 1537
- `KnowledgeEntryAsset`: 1672
- `EquipmentRecord`: 1719
- `EquipmentVariant`: 2729
- `EquipmentPiece`: 2511
- `EquipmentOption`: 55

Antes de aplicar em ambiente real:

1. Configurar PostgreSQL.
2. Definir `DATABASE_URL`.
3. Rodar `npx prisma validate --schema apps/api/prisma/schema.prisma`.
4. Rodar migration em banco vazio ou ajustar se ja existir banco produtivo.

Atalho local:

```bash
npm run db:setup
npm run db:import
```

Observacao: o `db:setup` tenta usar Docker primeiro. Se o Docker estiver instalado mas o engine nao estiver saudavel, ele cria um cluster PostgreSQL local isolado em `work/postgres-data` na porta `55432`.

Parar o cluster local:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D work/postgres-data stop
```

## Regra

Nao misturar o banco do portal com o banco do servidor MU.

Dados do jogo entram por integracoes controladas, importadores ou views auditadas.

# Prisma

Schema oficial do backend Blood Moon.

## Banco alvo

- MySQL/MariaDB
- Prisma ORM
- `DATABASE_URL` obrigatoria em ambiente real

Exemplo local:

```bash
DATABASE_URL="mysql://bloodmoon:bloodmoon@localhost:3306/bloodmoon_portal"
```

## Areas atuais

- Contas, moedas e auditoria.
- Fontes de referencia.
- Entradas da base de conhecimento.
- Assets coletados.
- Relacao entre entradas e assets.
- Equipamentos consolidados.
- Variantes, pecas e opcoes de equipamentos.

## Schema

O deploy cPanel atual usa `prisma db push`, porque as migrations antigas foram geradas para PostgreSQL e ficam apenas como historico de desenvolvimento.

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

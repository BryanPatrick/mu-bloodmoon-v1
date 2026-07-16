# MuServer export

Dados extraidos do backup local do MuServer para alimentar a API, Wiki e CMS.

- Gerado em: 2026-07-16T15:22:32.273Z
- Backup: C:\Users\Admin\Documents\BloodMoonBackups\game-vps\pre-web-migration-20260716-095739
- ZIP: C:\Users\Admin\Documents\BloodMoonBackups\game-vps\pre-web-migration-20260716-095739\MuServer-no-live-logs.zip
- Origem extraida: C:\Users\Admin\Documents\Codex\2026-06-04\files-mentioned-by-the-user-texto\work\muserver-extracted\MuServer-stage

## Arquivos gerados

- `inventory.json`: inventario completo dos arquivos extraidos.
- `items.json`: itens de `Item_por.txt` normalizados por secao/tipo.
- `skills.json`: skills de `Skill_por.txt`.
- `monsters.json`: monstros de `Data/Monster/Monster.txt`.
- `monster-spawns.json`: NPCs, spots e spawns de `MonsterSetBase.txt`.
- `cash-shop-products.json`: produtos de `CashShopProduct.txt`.
- `event-item-bags.json`: bags/drops de `Data/EventItemBag/*.txt`.
- `summary.json`: totais e lacunas principais.

## Observacoes

- Todo registro preserva `source.file`, `source.line` e `source.raw` sempre que possivel.
- Parsers sao tolerantes para nao descartar linhas desconhecidas.
- Escrita no servidor do jogo deve passar por API, permissao, transacao e auditoria.

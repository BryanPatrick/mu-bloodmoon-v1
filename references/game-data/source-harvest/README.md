# Source Harvest

Coleta bruta e normalizada de fontes externas para migracao posterior ao PostgreSQL.

## Fontes

- GuiaMu Argentina: 217 paginas, 4775 imagens, 3 erros. Dados em `references/game-data/source-harvest/guiamu-com-ar/guiamu-com-ar-data.json`.
- Webzen MU Online Game Info PT: 219 paginas, 2297 imagens, 1 erro. Dados em `references/game-data/source-harvest/webzen-gameinfo-pt/webzen-gameinfo-pt-data.json`.

## Normalizacao

Arquivos:

- `normalized-index.json`
- `normalization-report.md`

Totais:

- 436 paginas brutas.
- 330 paginas canonicas.
- 106 paginas duplicadas colapsadas.
- 7072 registros brutos de imagem.
- 1537 imagens unicas por SHA1.

Plano PostgreSQL:

- `postgres-import-plan.json`
- 2 fontes.
- 330 entradas de conhecimento.
- 1537 assets.
- 1672 vinculos entre entradas e assets.
- 12 entradas off-topic.
- 45 entradas de temporada futura.
- 7 entradas detectadas como Season 6.

## Regra

Estes arquivos sao material de referencia interna e rastreabilidade.

Nao publicar imagens externas diretamente sem remasterizacao/autorizacao/revisao editorial.

Nao apagar esta pasta antes de importar e auditar o conteudo no PostgreSQL.

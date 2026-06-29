# Blood Moon Knowledge Library

Biblioteca canonica do projeto, organizada como uma estante editorial.

## Filosofia

- Primeiro catalogar a menor unidade confiavel: item, parte, regra, tutorial.
- Depois montar composicoes: sets, guias, paginas da wiki e sistemas.
- Referencias brutas continuam em `references/` ate serem auditadas.
- O app continua usando `apps/web/data` enquanto esta biblioteca amadurece.

## Estrutura

- `equipment/items/<categoria>/<item>/item.json`: objeto canonico do item.
- `equipment/items/<categoria>/<item>/README.md`: ficha humana do item.
- `equipment/sets/<set>/set.json`: composicao de set.
- `equipment/sets/<set>/README.md`: ficha humana do set.
- `topics/equipment/tutorials/<topico>/README.md`: prateleira de tutorial.
- `audit/source-inventory.json`: inventario de dados locais.
- `audit/redundancy-report.md`: candidatos de redundancia, sem exclusao automatica.

## Indice rapido

- Itens catalogados: 1719
- Sets catalogados: 454
- Tutoriais iniciais: 5
- Arquivos de fonte inventariados: 72

## Proxima regra de trabalho

Toda alteracao de wiki deve consultar esta biblioteca e, se a informacao nao estiver aqui, consultar a fonte bruta em `references/` antes de implementar.

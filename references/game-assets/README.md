# Game asset references

Este diretorio centraliza imagens e manifestos de assets externos usados como referencia visual e tecnica.

## Estrutura

- `muonlinefanz/elf/original`: imagens originais recebidas da pasta `Mu BloodMoon assets`, normalizadas para nomes consistentes.
- `muonlinefanz/elf/manifest.json`: catalogo principal da coleta da Elfa.
- `muonlinefanz/elf/comparison-report.json`: comparacao entre a lista conhecida da pagina Fairy Elf e os arquivos locais.
- `muonlinefanz/elf/duplicated-placeholders.json`: itens faltantes que foram preenchidos com uma imagem parecida e marcados como placeholder.
- `muonlinefanz/elf/elf-exclusive-items.json`: itens exclusivos ou tratados como ligados diretamente a Elfa.
- `webzen/bloodangel-mastery/original`: imagens originais da pagina oficial Webzen "1st Mastery Armors", salvas com o nome correto de cada item Bloodangel.
- `webzen/bloodangel-mastery/manifest.json`: catalogo da coleta Webzen com URL fonte, hashes, grupos de equipamentos e sets.
- `guiamuonline/items/original`: imagens originais de equipamentos, asas, sets e itens coletados do Guia MU Online.
- `guiamuonline/items/manifest.json`: catalogo completo da coleta Guia MU Online com nome, categoria, classes que usam, status de lista, detalhe tecnico e metadados de imagem.
- `shared/shared-items-from-elf-pass.json`: itens compartilhados que apareceram na pagina da Elfa, mas tambem podem ser usados por outras classes.
- `reference-index.json`: resumo da base e regra para evitar duplicados.
- `optimization-guidelines.md`: regras visuais para interpretar buffs, upgrades, +15 e criacao de versoes otimizadas.

## Regra de nomenclatura

- Nomes foram normalizados em kebab-case.
- `agi` foi convertido para `atk` nos arquivos copiados para referencias.
- A pasta original em Downloads nao foi alterada.

## Itens compartilhados

Itens que nao sao exclusivos da Elfa recebem:

- `ownership: "shared"`
- `usableBy`: lista inicial de classes que podem usar o item.

Essas listas foram preenchidas com base na pagina da Elfa e conhecimento de uso classico de MU Online. Quando novas classes forem importadas, o correto e mesclar o item ja existente e ampliar `usableBy`, sem duplicar a imagem.

## Duplicados futuros

Cada item no manifesto tem `sha1`. Nas proximas importacoes:

- se o hash ja existir, nao copiar novamente;
- apenas adicionar nova fonte/personagem ao catalogo;
- se o mesmo nome vier com imagem diferente, manter como variante.

## Marcas d'agua

Nao remover marcas d'agua de imagens de terceiros. As imagens originais ficam apenas como referencia.

Para publicacao ou melhor visual, criar uma versao nova em uma etapa separada, inspirada na essencia do item, mais limpa e legivel, sem depender da marca d'agua do arquivo original.

## Elementos que nao pertencem ao item

Algumas capturas in-game podem ter barras, faixas, brilhos de buff, indicadores de XP ou outros efeitos temporarios da interface/jogo. Esses elementos nao fazem parte do equipamento e nao devem ser replicados nas versoes otimizadas.

Exemplo importante: a barra diagonal vermelha/branca vista em uma referencia de equipamento e um buff de XP do jogo, nao um detalhe da armadura/arma.

## Brilho de upgrade/bless

Equipamentos diferentes podem aparecer com brilho intenso quando estao blessados/upados, como +1, +2 e progressao semelhante. Esse brilho representa estado de upgrade, nao necessariamente o visual base do item.

Ao otimizar uma imagem neutra do equipamento, manter brilho controlado e preservar a leitura do material, cor e silhueta. Usar brilho forte apenas quando a versao desejada for explicitamente um item blessado/upado.

Em equipamentos +15, podem aparecer efeitos brancos marcantes em forma de linhas, arcos ou "chifres" de energia ao redor do set. Esses efeitos sao aura de upgrade maximo e nao devem ser tratados como parte fisica fixa da armadura.

# MU Online Fanz - lote de guias de itens

Fontes desta rodada:

- https://muonlinefanz.com/guide/items/enhanced-sets/
- https://muonlinefanz.com/guide/items/enhanced-weapons/
- https://muonlinefanz.com/guide/items/mastery-weapons/
- https://muonlinefanz.com/guide/items/mastery-sets/
- https://muonlinefanz.com/guide/items/moss/
- https://muonlinefanz.com/guide/items/siege/
- https://muonlinefanz.com/guide/items/lucky/
- https://muonlinefanz.com/guide/items/wings/
- https://muonlinefanz.com/guide/items/necklace/
- https://muonlinefanz.com/guide/items/ring/
- https://muonlinefanz.com/tools/items/

Arquivo estruturado:

- `muonlinefanz-item-guides-batch-data.json`

## O que foi catalogado

- Enhanced Sets: Soul, Blue Eye, Silver Heart, Manticore, Brilliant e familias relacionadas.
- Enhanced Weapons: Soul, Blue Eye, Silver Heart e Manticore.
- Mastery Sets: Bloodangel, Darkangel e Holyangel.
- Mastery Weapons: Bloodangel, Darkangel e Holyangel.
- Moss Items: armas exclusivas de NPC Moss/Gambling Boxes.
- Siege Items: 380 items, Jewel of Guardian e opcoes PvP.
- Lucky Ticket Sets: tickets, durabilidade, Jewel of Extension e sets iniciais.
- Wings & Capes: wings classicas, opcoes de asa, opcoes elementais de 4a classe.
- Necklaces: pendants, resistencias, opcoes excellent/ancient/socket.
- Rings: aneis, resistencias, opcoes excellent/ancient.
- Item Database: ponto de entrada com 3090 itens listados.

## Slugs corrigidos

Alguns slugs antigos estavam em plural, mas os links informados e confirmados usam singular:

- `moss`
- `siege`
- `lucky`
- `wings`
- `necklace`
- `ring`

## Imagens

O navegador conseguiu identificar algumas URLs, mas o download local continua bloqueado pelo ambiente. URLs confirmadas:

- `https://muonlinefanz.com/guide/items/moss/data/graphics/moss-item.png`
- `https://image.webzen.net/Mu/guideImage/season10/img-06-01.png`
- `https://muonlinefanz.com/guide/items/wings/data/graphics/wing-example.png`

Quando a conexao local liberar, o crawler `scripts/mirror-muonlinefanz-assets.ps1` deve ser executado novamente para baixar tudo para `references/game-assets/muonlinefanz/site-mirror/original`.

## Uso planejado

- Criar paginas dedicadas para Wings, Rings, Necklaces, Siege, Moss e Lucky.
- Manter Mastery/Enhanced como `high-version-futuro`.
- Alimentar CRUD de equipamentos e o futuro tooltip/calculador de itens.
- Usar Item Database como fila para crawling de cada item individual.

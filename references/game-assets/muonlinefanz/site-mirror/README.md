# MU Online Fanz site mirror

Esta pasta e usada para espelhar imagens das paginas da MU Online Fanz que servem como referencias de desenvolvimento.

Script:

- `scripts/mirror-muonlinefanz-assets.ps1`

Saidas:

- `source-seeds.json`: paginas iniciais reais usadas pelo crawler.
- `source-pages.json`: paginas visitadas e links internos encontrados.
- `image-manifest.json`: lista de imagens encontradas, com origem e caminho local quando baixado.
- `download-report.json`: resultado do download de cada imagem.
- `original/`: imagens originais espelhadas quando a rede permitir.

Escopo do crawler:

- `https://muonlinefanz.com/guide/`
- `https://muonlinefanz.com/tools/items/`
- `https://muonlinefanz.com/tools/mobs/`
- `https://muonlinefanz.com/tools/maps/`

Observacoes:

- As imagens externas devem ficar como referencia original.
- Versoes otimizadas para o Blood Moon devem ser geradas separadamente.
- O crawler segue links internos das paginas, incluindo botoes/atalhos de navegacao no fim do conteudo.

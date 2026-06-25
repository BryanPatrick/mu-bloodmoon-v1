# Espelhamento de imagens externas

Objetivo: baixar ou catalogar imagens dos sites usados como referencia para o Blood Moon.

Fontes atuais:

- MU Online Fanz: guias, banco de itens, mapas, monstros e sistemas.
- MegaMu Forum: topico de skills e sistemas.
- Guia MU Online: catalogo de equipamentos, sets, asas e itens com imagens e detalhes tecnicos.

Status atual:

- O ambiente local nao conseguiu conectar diretamente ao dominio `muonlinefanz.com` usando PowerShell.
- O crawler foi preparado em `scripts/mirror-muonlinefanz-assets.ps1`.
- Quando a rede permitir, ele deve baixar imagens para `references/game-assets/muonlinefanz/site-mirror/original`.
- Enquanto isso, as imagens ja coletadas manualmente e as referencias enviadas pelo usuario seguem preservadas em `references/visual` e `references/game-assets`.
- Guia MU Online foi coletado via `scripts/collect-guiamuonline-items.mjs`, com imagens em `references/game-assets/guiamuonline/items/original` e manifesto em `references/game-assets/guiamuonline/items/manifest.json`.

Politica:

- Manter imagens de terceiros como referencia original.
- Nao remover marcas d'agua das referencias originais.
- Criar versoes otimizadas/proprias separadamente para uso visual no site.
- Registrar fonte e URL sempre que possivel.

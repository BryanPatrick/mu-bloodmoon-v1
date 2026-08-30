# Launcher Phase 1.5 — pack visual e fallback de assets

## Escopo e resultado

O shell aprovado permanece fixo em 1180×700, com as sete rotas, navegação, utilitários e updater da Fase 1. Esta fase altera somente a apresentação de imagens editoriais e não toca CMS de produção, Unified Account, GameBridge, economia ou inventário da loja.

## Classes de asset

**Estruturais (empacotados, sem CMS):** frame externo e superior, trilho e estados da navegação, chrome de botões, bordas e divisores, paleta/tipografia, indicadores, utility rail, Open Beta card, updater/status bar e placeholders vetoriais controlados. Estão em XAML/recursos versionados com o executável.

**Editoriais:** hero, campanha/Open Beta, banners de eventos/loja, capas e miniaturas de notícias, fundos discretos de Conta/Ranking/Configurações e estados neutros de cards/produtos. O catálogo autoritativo é `DefaultVisualAssetCatalog.cs`.

## Pipeline central

`SlotImageResolver` aplica, para todo slot CMS de imagem:

1. resolve somente URL HTTPS absoluta ou relativa ao origin da API;
2. procura/baixa pelo hash e valida tipo, limite de 8 MiB, tamanho informado, decodificação e dimensões de 1 a 8192 px;
3. só depois da validação promove por arquivo temporário + rename atômico;
4. atualiza a cópia por slot de último remoto válido (LKG) também atomicamente;
5. em qualquer falha usa LKG válido; sem LKG usa o default empacotado; sem ambos retorna estado neutro controlado.

PNG e JPEG são aceitos pelo caminho CMS validado. WebP, SVG e GIF não são promovidos: o WPF .NET 8 não oferece decoder WebP nativo confiável e nenhuma biblioteca extra foi justificada só para esse formato. Os `BitmapImage` são carregados com `OnLoad`, têm o arquivo liberado e são congelados. Contêineres usam `UniformToFill`, sem deformação ou alteração de layout.

`contentVersion` atualiza a metadata de slots. O cache é identificado por id/hash: arte com hash inalterado não baixa novamente; somente a arte alterada é renovada. Falha na nova versão não sobrescreve cache/LKG válido.

## Semântica de remoção

O contrato CMS atual não distingue explicitamente `INHERIT_DEFAULT`, `REMOTE_ASSET` e `NONE`. O tratamento retrocompatível nesta fase é:

- referência válida: `REMOTE_ASSET`;
- slot ausente/nulo: `INHERIT_DEFAULT` (LKG, depois local);
- `NONE`: ainda não representável no contrato público.

Para campanhas/hero, o booleano `enabled` continua sendo a forma existente de ocultar o bloco inteiro. Uma futura versão de schema deve adicionar estado explícito sem mudar o significado de slots nulos existentes. Até lá, remover somente a referência não apaga automaticamente o LKG; desativar o bloco evita manter promoção antiga visível.

## Inventário

Foram auditados 16 contratos editoriais operacionais: 14 entradas locais no manifesto e dois slots de identidade sem bitmap genérico (`home.brandLogo` e `account.guildEmblem`). O registry CMS possui seis slots IMAGE e cinco listas que podem referenciar ícones. As listas mantêm o estado vetorial/neutral existente e não inventam ícones de classe, moeda ou rede social.

### Reused existing assets

- `references/visual/dark-lord/dark-lord-hero-dark-master-composicao-aprovada.png` → `Assets/Defaults/home-hero.png`, cópia exata da arte aprovada.
- paleta, tipografia, controles e placeholders vetoriais da Fase 1.

### New local fallback assets

- `Assets/Defaults/editorial-environment.png`: ambiente amplo genérico, sem personagem/conteúdo/branding.
- `Assets/Defaults/editorial-card.png`: alcova/pedestal vazio, sem produto/conteúdo/branding.

Esses dois rasters foram criados apenas porque não havia arte neutra aprovada que atendesse Notícias, Loja e estados vazios sem inventar conteúdo. São compartilhados para evitar dezenas de duplicatas.

### Unused legacy assets

- `Assets/launcher-shell-v2.png`: composição integral do launcher antigo; preservada, não excluída e não sobreposta ao shell atual.
- `references/visual/logo-bloodmoon-vermelha-referencia.png`: não usado porque contém watermark e um emblema incompatível com a regra de branding.
- `references/visual/logo-bloodmoon-sem-fundo-referencia.png`: não usado no topo compacto; composição quadrada complexa, não é um wordmark limpo.
- demais artes de classe permanecem referências, não foram promovidas a fallbacks genéricos.

### Missing approved assets

- wordmark horizontal/compacto aprovado e transparente para `home.brandLogo`;
- ícones oficiais de classe, moedas e redes sociais;
- emblema genérico de guilda aprovado, caso o produto realmente deseje um;
- futuras capas específicas de notícia/evento/produto, sempre ligadas a conteúdo real.

## `home.brandLogo`

O registry o descreve como imagem 1:1 de branding no topo. Na implementação ele é um `Image` de 32×32 ao lado do wordmark textual já aprovado (`BLOOD MOON` / `MU ONLINE`). Não é hero nem precisa ser um emblema autônomo. Como nenhum ativo existente é adequado (um é complexo e outro tem watermark), o slot foi classificado como acento de marca opcional/legado: quando não houver CMS aprovado, o `Image` fica colapsado e o wordmark textual permanece alinhado. Nenhum logo, lança ou tridente novo foi criado.

## QA determinístico

Cobertura automatizada inclui: remoto válido, asset ausente, HTTP 500/LKG, URL inválida, imagem CMS corrompida, cache corrompido, LKG durante indisponibilidade, mudança/inalteração de hash, falha de download sem promoção, escrita atômica, ausência de remoto, `NONE` futuro, rejeição de WebP e decodificação PNG.

As sete capturas do cenário CMS indisponível ficam em `work/launcher/phase1-5-screenshots/cms-unavailable`. Um cenário local de substituição por LKG usa o mesmo contêiner do CMS para verificar estabilidade de layout. A renderização WPF usa unidades independentes de dispositivo; o mesmo shell e `UniformToFill` foram verificados a 100%, 125% e 150% sem alterar 1180×700 lógico.

## Respostas diretas

1. Há 16 contratos editoriais operacionais auditados; o registry CMS contém 6 slots IMAGE e 5 listas com referências de ícone.
2. Antes, 14 dos 16 não tinham default raster intencional; havia somente fundos neutros/vetoriais e uma imagem legada de shell inteiro.
3. Os 14 contratos de conteúdo têm default local. `home.brandLogo` é deliberadamente colapsado sem arte aprovada e `account.guildEmblem` mantém estado neutro; não se fabrica identidade.
4. Foi reutilizado o hero Dark Lord aprovado e toda a fundação estrutural XAML da Fase 1.
5. Foram necessários somente `editorial-environment.png` e `editorial-card.png`.
6. Sim, esses dois neutros foram criados por falta de arte aprovada genérica; nenhum conteúdo, produto ou marca foi inventado.
7. CMS válido vence; se falhar entra o LKG validado; sem ele entra o resource local; por último, estado neutro.
8. Sim. O HTTP 500 não deixa as páginas críticas sem visual e não bloqueia recursos funcionais.
9. A imagem é rejeitada antes da promoção; o cache/LKG anterior permanece e, sem ele, entra o local.
10. Novo id/hash é baixado, validado e promovido atomicamente; hashes iguais não baixam outra vez.
11. Não. O contêiner, tamanho e stretch são os mesmos.
12. Sim, há uma cópia LKG por slot, independente da tentativa nova.
13. Ficou opcional e colapsado sem CMS aprovado; o wordmark textual continua.
14. Não foi criado logo nem emblema.
15. Wordmark compacto, ícones oficiais de classe/moeda/social, emblema de guilda e futuras artes específicas reais.
16. Sim; as sete capturas offline foram produzidas e revisadas.
17. O número final consta no relatório de entrega após a última execução da suíte.
18. A Fase 2 deve conectar e validar o CMS com payloads reais/mocks aprovados, formalizar o estado `NONE` no schema e executar QA de override com artes finais — sem alterar o shell.

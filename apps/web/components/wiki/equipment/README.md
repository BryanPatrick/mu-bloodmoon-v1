# Equipamentos da Wiki

- `EquipmentFrame.vue`: moldura visual reutilizavel por familia de item. A moldura e decorativa e nao define estado de negocio.
- `EquipmentSetCard.vue`: card vertical do catalogo de sets. Recebe dados prontos da API e emite `select` para abrir o detalhe existente.
- `EquipmentCharacterChibi.vue`: avatar compacto de personagem com tooltip reutilizavel no catalogo e nos detalhes do equipamento.
- `EquipmentPieceTooltip.vue`: leitura compacta de uma peca dentro do modal, na ordem visual do tooltip do jogo. Exibe apenas atributos basicos comprovados, sem adicionais, sinergias ou sockets.
- `types.ts`: contrato compartilhado das familias visuais.

As familias visuais devem continuar separadas de estados como equipado, bloqueado, selecionado ou em leilao.

## Regras de exibicao

- Sets Socket exibem somente a classificacao `Socket`; `Normal` fica implicito e nao deve aparecer como etiqueta redundante.
- Toda imagem chibi de personagem deve usar `EquipmentCharacterChibi` para manter o tooltip com o nome no hover e no foco.

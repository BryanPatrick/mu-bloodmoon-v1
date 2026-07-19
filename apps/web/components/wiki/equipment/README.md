# Equipamentos da Wiki

- `EquipmentFrame.vue`: moldura visual reutilizavel por familia de item. A moldura e decorativa e nao define estado de negocio.
- `EquipmentSetCard.vue`: card vertical do catalogo de sets. Recebe dados prontos da API e emite `select` para abrir o detalhe existente.
- `types.ts`: contrato compartilhado das familias visuais.

As familias visuais devem continuar separadas de estados como equipado, bloqueado, selecionado ou em leilao.

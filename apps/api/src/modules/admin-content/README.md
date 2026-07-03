# Admin Content Module

Backend administrativo para o CMS do Blood Moon.

Escopo inicial:

- listar, criar, editar e arquivar `KnowledgeEntry`;
- listar, criar, editar e arquivar `ReferenceAsset`;
- listar, criar, editar e arquivar `EquipmentRecord`;
- consultar resumo editorial;
- listar lacunas de equipamentos que precisam de imagem ou opcoes de set.

Rotas atuais:

- `GET /api/admin/content/summary`
- `GET /api/admin/content/entries`
- `POST /api/admin/content/entries`
- `PATCH /api/admin/content/entries/:id`
- `DELETE /api/admin/content/entries/:id`
- `GET /api/admin/content/assets`
- `POST /api/admin/content/assets`
- `PATCH /api/admin/content/assets/:id`
- `DELETE /api/admin/content/assets/:id`
- `GET /api/admin/content/equipment`
- `POST /api/admin/content/equipment`
- `PATCH /api/admin/content/equipment/:id`
- `DELETE /api/admin/content/equipment/:id`
- `GET /api/admin/content/equipment-gaps`

Observacao importante: as rotas estao isoladas em `/api/admin/content` e exigem JWT com role `ADMIN` ou `SUPER_ADMIN`.

Auditoria:

- criar, editar e arquivar entradas, assets e equipamentos ja grava `AuditEvent`;
- quando o JWT e valido, o controller/service registra `actorId` e `actorUsername` reais;
- chamadas internas sem usuario ainda podem cair em `system`, mas rotas HTTP administrativas exigem guard.

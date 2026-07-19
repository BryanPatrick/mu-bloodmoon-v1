# Admin Content Module

Backend administrativo para o CMS do Blood Moon.

Escopo atual:

- listar, criar, editar e arquivar `KnowledgeEntry`;
- listar, criar, editar e arquivar `ReferenceAsset`;
- listar, criar, editar e arquivar `EquipmentRecord`, incluindo variantes, pecas,
  opcoes, classes e temporadas;
- listar, criar, editar e arquivar `SiteSetting` para configuracoes editoriais do
  portal e parametros publicos do servidor;
- consultar resumo editorial;
- listar lacunas de equipamentos que precisam de imagem ou opcoes de set.

Rotas atuais:

- `GET /api/admin/content/summary`
- `GET /api/admin/content/entries`
- `POST /api/admin/content/entries`
- `PATCH /api/admin/content/entries/:id`
- `DELETE /api/admin/content/entries/:id`
- `GET /api/admin/content/settings`
- `POST /api/admin/content/settings`
- `PATCH /api/admin/content/settings/:id`
- `DELETE /api/admin/content/settings/:id`
- `GET /api/admin/content/assets`
- `POST /api/admin/content/assets`
- `PATCH /api/admin/content/assets/:id`
- `DELETE /api/admin/content/assets/:id`
- `GET /api/admin/content/equipment`
- `GET /api/admin/content/equipment-metadata`
- `GET /api/admin/content/equipment/record/:id`
- `POST /api/admin/content/equipment`
- `PATCH /api/admin/content/equipment/:id`
- `DELETE /api/admin/content/equipment/:id`
- `GET /api/admin/content/equipment-gaps`

Observacao importante: as rotas estao isoladas em `/api/admin/content` e exigem JWT com role `ADMIN` ou `SUPER_ADMIN`.

Auditoria:

- criar, editar e arquivar entradas, assets, equipamentos e configuracoes grava
  `AuditEvent`;
- quando o JWT e valido, o controller/service registra `actorId` e `actorUsername` reais;
- chamadas internas sem usuario ainda podem cair em `system`, mas rotas HTTP administrativas exigem guard.

Exclusao:

- o `DELETE` administrativo e um arquivamento logico (`ARCHIVED`), preservando
  historico, relacionamentos e possibilidade de auditoria;
- remocao fisica nao e exposta no painel para evitar perda acidental de dados.

Seguranca de configuracoes:

- `SiteSetting` aceita configuracoes funcionais e editoriais;
- senhas, tokens, chaves privadas e strings de conexao continuam exclusivamente
  nas variaveis de ambiente do servidor;
- alteracoes que precisem escrever no servidor do jogo devem passar pelo Game
  Bridge com lista explicita de operacoes permitidas.

# Accounts module

Modulo administrativo para listar e alterar contas do portal.

## Endpoints

- `GET /api/admin/accounts`
- `PATCH /api/admin/accounts/:id`

Ambos exigem Bearer token com role `ADMIN` ou `SUPER_ADMIN`.

## Contrato

A listagem retorna contas paginadas com:

- `id`, `username`, `name`, `email`
- `role`
- `status`
- `personalIdMask`
- `createdAt`, `updatedAt`
- `currencies` como objeto por codigo: `WCOIN`, `GOBLIN_POINT`, `HUNT_POINT`

O hash do Personal ID nunca deve sair da API.

## Auditoria

Toda alteracao de role ou status grava `AuditEvent` com acao `admin.account.updated`.

## Proximos passos

- Criar endpoint de criacao administrativa de contas.
- Criar edicao auditada de moedas.
- Adicionar paginacao e filtros server-side completos na UI.
- Integrar troca de senha e recuperacao de conta ao mesmo modulo.

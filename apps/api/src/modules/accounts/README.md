# Accounts module

Modulo administrativo para listar e alterar contas do portal.

## Endpoints

- `GET /api/admin/accounts`
- `PATCH /api/admin/accounts/:id`

Ambos exigem Bearer token, papel administrativo e permissao granular.
`ADMIN` lista e altera apenas contas `PLAYER`. `SUPER_ADMIN` pode listar os
tres papeis.

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

Toda alteracao exige justificativa com no minimo cinco caracteres. Alteracoes
de papel gravam `admin.account.role.changed`; alteracoes de status gravam
`admin.account.status.changed`, sempre com valores anterior/proximo e ator.

Somente `SUPER_ADMIN` pode promover `PLAYER` para `ADMIN` ou rebaixar `ADMIN`
para `PLAYER`. Autoalteracao e atribuicao de `SUPER_ADMIN` pela API sao
bloqueadas.

## Proximos passos

- Criar endpoint de criacao administrativa de contas.
- Criar edicao auditada de moedas.
- Integrar troca de senha e recuperacao de conta ao mesmo modulo.

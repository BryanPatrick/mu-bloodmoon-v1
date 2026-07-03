# Wiki Module

Modulo de leitura da base de conhecimento consolidada no PostgreSQL.

Este modulo existe para tirar a Wiki do frontend carregando JSON gigante e servir dados por demanda.

Endpoints iniciais:

- `GET /api/wiki/summary`
- `GET /api/wiki/entries`
- `GET /api/wiki/equipment`
- `GET /api/wiki/equipment/:key`

Regras:

- Player deve consumir apenas Season 6 quando a autenticacao estiver conectada.
- Admin podera alternar temporadas futuras quando a camada de permissao estiver ativa.
- Dados brutos continuam preservados em `references/` ate revisao editorial.

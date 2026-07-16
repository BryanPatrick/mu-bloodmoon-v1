# Web Source Module

Modulo somente leitura para catalogar a base web atual e transformar o que existe em etapas de migracao.

Objetivo:

- expor modulos e assets reaproveitaveis ao painel administrativo;
- manter PHP, assets e dados coletados separados de CMS, Wiki, Shop e Game Integration;
- evitar copiar credenciais ou arquivos sensiveis para respostas da API;
- fornecer checklist de migracao para reconstruir funcionalidades com seguranca em NestJS.

Fonte normalizada:

```text
references/web-source-current/catalog.json
references/web-source-current/normalized-domains.json
```

Endpoints:

```text
GET /api/source-web/current/summary
GET /api/source-web/current/controllers
GET /api/source-web/current/models
GET /api/source-web/current/plugins
GET /api/source-web/current/server-data
GET /api/source-web/current/item-image-groups
GET /api/source-web/current/reuse-plan
GET /api/source-web/current/migration-board
GET /api/source-web/current/normalized-domains
```

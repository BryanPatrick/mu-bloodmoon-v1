# Admin Observability

API administrativa de auditoria, trabalho, erros, alertas, exportacao e
retencao.

## Rotas

- `GET /admin/observability/summary`
- `GET /admin/observability/audit`
- `GET /admin/observability/history/:entityType/:entityId`
- `GET|POST /admin/observability/work-logs`
- `GET /admin/observability/events`
- `GET /admin/observability/export`
- `GET|PATCH /admin/observability/retention`
- `GET|PATCH /admin/errors`
- `GET|PATCH /admin/alerts`

Todas as rotas exigem JWT, papel administrativo e permissao granular. Dados
tecnicos completos exigem `admin.audit.full.view`.

## Regras

- resolver um erro exige uma descricao de solucao;
- recorrencia reabre incidentes resolvidos ou ignorados;
- alteracoes geram auditoria e comprovacao de trabalho;
- exportacoes sao sanitizadas, possuem checksum e historico;
- apenas `SUPER_ADMIN` administra retencao.

# Interface da central de tarefas

- `AdminTasksManager.vue`: dashboards, listagem, filtros e ficha operacional.
- `TaskMetric.vue`: indicador compacto exclusivo da central de tarefas.
- `ReportGroup.vue`: agrupamentos gerenciais sem transformar volume em ranking.
- `TaskFacts.vue`: metadados operacionais da tarefa.

A ficha carrega comentarios, evidencias, entidades relacionadas, historico,
auditoria e logs de trabalho. Acoes so aparecem quando a sessao possui a
permissao granular correspondente.

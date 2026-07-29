# Central de tarefas administrativas

Este modulo concentra tarefas de Roadmap, Loja, Marketplace, Comunidade,
Auditoria, erros e suporte.

## Regras

- `AdminTask` e a fonte compartilhada para atribuicao, prioridade, revisao e prazo.
- Toda mutacao gera `AuditEvent`, `AdminWorkLog` e `AdminTaskHistory`.
- Comentarios sao internos e editaveis apenas pelo autor ou Super ADM.
- Evidencias sao sanitizadas e podem representar arquivo, imagem, link, log,
  entidade ou comparacao antes/depois.
- A comprovacao relaciona a tarefa aos logs de trabalho e eventos de auditoria
  das entidades vinculadas.
- Volume nao e usado isoladamente: complexidade, tempo, rejeicoes e reaberturas
  permanecem visiveis nos relatorios.
- Os modelos antigos de tarefa permanecem temporariamente para compatibilidade;
  a migracao copia os registros validos para `AdminTask`.

# Central de tarefas administrativas

## Objetivo

A rota `/painel/admin/tarefas` organiza o trabalho de Roadmap, Loja,
Marketplace, Comunidade, Auditoria, Central de erros e suporte.

O backend usa `/admin/tasks`. O alias `/admin/tasks` do frontend redireciona
para a rota do painel.

## Permissoes

| Permissao | Uso |
| --- | --- |
| `admin.tasks.view` | Listagem, detalhe e dashboard pessoal |
| `admin.tasks.create` | Criar tarefas |
| `admin.tasks.assign` | Atribuir e transferir |
| `admin.tasks.operate` | Assumir, iniciar, pausar, concluir, comentar e evidenciar |
| `admin.tasks.review` | Aprovar ou rejeitar |
| `admin.tasks.manage` | Editar dados e relacionar entidades |
| `admin.tasks.reports.view` | Dashboard de gestao e relatorios |

O Super ADM recebe todas as permissoes. Um ADM recebe somente as permissoes
delegadas pelo Super ADM.

## Fluxo

1. A tarefa nasce em `OPEN`, `BACKLOG` ou `ASSIGNED`.
2. Um colaborador assume ou recebe a tarefa.
3. `START` registra o inicio.
4. `PAUSE` move para `WAITING`.
5. `COMPLETE` conclui diretamente quando revisao nao e obrigatoria.
6. Quando `approvalRequired` esta ativo, a conclusao envia para `IN_REVIEW`.
7. Um revisor pode aprovar ou rejeitar.
8. Rejeicao e reabertura permanecem contabilizadas separadamente.

Acoes de transferencia, rejeicao, reabertura e cancelamento exigem
justificativa.

## Comprovacao

O detalhe da tarefa agrega:

- historico imutavel da tarefa;
- comentarios internos;
- evidencias;
- entidades relacionadas;
- eventos de auditoria da tarefa e das entidades;
- `AdminWorkLog` vinculados pelo `taskId`;
- tempo registrado;
- alteracoes e aprovacoes detectadas.

Toda mutacao gera auditoria e log de trabalho com o mesmo `correlationId` da
requisicao.

## Evidencias

Tipos aceitos:

- `IMAGE`;
- `FILE`;
- `INTERNAL_LINK`;
- `DESCRIPTION`;
- `LOG`;
- `ENTITY_CHANGE`;
- `BEFORE_AFTER`.

Dados sensiveis sao sanitizados antes da persistencia.

## Integracao com modulos antigos

A migracao `20260729234000_admin_tasks_foundation` copia tarefas validas de
Roadmap, Marketplace e Comunidade para a central. Novas tarefas criadas nesses
modulos tambem sao espelhadas em `AdminTask`.

Os modelos antigos permanecem temporariamente para evitar quebra de
compatibilidade. Depois que todos os consumidores estiverem usando a central,
eles podem ser removidos em uma migracao separada.

## Metricas

O dashboard nao cria ranking baseado apenas em quantidade. Ele separa:

- complexidade;
- prioridade;
- tempo;
- tarefas atrasadas;
- rejeicoes;
- reaberturas;
- problemas criticos;
- volume por modulo.

## Implantacao

Aplicar em cada ambiente:

```powershell
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

Depois reiniciar a API e o frontend SSR.

# Roadmap Blood Moon

## Rotas

- `GET /api/roadmap`: listagem publica, filtros, entregas e historico.
- `GET /api/roadmap/:slug`: detalhe publico.
- `/api/admin/roadmap`: CMS de iniciativas.
- `/roadmap`: pagina publica.
- `/admin/roadmap`: atalho para `/painel/admin/roadmap`.

## Separacao de estados

`RoadmapStatus` representa a situacao publica da iniciativa, como
desenvolvimento, testes, lancado ou adiado.

`RoadmapWorkflowStatus` representa o fluxo editorial: rascunho, revisao,
aprovacao, agendamento, publicacao e arquivamento.

Uma iniciativa em desenvolvimento pode continuar como rascunho no CMS ate ser
aprovada para aparecer publicamente.

## Permissoes

- `admin.roadmap.view`
- `admin.roadmap.create`
- `admin.roadmap.edit`
- `admin.roadmap.review`
- `admin.roadmap.approve`
- `admin.roadmap.publish`
- `admin.roadmap.delete`

Editar nao concede publicacao. Aprovar e publicar tambem sao capacidades
separadas.

## Workflow

1. Criacao gera `DRAFT`.
2. Edicao salva uma nova versao e gera auditoria/log de trabalho.
3. `SUBMIT_REVIEW` envia para revisao.
4. Revisores podem rejeitar; aprovadores podem aprovar.
5. Publicadores podem publicar imediatamente ou agendar.
6. Despublicacao preserva o registro.
7. Exclusao comum e logica e pode ser restaurada.

## Operacao

Cada iniciativa aceita responsavel, prazo interno, situacao, tarefas,
atualizacoes, evidencia e tempo de trabalho. Noticias e patch notes existentes
podem ser relacionados por ID.

Falhas de imagem, slug, relacao, transicao e agendamento sao encaminhadas para
a Central de Erros. Publicacoes e mudancas de workflow geram eventos
operacionais com `correlationId`.

## Implantacao

```powershell
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
npx prisma generate --schema apps/api/prisma/schema.prisma
npm run api:build
npm run web:build
```

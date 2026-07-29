# Auditoria e observabilidade

## Fluxo

1. O middleware atribui um `correlationId` a requisicao.
2. A operacao de negocio registra auditoria ou evento operacional.
3. A auditoria sanitiza os dados e cria comprovacao de trabalho para acoes
   administrativas.
4. Falhas nao tratadas passam pelo filtro global e sao agrupadas por
   fingerprint.
5. Ocorrencias criticas ou anomalias geram alertas.
6. A equipe investiga, atribui, relaciona uma tarefa, resolve ou reabre no
   painel.

## Permissoes

- `admin.audit.view`
- `admin.audit.history.view`
- `admin.audit.full.view`
- `admin.work-logs.view`
- `admin.work-logs.manage`
- `admin.operational-logs.view`
- `admin.errors.view`
- `admin.errors.manage`
- `admin.alerts.view`
- `admin.alerts.manage`
- `admin.logs.export`
- `admin.retention.manage`

`ADMIN` nao recebe acesso administrativo implicito. O `SUPER_ADMIN` delega
permissoes por conta. A migration preserva os administradores existentes para
evitar bloqueio durante a mudanca.

## Implantacao

Execute a migration antes de publicar a nova API:

```powershell
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

Depois gere o cliente, compile a API e compile o Nuxt:

```powershell
npx prisma generate --schema apps/api/prisma/schema.prisma
npm run api:build
npm run web:build
```

## Retencao

As politicas iniciais preservam auditoria e financeiro por dez anos,
comercial por cinco anos, trabalho e eventos por dois anos e erros por um ano.
Registros marcados como imutaveis nao podem ser apagados por ADM comum.

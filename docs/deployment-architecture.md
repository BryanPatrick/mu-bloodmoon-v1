# Arquitetura e deploy

Este documento registra a organizacao escolhida para preparar o Blood Moon para deploy real.

## Estrutura

```text
bloodmoon/
  apps/
    web/        site Nuxt, painel e telas publicas
    api/        backend NestJS planejado
  packages/
    shared/     tipos e constantes compartilhadas
  docs/         documentacao dos fluxos
  references/   imagens, dados brutos e referencias
  scripts/      automacoes auxiliares
```

## Decisao

O projeto fica em um unico repositorio, mas com frontend e backend separados.

Motivo:

- o site pode evoluir visualmente sem misturar regras sensiveis;
- o backend pode cuidar de autenticacao, permissao, loja, recarga, auditoria e integracao com MU;
- fica mais facil subir tudo no mesmo VPS ou separar depois, se crescer.

## Stack alvo

- Frontend: Nuxt 4.
- Backend: NestJS.
- Banco do portal: PostgreSQL.
- ORM: Prisma.
- Cache/fila: Redis.
- Arquivos: S3, Cloudflare R2, MinIO ou storage equivalente.
- Proxy: Nginx.
- Integracao MU: servico isolado acessando o banco/servidor do jogo com auditoria.

## Recomendacao para Hostinger

Nao tratar este projeto como hospedagem compartilhada. O Blood Moon ja possui autenticacao, RBAC, painel administrativo, CMS, Wiki, loja, recarga, financeiro, marketplace e futura integracao com o servidor do jogo. A recomendacao para publicacao e:

- VPS/KVM com acesso root;
- Docker Compose inicialmente;
- Cloudflare na frente do dominio;
- Nginx como proxy reverso;
- Node/Nuxt e API como processos separados;
- PostgreSQL para dados do portal;
- Redis para cache, filas, sessoes e jobs futuros;
- storage separado para uploads/imagens/videos/livros;
- backups automaticos e logs persistentes.

Fluxo alvo inicial:

```text
Internet
  -> Cloudflare
  -> Nginx
  -> Nuxt 4/Nitro
  -> API NestJS
  -> PostgreSQL
  -> Redis
  -> Storage
```

## Rotas esperadas em producao

```text
https://bloodmoon.com.br       -> apps/web
https://api.bloodmoon.com.br   -> apps/api
```

## Comandos atuais

```bash
npm run dev
npm run build
npm run preview
npm run api:check
npm run check
```

Hoje `npm run build` compila o Nuxt dentro de `apps/web`.

## Backend

`apps/api` ja possui base NestJS com Prisma, PostgreSQL, autenticacao JWT, contas, personagens, CMS, Wiki, auditoria, loja, recarga, financeiro, marketplace e fila inicial de integracao com o jogo.

Antes de deploy real ainda precisamos:

1. configurar `.env` de producao fora do repositorio;
2. apontar `DATABASE_URL` para PostgreSQL do VPS;
3. apontar `REDIS_URL` para Redis do VPS;
4. configurar storage real para uploads;
5. configurar Nginx/SSL;
6. configurar backups do PostgreSQL e do storage;
7. configurar logs e monitoramento;
8. implementar worker real para consumir `GameBridgeJob` e conversar com o banco/servidor MU;
9. validar rate limit, firewall, Fail2Ban e Cloudflare WAF.

## Cuidados para Hostinger/VPS

- nao subir `.env` real para repositorio;
- usar HTTPS;
- rodar frontend e backend como processos separados;
- usar Nginx como proxy;
- manter backup do PostgreSQL;
- manter backup das imagens enviadas;
- registrar auditoria de acoes sensiveis;
- nunca misturar diretamente banco do portal com banco do jogo;
- marketplace e entrega de itens devem passar por fila/idempotencia/auditoria, nunca por escrita solta direto no banco do game.

## Arquivos preparados para deploy

- `deploy/.env.production.example`: variaveis de producao para copiar como `.env.production`.
- `deploy/docker-compose.production.yml`: stack inicial com web, api, PostgreSQL, Redis e worker da ponte MU.
- `deploy/nginx.bloodmoon.conf`: proxy reverso base para site e API.
- `deploy/README.md`: passo a passo inicial para VPS/Hostinger KVM.

## Separacao de responsabilidades

```text
/app        codigo e containers
/database   volumes e dumps do PostgreSQL
/storage    uploads, imagens, videos e livros
/logs       logs de Nginx/API/worker
/backups    backups diarios, semanais e mensais
```

## Banco do portal x banco do jogo

O portal deve ser a origem de verdade para contas web, permissoes, auditoria, pagamentos, CMS e marketplace. O banco do jogo continua sendo a origem de verdade para inventario/personagens reais. A integracao entre os dois deve acontecer por jobs:

1. site cria `GameBridgeJob`;
2. worker valida o job e aplica no banco/servidor do jogo;
3. worker marca o job como `COMPLETED` ou `FAILED`;
4. a API finaliza efeitos financeiros apenas quando a entrega estiver confirmada.

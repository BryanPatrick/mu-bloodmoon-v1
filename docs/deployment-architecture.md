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

- Frontend: Nuxt 3.
- Backend: NestJS.
- Banco do portal: PostgreSQL.
- ORM: Prisma.
- Cache/fila: Redis.
- Arquivos: S3, Cloudflare R2, MinIO ou storage equivalente.
- Proxy: Nginx.
- Integracao MU: servico isolado acessando o banco/servidor do jogo com auditoria.

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

`apps/api` ainda esta como esqueleto organizado. Ele contem:

- contratos dos modulos principais;
- `.env.example`;
- schema inicial do Prisma;
- checagem de estrutura.

Antes de deploy real do backend, ainda precisamos:

1. instalar dependencias do NestJS/Prisma;
2. ativar `NestFactory`;
3. criar migrations reais;
4. implementar autenticacao com senha criptografada;
5. conectar PostgreSQL;
6. conectar storage;
7. conectar Redis;
8. definir integracao segura com banco/servidor MU.

## Cuidados para Hostinger/VPS

- nao subir `.env` real para repositorio;
- usar HTTPS;
- rodar frontend e backend como processos separados;
- usar Nginx como proxy;
- manter backup do PostgreSQL;
- manter backup das imagens enviadas;
- registrar auditoria de acoes sensiveis;
- nunca misturar diretamente banco do portal com banco do jogo.

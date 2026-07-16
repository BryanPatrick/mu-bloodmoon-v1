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

## Stack alvo atual

- Frontend: Nuxt 4.
- Backend: NestJS ou rotas server-side Nuxt, sempre do lado servidor.
- Banco vivo do jogo: SQL Server no VPS do MuServer.
- Banco editorial/wiki: arquivos estaticos inicialmente, SQL Server proprio depois se fizer sentido.
- Proxy: web server atual do VPS, a confirmar na auditoria.
- Integracao MU: adaptadores server-side lendo o SQL Server do jogo, com escrita liberada apenas apos auditoria.

## Decisao atual: VPS do jogo

O plano com Hostinger/PostgreSQL fica como alternativa antiga. A decisao atual e publicar no mesmo VPS do jogo para reduzir latencia e aproveitar o SQL Server ja usado pelo servidor MU.

A regra de seguranca continua sendo: o navegador nunca acessa o SQL Server diretamente. A conexao com banco deve ficar no servidor:

Fluxo alvo:

```text
Internet
  -> HTTPS / web server do VPS
  -> Nuxt 4/Nitro
  -> API interna ou server routes
  -> SQL Server local/privado do jogo
```

## Site atual na hospedagem web

O site atual publicado no dominio esta em uma hospedagem cPanel/hospedagem web, separado do VPS do jogo.

Estado observado:

- web server: LiteSpeed;
- PHP: 8.1;
- CMS: sistema web atual;
- raiz: `public_html`;
- banco MySQL local no cPanel: nao listado;
- conexao do site legado com o jogo: configurada em arquivo PHP de constantes, tratado como segredo.

Backup local restauravel:

```text
C:\Users\Admin\Documents\BloodMoonBackups\WebSource-web\20260716-cpanel\backup-7.16.2026_12-53-47_mubloodxz.tar.gz
```

Catalogo seguro do backup:

```text
docs/current-web-source-catalog.md
references/web-source-current/catalog.json

## Banco de dados em hospedagem compartilhada

O deploy cPanel atual usa MySQL/MariaDB porque a conta disponibiliza MySQL e Node.js 22.17.0, enquanto o recurso PostgreSQL aparece no painel mas retorna erro de funcionalidade nao suportada pela API do cPanel.

Para esse ambiente:

- Prisma usa `provider = "mysql"`.
- A criacao de tabelas em producao usa `prisma db push`.
- As migrations antigas de PostgreSQL ficam como historico local e nao devem ser aplicadas no MySQL.
- A URL real de producao deve ficar apenas em variavel de ambiente do cPanel, nunca em arquivo versionado.
```

Para atualizar o catalogo depois de uma nova extracao:

```bash
npm run web-source:catalog
```

## Como nosso build roda nesse ambiente

O build do nosso projeto gera JavaScript, mas existem dois cenarios diferentes:

1. **Nuxt SSR/Nitro + NestJS API**
   - Gera JavaScript para rodar em Node.js.
   - Precisa de processo Node ativo no servidor.
   - E o caminho correto para painel, login, API, marketplace, loja, CMS e integracoes com SQL Server.

2. **Nuxt estatico**
   - `npm run web:generate` gera arquivos HTML/CSS/JS estaticos que LiteSpeed/PHP consegue servir.
   - Nao substitui o backend.
   - Ainda precisa de uma API Node separada para login, conta, loja, admin, wiki editavel e acesso ao banco.

Portanto: o ambiente PHP/LiteSpeed sozinho nao executa a API NestJS nem Nuxt SSR. Se o plano hospedagem web nao tiver Node persistente, a arquitetura segura e publicar o frontend estatico no LiteSpeed e manter a API Node no VPS/Hostinger Cloud/VPS dedicado, atras de HTTPS.

## Rotas esperadas em producao

```text
https://mubloodmoon.com.br       -> apps/web ou proxy para apps/web
https://mubloodmoon.com.br/api   -> API interna/proxy local
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

`apps/api` ja possui base NestJS com Prisma, autenticacao JWT, contas, personagens, CMS, Wiki, auditoria, loja, recarga, financeiro, marketplace e fila inicial de integracao com o jogo.

Importante: o schema Prisma atual ainda esta modelado para PostgreSQL e banco proprio de portal. Para o VPS do jogo, precisamos criar/adaptar uma camada SQL Server baseada no schema real do MuServer antes de trocar provider ou ligar escrita.

Antes de deploy real ainda precisamos:

1. configurar `.env` de producao fora do repositorio;
2. confirmar dados reais do SQL Server do jogo;
3. criar adaptadores server-side para leitura do SQL Server;
4. configurar storage real para uploads;
5. configurar proxy/SSL no web server existente;
6. configurar backups do SQL Server e do storage;
7. configurar logs e monitoramento;
8. implementar escrita real somente depois de auditar tabelas, procedures e locks;
9. validar rate limit, firewall, Fail2Ban e Cloudflare WAF.

## Cuidados para VPS do jogo

- nao subir `.env` real para repositorio;
- usar HTTPS;
- manter SQL Server sem acesso publico;
- rodar frontend/API como processo local ou proxy interno;
- manter backup do SQL Server;
- manter backup das imagens enviadas;
- registrar auditoria de acoes sensiveis;
- marketplace e entrega de itens devem passar por transacao, lock/idempotencia/auditoria, nunca por escrita solta direto no banco do game.

## Arquivos preparados para deploy

- `deploy/.env.production.example`: variaveis de producao para copiar como `.env.production`.
- `deploy/docker-compose.production.yml`: stack inicial com web, api, PostgreSQL, Redis e worker da ponte MU.
- `deploy/.env.game-vps.example`: variaveis iniciais para o novo plano no VPS do jogo.
- `deploy/GAME_VPS_CHECKLIST.md`: checklist operacional para auditar e publicar no VPS do jogo.
- `deploy/nginx.bloodmoon.conf`: proxy reverso base para site e API.
- `deploy/README.md`: passo a passo inicial para VPS/Hostinger KVM.
- `docs/game-vps-sqlserver-transition.md`: plano de transicao para SQL Server.

## Separacao de responsabilidades

```text
/app        codigo e containers
/database   volumes e dumps do PostgreSQL
/storage    uploads, imagens, videos e livros
/logs       logs de Nginx/API/worker
/backups    backups diarios, semanais e mensais
```

## SQL Server do jogo

O SQL Server do jogo e a origem de verdade para contas/personagens/inventario/moedas reais. A wiki e conteudo editorial podem continuar em arquivos/objetos estaticos inicialmente.

Para qualquer escrita sensivel:

1. criar backup;
2. validar permissao;
3. usar transacao;
4. registrar auditoria;
5. testar em conta falsa;
6. liberar em producao somente depois de rollback validado.

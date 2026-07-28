# Deploy cPanel Node.js

Este roteiro prepara o Blood Moon para o ambiente Node.js do cPanel.

## Versao Node

Use **Node.js 22.17.0**. No painel ela aparece como recomendada e e a melhor opcao entre as versoes disponiveis para Nuxt 4 e Nest.

## Pacotes

Gerar os pacotes localmente:

```bash
npm run api:build
npm run web:build
npm run deploy:cpanel:package
```

Saida:

```text
work/deploy/cpanel/bloodmoon-api-cpanel.tar.gz
work/deploy/cpanel/bloodmoon-web-cpanel.tar.gz
```

## Estado aplicado em 2026-07-19

- MySQL criado no cPanel: `mubloodxz_bloodmoon`.
- Usuario MySQL criado no cPanel: `mubloodxz_bmapi`.
- `DATABASE_URL` de producao foi salva localmente em `work/cpanel-mysql-production.env` e nao deve ser commitada.
- Schema Prisma foi aplicado no MySQL remoto com `prisma db push`.
- Base consolidada foi importada no MySQL remoto:
  - 352 entradas de conhecimento;
  - 1.537 assets;
  - 1.914 equipamentos;
  - 2.992 variantes;
  - 3.430 pecas;
  - 10.330 vinculos classe/equipamento;
  - 25.430 vinculos de temporada.
- Os pacotes `.tar.gz` preservam permissoes de diretorio no Linux. Nao use ZIP criado pelo `tar -a` do Windows.
- Aplicativos ativos no Node.js Selector:
  - API: `/home/mubloodxz/bmapi`;
  - Web: `/home/mubloodxz/bmweb`.
- Schema MySQL sincronizado e Prisma Client regenerado no ambiente Node ativo.
- Base consolidada reimportada depois da publicacao e validada pelas rotas publicas.
- Backup completo pre-deploy foi validado e armazenado fora do projeto.
- Backup diario de banco e arquivos mutaveis esta agendado para 03:17.

O registro automatico via `PassengerApps/register_application` retornou erro interno do cPanel. A criacao da aplicacao Node deve ser feita pela tela **Node.js** do cPanel usando os caminhos abaixo.

## API

Recomendado criar um subdominio para a API, por exemplo:

```text
api.mubloodmoon.com.br
```

Configuracao do app Node:

- Versao Node.js: `22.17.0`
- Raiz do aplicativo: `/home/mubloodxz/bmapi`
- Arquivo de inicializacao: `server.js`

Variaveis:

```env
NODE_ENV=production
DATABASE_URL=mysql://mubloodxz_bmapi:SENHA_DO_ARQUIVO_WORK@localhost:3306/mubloodxz_bloodmoon
JWT_ACCESS_SECRET=troque-por-um-segredo-longo
JWT_REFRESH_SECRET=troque-por-outro-segredo-longo
TWO_FACTOR_ENCRYPTION_KEY=troque-por-uma-terceira-chave-aleatoria
SESSION_TTL_HOURS=24
WEB_PUBLIC_URLS=https://mubloodmoon.com.br,https://www.mubloodmoon.com.br
API_GLOBAL_PREFIX=api
```

Importante: a API usa MySQL/MariaDB neste deploy para ficar compativel com o cPanel atual.

## Site Nuxt

Configuracao do app Node:

- Versao Node.js: `22.17.0`
- Raiz do aplicativo: `/home/mubloodxz/bmweb`
- Arquivo de inicializacao: `.output/server/index.mjs`

Variaveis:

```env
NODE_ENV=production
NUXT_PUBLIC_API_BASE=https://api.mubloodmoon.com.br/api
```

## Validacao

Depois de iniciar os dois apps:

1. Abrir `https://api.mubloodmoon.com.br/api/content/entries?pageSize=1`.
2. Testar login admin pelo site.
3. Abrir Wiki e conferir equipamentos/personagens.
4. Abrir painel admin e conferir dashboard, contas e fontes web.

## Diagnostico de producao

### Login retorna HTTP 500

Antes de reiniciar ou republicar a API, consulte o `stderr.log` da aplicacao e
confirme se todas as tabelas das migrations realmente existem. O registro em
`_prisma_migrations` sozinho nao comprova que o SQL foi executado.

Em 2026-07-28, a API falhou com Prisma `P2021` porque
`AccountPermission`, `SupportTicket` e `AccountModeration` estavam ausentes,
apesar de suas migrations constarem como aplicadas. O reparo exigiu:

1. comparar `schema.prisma`, migrations e schema real pelo phpMyAdmin;
2. criar as tabelas ausentes sem apagar dados;
3. normalizar os papeis para `PLAYER`, `ADMIN` e `SUPER_ADMIN`;
4. validar login, refresh, painel administrativo, Wiki e launcher pela API.

Nao use `prisma migrate resolve --applied` para migrations funcionais que ainda
precisam criar ou alterar tabelas.

### Aplicacao nao inicia ou pacote fica truncado

Verifique primeiro a cota de disco do cPanel. Cache do npm, lixeira e pacotes
antigos podem impedir copias internas do Prisma e produzir erros pouco claros.
O `server.js` empacotado nao gera o Prisma Client durante todo boot. Essa etapa
so e executada quando a variavel abaixo for definida explicitamente:

```env
PRISMA_GENERATE_ON_START=1
```

Em operacao normal, gere o client durante o build/deploy e deixe essa variavel
ausente. Depois de gerar os pacotes, confirme que ambos possuem tamanho maior
que zero antes do upload.

## Rollback

Antes de trocar o site em producao, manter o backup do cPanel salvo fora do projeto. Se algo falhar, restaurar o backup pelo cPanel ou recolocar a pasta anterior do site.

Para a rotina diaria e a copia externa, consulte `deploy/CPANEL_BACKUP_AUTOMATION.md`.

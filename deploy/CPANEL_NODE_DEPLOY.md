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

## Rollback

Antes de trocar o site em producao, manter o backup do cPanel salvo fora do projeto. Se algo falhar, restaurar o backup pelo cPanel ou recolocar a pasta anterior do site.

Para a rotina diaria e a copia externa, consulte `deploy/CPANEL_BACKUP_AUTOMATION.md`.

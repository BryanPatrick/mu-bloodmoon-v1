# Composables

Regras reutilizaveis do frontend.

- `useAuth`: sessao, login via API, permissoes e estado local minimo para manter a experiencia do usuario.
- `useManagement`: camada legada/local ainda usada por telas que nao foram ligadas ao backend; nao colocar regra sensivel aqui.
- `useLocale`: idioma e traducoes do site.
- `useWikiApi`: cliente centralizado para a API da Wiki/PostgreSQL, incluindo sets agrupados e pendencias de referencias.
- `useAdminContentApi`: cliente administrativo para CMS, assets, equipamentos e pendencias reais no PostgreSQL.
- `useAdminAccountsApi`: cliente administrativo para listar e alterar contas reais no PostgreSQL.
- `useMarketplaceApi`: cliente para anuncios entre jogadores, pedidos e jobs da ponte com o servidor MU.

Regra: composables que conversam com backend devem centralizar chamadas HTTP para evitar API espalhada pelas paginas.

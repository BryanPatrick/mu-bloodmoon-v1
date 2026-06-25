# Estrutura simples do projeto

```text
bloodmoon/
  apps/
    web/
      assets/         CSS e estilos globais
      components/     componentes reutilizaveis
      composables/    regras reutilizaveis do frontend
      data/           mocks e conteudos publicos
      layouts/        layouts Nuxt
      middleware/     protecao de rotas
      pages/          paginas e URLs
      plugins/        plugins do Nuxt
      public/         imagens e arquivos publicos
      stores/         stores Pinia
    api/
      prisma/         schema do banco do portal
      src/modules/    modulos do backend
  packages/
    shared/           tipos compartilhados
  docs/               documentacao
  references/         referencias brutas e imagens coletadas
  scripts/            scripts auxiliares
```

## Onde mexer

- Header: `apps/web/components/layout/SiteHeader.vue`
- Footer: `apps/web/components/layout/SiteFooter.vue`
- Menu principal: `apps/web/components/layout/SiteHeader.vue`
- Wiki: `apps/web/pages/wiki.vue`
- Logo: `apps/web/components/branding/BloodLogo.vue`
- Hero de pagina: `apps/web/components/content/PageHero.vue`
- Painel: `apps/web/components/layout/ManagementShell.vue`
- Paginas publicas: `apps/web/pages`
- Paginas admin: `apps/web/pages/painel/admin`
- Permissoes: `apps/web/data/security.ts`
- Dados mockados: `apps/web/data/management.ts`
- Futuro backend: `apps/api/src/modules`

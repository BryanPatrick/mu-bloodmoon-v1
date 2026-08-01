# Blood Moon Portal

Portal do servidor Blood Moon, organizado como monorepo para separar site, painel e backend.

## Como ver o sistema

Com Node.js instalado:

```bash
npm install
npm run dev
```

Depois abra:

```text
http://localhost:3000
```

Para subir o ambiente completo com MySQL, API e site:

```bash
npm run dev:full
```

No Windows tambem da para dar duplo clique em:

```text
iniciar-dev.bat
```

Se quiser forcar a reimportacao dos dados para a API:

```text
iniciar-dev-com-import.bat
```

## Estrutura

- `apps/web`: site Nuxt, painel, guias, loja, recarga e referencias dev.
- `apps/api`: base planejada do backend NestJS.
- `apps/launcher`: launcher Windows, atualizador seguro e configuracoes do cliente.
- `packages/shared`: tipos e constantes compartilhadas.
- `references`: imagens, dados brutos e referencias coletadas.
- `docs`: documentacao do sistema e deploy.
- `scripts`: scripts auxiliares.

## Escopo do servidor

O portal publicado trabalha exclusivamente com a Season 6, incluindo personagens e evolucoes somente ate Rage Fighter/Fist Master.
Conteudo de temporadas posteriores nao deve ser importado, publicado nem reintroduzido pelos scripts de coleta.

O material historico removido do repositorio esta preservado fora do projeto em:

```text
C:\Users\Admin\Documents\BloodMoonBackups\ProjectCleanup\20260730-season6-scope
```

Para auditar o recorte sem alterar arquivos:

```bash
node scripts/prune-season6-scope.mjs
```

## Comandos

```bash
npm run dev
npm run build
npm run preview
npm run api:check
npm run launcher:build
npm run launcher:preview
npm run launcher:publish
npm run check
```

## Documentacao

- `docs/management-flows.md`: fluxos do painel, permissoes, auditoria, financeiro, loja, recarga e pontos pendentes para backend.
- `docs/deployment-architecture.md`: organizacao do monorepo, stack alvo e orientacoes para VPS/Hostinger.
- `docs/project-structure.md`: mapa simples de onde cada coisa fica.
- `docs/security-model.md`: regras de seguranca e o que realmente fica protegido.
- `docs/design-system.md`: padrao visual liquid glass e regra de migracao para Nuxt UI.

## Nuxt UI

O projeto esta preparado para usar `@nuxt/ui`. Quando houver acesso normal ao npm, rode:

```bash
npm install
```

Depois o modulo sera ativado automaticamente pelo `nuxt.config.ts`.

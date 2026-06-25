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

## Estrutura

- `apps/web`: site Nuxt, painel, guias, loja, recarga e referencias dev.
- `apps/api`: base planejada do backend NestJS.
- `packages/shared`: tipos e constantes compartilhadas.
- `references`: imagens, dados brutos e referencias coletadas.
- `docs`: documentacao do sistema e deploy.
- `scripts`: scripts auxiliares.

## Comandos

```bash
npm run dev
npm run build
npm run preview
npm run api:check
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

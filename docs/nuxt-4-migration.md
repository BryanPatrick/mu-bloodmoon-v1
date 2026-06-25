# Migração Para Nuxt 4

## O que foi alterado

- `package.json`: `nuxt` foi atualizado para `^4.4.8`.
- `package-lock.json`: dependências foram atualizadas para Nuxt 4.
- `apps/web/nuxt.config.ts`: o módulo `@nuxt/ui` foi ativado oficialmente.
- `apps/web/assets/css/main.css`: tokens de design foram declarados no formato do Tailwind 4 e o CSS global deixou de depender de `@apply`.
- `@nuxtjs/tailwindcss`: removido do projeto porque conflita com o fluxo Tailwind 4 usado pelo Nuxt UI 4.
- `apps/web/nuxt.config.ts`: provedores externos do Nuxt Fonts foram desativados para manter builds offline previsíveis.

## Como validar

Na raiz do projeto:

```bash
npm install
npm run check
```

O comando abaixo deve mostrar Nuxt 4:

```bash
npm ls nuxt @nuxt/ui --depth=0
```

## Observação

As famílias `Cinzel` e `Inter` continuam definidas no CSS com fallbacks seguros, mas o build não tenta resolver fontes externas. Se quisermos máxima fidelidade visual em produção, o melhor próximo passo é adicionar os arquivos locais dessas fontes ao projeto.

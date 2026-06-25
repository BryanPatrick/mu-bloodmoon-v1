# Composables

Regras reutilizaveis do frontend.

- `useAuth`: sessao, login mockado, permissao e auditoria local.
- `useManagement`: estado local do painel, contas, loja, recargas e financeiro.
- `useLocale`: idioma e traducoes do site.

Quando o backend real entrar, os composables devem virar a camada que chama a API, sem espalhar chamadas HTTP pelas paginas.

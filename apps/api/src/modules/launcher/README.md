# Launcher

API pública e autenticada consumida pelo launcher Windows.

- `GET /launcher/bootstrap`: status, versão, links, manifesto, destaques,
  notícias e notas de atualização. O conteúdo vem do CMS e possui estados
  vazios seguros.
- `GET /launcher/account`: resumo da conta autenticada, moedas e personagem
  ativo. Exige o token emitido por `POST /auth/login`.

Configurações públicas do launcher usam a categoria `launcher` e as chaves
criadas pela migration `20260723003000_launcher_integration`. Segredos, tokens
e credenciais nunca são armazenados em `SiteSetting`.

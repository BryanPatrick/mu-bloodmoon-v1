# Launcher

API pública e autenticada consumida pelo launcher Windows.

- `GET /launcher/bootstrap`: status, versão, links, manifesto, destaques,
  notícias e notas de atualização. O conteúdo vem do CMS e possui estados
  vazios seguros. `server.statusSource` indica a origem do campo `status`:
  `MANUAL` (um admin definiu `launcher-server-status` via CMS, com
  `statusUpdatedAt` real) ou `UNKNOWN` (ninguém definiu; o valor é apenas o
  fallback padrão do código). `LIVE` está reservado para uma futura
  integração GameBridge e não é emitido hoje -- não existe telemetria ao
  vivo do servidor de jogo ainda.
- `GET /launcher/account`: resumo da conta autenticada, moedas e personagem
  ativo. Exige o token emitido por `POST /auth/login`.

Configurações públicas do launcher usam a categoria `launcher` e as chaves
criadas pela migration `20260723003000_launcher_integration`. Segredos, tokens
e credenciais nunca são armazenados em `SiteSetting`.

Fase Launcher Foundation: `GET /launcher/bootstrap` também retorna
`schemaVersion`, `contentVersion`, `campaign`, `socials`, `utilities` e
`assets`, todos aditivos. Quatro novas chaves `SiteSetting`, sem tabela
nova: `launcher-campaign` (JSON), `launcher-social-links` (JSON, lista
ordenada, limitada a 5 itens), `launcher-wiki-url`, `launcher-support-url`.
Ver `docs/launcher/remote-content.md`.

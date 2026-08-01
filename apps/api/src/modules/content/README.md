# Content Module

API publica do CMS Blood Moon.

Responsabilidades:

- publicar apenas entradas com status `PUBLISHED`;
- limitar o conteudo publico exclusivamente a `SEASON_6`;
- publicar apenas configuracoes marcadas como publicas e publicadas;
- manter consultas publicas separadas das rotas administrativas.

Rotas:

- `GET /api/content/entries`
- `GET /api/content/entries/:slug`
- `GET /api/content/settings`

Noticias publicadas na home e na central de noticias consomem este modulo. O
painel administrativo grava os mesmos registros por `/api/admin/content`, sem
fallback local.

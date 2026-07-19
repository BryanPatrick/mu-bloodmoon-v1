# CMS administrativo

Componentes do painel central de conteudo.

- `ContentManager.vue`: noticias, Wiki, paginas, banners, downloads e navegacao.
- `EquipmentManager.vue`: equipamentos e suas relacoes editoriais.
- `SettingsManager.vue`: configuracoes publicas ou privadas do site e servidor.

Todas as mutacoes usam a API administrativa autenticada. A API registra o ator e a acao em `AuditEvent`; os componentes nao gravam dados de gerenciamento em `localStorage`.

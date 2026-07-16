# Catalogo do AdminCP atual

Data da auditoria inicial: 2026-07-16.

Origem: `https://mubloodmoon.com.br/admincp`.

Observacao: credenciais e PIN nao ficam documentados no repositorio. O AdminCP usa PIN dinamico por posicao, exibindo campos como `Enter 5th Nr Of Pin`.

## Sistema identificado

- AdminCP atual: PG MuCMS / DmN MuCMS.
- Runtime publico observado anteriormente: PHP/LiteSpeed.
- Objetivo da auditoria: mapear funcoes existentes para decidir o que manter, migrar ou substituir no painel Blood Moon.

## Navegacao principal

### Conteudo publico

- Dashboard: `/admincp`
- News Composer: `/admincp/news-composer`
- Manage Gallery: `/admincp/manage-gallery`
- Manage Downloads: `/admincp/manage-downloads`
- Manage Plugins: `/admincp/manage-plugins`

### Configuracoes do site

- Main Settings: `/admincp/manage-settings`
- Email Settings: `/admincp/manage-settings/email`
- Credits Settings: `/admincp/manage-settings/credits`
- SQL Table Settings: `/admincp/manage-settings/tables`
- Security Settings: `/admincp/manage-settings/security`
- Scheduler Settings: `/admincp/manage-settings/scheduler`

### Configuracoes de modulos

- Account Panel Settings: `/admincp/manage-settings/account`
- Buy Level Settings: `/admincp/manage-settings/buylevel`
- Buy GM Access Settings: `/admincp/manage-settings/buygm`
- Change Class Settings: `/admincp/manage-settings/changeclass`
- Change Name Settings: `/admincp/manage-settings/changename`
- Character Panel Settings: `/admincp/manage-settings/character`
- Donate Settings: `/admincp/manage-settings/donate`
- Event Timer Settings: `/admincp/manage-settings/event-timers`
- Grand Reset Settings: `/admincp/manage-settings/greset`
- Lost Password Settings: `/admincp/manage-settings/lostpassword`
- Market Settings: `/admincp/manage-settings/market`
- Media Settings: `/admincp/manage-settings/media`
- Sidebar Modules Settings: `/admincp/manage-settings/modules`
- News Settings: `/admincp/manage-settings/news`
- Rankings Settings: `/admincp/manage-settings/rankings`
- Registration Settings: `/admincp/manage-settings/registration`
- Referral System Settings: `/admincp/manage-settings/referral`
- Reset Settings: `/admincp/manage-settings/reset`
- Shop Settings: `/admincp/manage-settings/shop`
- Vip Settings: `/admincp/manage-settings/vip`
- Warehouse Settings: `/admincp/manage-settings/warehouse`
- Wcoin Exchange Settings: `/admincp/manage-settings/wcoin-exchange`

### Logs e auditoria

- Shop Logs: `/admincp/logs-shop`
- Market Logs: `/admincp/logs-market`
- Account Logs: `/admincp/logs-account`
- CuentaDigital Transactions: `/admincp/logs-cuenta-digital-transactions`
- Fortumo Transactions: `/admincp/logs-fortumo-transactions`
- Interkassa Transactions: `/admincp/logs-interkassa-transactions`
- Paygol Transactions: `/admincp/logs-paygol-transactions`
- PayCall Transactions: `/admincp/logs-paycall-transactions`
- Paypal Transactions: `/admincp/logs-paypal-transactions`
- PaymentWall Transactions: `/admincp/logs-paymentwall-transactions`
- 2CheckOut Transactions: `/admincp/logs-twocheckout-transactions`
- PagSeguro Transactions: `/admincp/logs-pagseguro-transactions`
- GM Logs: `/admincp/gm-logs`

### Contas, personagens e servidor

- Account Manager: `/admincp/account-manager`
- Character Manager: `/admincp/character-manager`
- Search IP: `/admincp/search-ip`
- Server List Manager: `/admincp/server-list-manager`
- Bulk Mail: `/admincp/bulk-mail`

### Itens, loja e inventario

- Add Item: `/admincp/add-item`
- Edit Items: `/admincp/item-list`
- Import Items: `/admincp/import-items`
- Edit Category List: `/admincp/edit-category-list`
- Edit Ancient Sets: `/admincp/edit-ancient-sets`
- Edit Harmony Options: `/admincp/edit-harmony-options`
- Edit Socket Options: `/admincp/edit-socket-options`
- Warehouse Editor: `/admincp/warehouse-editor`
- Credits Editor: `/admincp/credits-editor`
- Find Item By Serial: `/admincp/find-item`
- View Custom Item Price List: `/admincp/custom-price-list`

### Suporte, votos e equipe

- Departments: `/admincp/support-departments`
- Requests: `/admincp/support-requests`
- Edit Voting Links: `/admincp/vote-links`
- Check Top Voters: `/admincp/top-voters`
- GM Manager: `/admincp/gm-manager`

### Idiomas e guias

- Languages: `/admincp/languages`
- Add Languages: `/admincp/add-language`
- Import Language: `/admincp/import-language`
- List Guides: `/admincp/list-guides`
- Add Guide: `/admincp/add-guide`

## Funcoes que devemos cobrir no painel novo

Prioridade alta:

- Contas e permissoes administrativas.
- Personagens e dados principais do servidor.
- Rankings.
- Configuracao de resets, cadastro, VIP, moedas e WCoin.
- Logs administrativos e trilha de auditoria.
- Loja, itens, categorias, ancient, harmony e socket.
- Warehouse editor somente apos validar schema real e criar auditoria forte.
- Conteudo CMS: noticias, downloads, guias/wiki, midias.

Prioridade media:

- Bulk mail.
- Sistema de tickets/suporte.
- Votos/top voters.
- Gestao de idiomas.
- Pagamentos legados como Paypal/PagSeguro/PaymentWall, se forem usados.

Cuidados:

- O novo painel nao deve escrever diretamente em inventario, moedas ou warehouse sem transacao, lock/idempotencia e backup validado.
- Qualquer funcao equivalente a Warehouse Editor, Add Item, Credits Editor e GM Manager precisa de permissao forte e log detalhado.
- Mapear SQL Table Settings antes de implementar adaptadores para SQL Server.

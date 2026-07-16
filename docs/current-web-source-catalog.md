# Catalogo da fonte web atual

Este documento mapeia a base web atual para orientar a migracao para o Blood Moon novo.

## Origem

- Raiz: backup externo local, fora do projeto.
- Identificacao: Sistema web atual
- Pacote Composer: catalogado
- Versao Composer: 1.2.4
- PHP requerido pelo Composer: >=8.1.0
- Total extraido: 8910 arquivos, 952 pastas.

> Seguranca: este catalogo nao inclui credenciais. Segredos devem ficar fora do Git.

## Areas principais

| Caminho | Arquivos | Pastas |
| --- | --- | --- |
| application/controllers | 25 | 0 |
| application/models | 16 | 0 |
| application/views | 391 | 55 |
| application/plugins | 1045 | 330 |
| application/config | 41 | 1 |
| application/data/ServerData/en | 27 | 1 |
| assets/item_images | 4124 | 19 |
| assets/uploads | 1 | 3 |
| assets/season6 | 248 | 11 |
| assets/admincp | 274 | 75 |

## Controllers atuais

| Arquivo | Bytes |
| --- | --- |
| .htaccess | 13 |
| controller.about.php | 1547 |
| controller.account_panel.php | 90037 |
| controller.admincp.php | 459186 |
| controller.ajax.php | 171804 |
| controller.dash.php | 732 |
| controller.donate.php | 43349 |
| controller.downloads.php | 786 |
| controller.gmcp.php | 26027 |
| controller.guides.php | 2772 |
| controller.home.php | 2419 |
| controller.info.php | 5330 |
| controller.information.php | 699 |
| controller.lost_password.php | 15380 |
| controller.maintenance.php | 678 |
| controller.market.php | 22618 |
| controller.media.php | 2843 |
| controller.payment.php | 52315 |
| controller.rankings.php | 13199 |
| controller.registration.php | 26771 |
| controller.rules.php | 717 |
| controller.shop.php | 87747 |
| controller.support.php | 18100 |
| controller.vote_api.php | 6569 |
| controller.warehouse.php | 29326 |

## Models atuais

| Arquivo | Bytes |
| --- | --- |
| .htaccess | 13 |
| model.account.php | 80034 |
| model.admin.php | 208474 |
| model.character.php | 128894 |
| model.donate.php | 40195 |
| model.downloads.php | 536 |
| model.gm.php | 10095 |
| model.guides.php | 2612 |
| model.home.php | 16066 |
| model.market.php | 39668 |
| model.media.php | 2712 |
| model.rankings.php | 79215 |
| model.shop.php | 29411 |
| model.stats.php | 14626 |
| model.support.php | 21338 |
| model.warehouse.php | 16643 |

## Modulos atuais

| Modulo | Arquivos | Pastas |
| --- | --- | --- |
| accumulated_donation_rewards | 19 | 6 |
| achievements | 34 | 7 |
| battle_pass | 43 | 11 |
| binance | 19 | 6 |
| cashshop_log | 14 | 6 |
| character_market | 73 | 13 |
| coinbase | 15 | 5 |
| credits_to_credits | 12 | 5 |
| credits_to_zen | 12 | 5 |
| currency_market | 19 | 5 |
| gerencianet | 300 | 65 |
| gift_code | 20 | 7 |
| item_exchange | 24 | 8 |
| level_rewards | 25 | 9 |
| mercadopago | 45 | 11 |
| merchant | 16 | 6 |
| muun_market | 32 | 7 |
| nganluong | 30 | 9 |
| paghiper | 19 | 5 |
| ruud_exchange | 14 | 6 |
| skill_tree_specialization | 13 | 5 |
| slots | 18 | 6 |
| stats_specialization | 22 | 8 |
| stripe | 17 | 5 |
| transfer_char | 24 | 11 |
| transfer_character | 17 | 7 |
| transfer_credits | 14 | 6 |
| transfer_wcoins | 16 | 7 |
| vip_rewards | 19 | 6 |
| wcoin_to_goblin | 10 | 4 |
| wheel_of_fortune | 25 | 5 |
| workshop | 19 | 8 |
| xendit | 30 | 9 |
| zen_exchange | 16 | 7 |

## Dados tecnicos reaproveitaveis

| Arquivo | Bytes |
| --- | --- |
| EarringAttribute.xml | 17053 |
| ErrtelSetOption.xml | 4512 |
| ExcellentCommonOption.txt | 1489 |
| ExcellentWingOption.txt | 2222 |
| Item.txt | 313972 |
| Item.xml | 1628922 |
| ItemAddOption.txt | 2913 |
| ItemGradeOption.xml | 7003 |
| ItemLevelTooltip.txt | 10931 |
| ItemList.xml | 1980437 |
| ItemOptionSystem_Exc.xml | 9736 |
| ItemSetOption.xml | 276749 |
| ItemSetOptionText.csv | 5701 |
| ItemSetType.xml | 99174 |
| ItemTooltip.csv | 256708 |
| ItemTooltip[11].csv | 443532 |
| ItemTooltipText.csv | 68439 |
| JewelOfHarmonyOption.txt | 71002 |
| MuunInfo.xml | 86772 |
| MuunOption.xml | 18607 |
| PentagramJewelOptionValue.xml | 64752 |
| PentagramOption.xml | 15100 |
| PentagramWingAttribute.xml | 3772 |
| SocketItem.txt | 7259 |
| SocketItem[6].txt | 13281 |
| SocketItemType.xml | 13234 |

## Imagens de itens

| Grupo | Arquivos | Pastas |
| --- | --- | --- |
| 0 | 118 | 0 |
| 1 | 9 | 0 |
| 10 | 314 | 0 |
| 11 | 327 | 0 |
| 12 | 560 | 0 |
| 13 | 486 | 0 |
| 14 | 520 | 0 |
| 15 | 60 | 0 |
| 16 | 370 | 0 |
| 19 | 15 | 0 |
| 2 | 49 | 0 |
| 20 | 81 | 0 |
| 3 | 33 | 0 |
| 4 | 66 | 0 |
| 5 | 101 | 0 |
| 6 | 67 | 0 |
| 7 | 288 | 0 |
| 8 | 327 | 0 |
| 9 | 330 | 0 |

## Plano de reaproveitamento

| Area | Origem interna | Uso no sistema novo |
| --- | --- | --- |
| Dados de itens | application/data/ServerData/en | Comparar arquivos de itens, tooltips, opcoes excellent, ancient, socket e harmony com a nossa base da Wiki/API. |
| Imagens de itens | assets/item_images | Mapear por grupo/index para preencher previews de equipamentos, armas, asas, joias e consumiveis. |
| Painel atual | application/controllers/controller.admincp.php e application/models/model.admin.php | Extrair fluxo funcional e transformar em modulos seguros no NestJS, sem reaproveitar acesso direto do browser ao banco. |
| Loja, mercado e bau | controllers/models de shop, market, warehouse e plugins relacionados | Usar como referencia de regra de negocio para loja, marketplace, bau e transferencia, reimplementando com transacao/auditoria. |
| Pagamentos | plugins de provedores de pagamento | Catalogar provedores possiveis e integrar novamente com webhooks seguros no backend novo. |
| Configuracoes | application/config e application/config/xml | Migrar valores publicos/editoriais para CMS. Segredos ficam somente em .env fora do Git. |

## Decisao arquitetural

A base atual deve ser tratada como referencia e fonte de dados/assets. O sistema novo deve manter:

- frontend Nuxt;
- backend/API com regras de negocio;
- adaptador SQL Server server-side;
- camada de permissao, auditoria e validacao;
- nenhum acesso direto do navegador ao banco do jogo.

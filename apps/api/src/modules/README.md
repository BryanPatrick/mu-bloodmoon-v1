# API Modules

Separacao planejada para o backend real.

- `auth`: login, refresh token, recuperacao e troca de senha.
- `accounts`: contas, status, personal ID e moedas.
- `characters`: personagens e acoes administrativas.
- `shop`: produtos, compras, estoque e entrega.
- `recharge`: pacotes, pagamentos e credito de moedas.
- `audit`: trilha de auditoria.
- `references`: imagens, fontes e dados de referencia.
- `tickets`: suporte.
- `game-integration`: integracao isolada com o servidor MU.

Nenhuma regra sensivel deve depender apenas do frontend. Validacao de permissao, saldo, entrega, recarga e acoes administrativas precisam existir aqui.

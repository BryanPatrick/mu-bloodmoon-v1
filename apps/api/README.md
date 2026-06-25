# Blood Moon API

Backend planejado para o portal Blood Moon.

Stack alvo:

- NestJS
- PostgreSQL
- Prisma
- Redis
- Storage S3/R2/MinIO para imagens

Este diretório ainda está como base estrutural. As dependências do NestJS serão instaladas quando formos ativar o backend real no ambiente de deploy.

## Módulos

- `auth`: login, sessão, refresh token, recuperação e troca de senha.
- `accounts`: contas, perfis, status, moedas e segurança.
- `characters`: personagens, ações administrativas e leitura do servidor MU.
- `shop`: produtos, categorias, estoque e entrega.
- `recharge`: pacotes, pagamentos e créditos.
- `audit`: trilha de auditoria.
- `references`: imagens, fontes, itens, mapas, monstros e dados coletados.
- `tickets`: suporte e atendimento.
- `game-integration`: camada isolada para comunicação com o servidor MU.

## Regra importante

O banco do portal não deve ser misturado diretamente com o banco do jogo. Toda integração com dados do servidor MU deve passar por serviços controlados e auditados.

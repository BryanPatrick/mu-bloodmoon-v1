# Dashboards por papel

Cada papel possui um componente independente:

- `Player.vue`: conta, personagens, compras e marketplace do usuario autenticado.
- `Admin.vue`: fila operacional, tickets, anuncios e pendencias sem dados financeiros.
- `SuperAdmin.vue`: visao estrategica e financeira exclusiva.

Nao reutilize o dashboard estrategico escondendo cards. Novas metricas devem entrar apenas no componente e endpoint coerentes com o papel.

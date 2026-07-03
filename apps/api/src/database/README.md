# Database

Camada compartilhada para acesso ao PostgreSQL via Prisma.

Regras:

- Nenhum modulo deve instanciar `PrismaClient` diretamente.
- Consultas de leitura para Wiki e referencias passam por servicos da API.
- Integracoes com o banco do jogo devem ficar fora desta camada e passar por `game-integration`.

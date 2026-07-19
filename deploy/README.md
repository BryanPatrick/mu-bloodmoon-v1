# Deploy Blood Moon

Arquivos para deixar o deploy em VPS/Hostinger KVM mais direto.

## Status

O plano preferencial mudou: agora vamos publicar no VPS do jogo e integrar com o SQL Server existente.

Use primeiro:

- `deploy/GAME_VPS_CHECKLIST.md`
- `deploy/GAME_VPS_BACKUP_AND_DEPLOY.md`
- `deploy/.env.game-vps.example`
- `docs/game-vps-sqlserver-transition.md`

O Docker Compose com PostgreSQL abaixo fica como plano legado/alternativo ate concluirmos a migracao para SQL Server.

Para a Hostinger, use tambem `deploy/HOSTINGER_CHECKLIST.md` como roteiro operacional.

Para o ambiente atual em cPanel Node.js, use:

- `deploy/CPANEL_NODE_DEPLOY.md`
- `deploy/CPANEL_BACKUP_AUTOMATION.md`

## Estrutura recomendada no servidor

```text
/opt/bloodmoon/app       codigo do projeto
/opt/bloodmoon/storage   uploads e imagens publicadas
/opt/bloodmoon/logs      logs de nginx/api/worker
/opt/bloodmoon/backups   backups do PostgreSQL e storage
```

## Passos base

1. Instalar Docker, Docker Compose, Nginx e Certbot.
2. Clonar o repositorio em `/opt/bloodmoon/app`.
3. Copiar `deploy/.env.production.example` para `deploy/.env.production`.
4. Trocar segredos, dominio e senhas no `.env.production`.
5. Rodar:

```bash
cd /opt/bloodmoon/app/deploy
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```

6. Copiar `deploy/nginx.bloodmoon.conf` para `/etc/nginx/sites-available/bloodmoon`.
7. Ajustar os dominios no arquivo do Nginx.
8. Ativar site:

```bash
ln -s /etc/nginx/sites-available/bloodmoon /etc/nginx/sites-enabled/bloodmoon
nginx -t
systemctl reload nginx
```

9. Ativar SSL:

```bash
certbot --nginx -d seu-dominio.com -d www.seu-dominio.com -d api.seu-dominio.com
```

## Marketplace e servidor MU

O container `game-bridge-worker` ja fica preparado, mas por padrao `MU_BRIDGE_ENABLED=false`.

Antes de ligar em producao:

1. implementar a conexao real com o banco/servidor MU;
2. validar lock de item no inventario/bau;
3. validar transferencia real para comprador;
4. testar idempotencia;
5. ligar `MU_BRIDGE_ENABLED=true`.

## Backups minimos

Criar cron diario:

```bash
docker exec bloodmoon-postgres pg_dump -U bloodmoon bloodmoon_portal > /opt/bloodmoon/backups/bloodmoon_$(date +%F).sql
```

Manter copia externa dos backups e do storage.

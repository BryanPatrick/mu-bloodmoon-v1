# Deploy Blood Moon

Arquivos para deixar o deploy em VPS/Hostinger KVM mais direto.

Para a Hostinger, use tambem `deploy/HOSTINGER_CHECKLIST.md` como roteiro operacional.

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

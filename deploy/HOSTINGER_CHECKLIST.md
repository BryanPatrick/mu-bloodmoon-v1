# Checklist de deploy na Hostinger

Este projeto deve ser publicado em uma VPS/KVM, nao em hospedagem compartilhada.

## Acessos necessarios

- Painel Hostinger com acesso a VPS/KVM.
- Acesso SSH root ou usuario com sudo.
- Dominio que vai apontar para a VPS.
- Acesso DNS do dominio ou Cloudflare.

## Antes de subir

1. Criar a VPS.
2. Apontar DNS:
   - `seu-dominio.com` para o IP da VPS.
   - `www.seu-dominio.com` para o IP da VPS.
   - `api.seu-dominio.com` para o IP da VPS.
3. Instalar no servidor:
   - Docker
   - Docker Compose
   - Nginx
   - Certbot
4. Clonar o repositorio em `/opt/bloodmoon/app`.
5. Criar `/opt/bloodmoon/storage`, `/opt/bloodmoon/logs` e `/opt/bloodmoon/backups`.
6. Copiar `deploy/.env.production.example` para `deploy/.env.production`.
7. Trocar todos os segredos e dominios no `.env.production`.

## Subida inicial

```bash
cd /opt/bloodmoon/app/deploy
docker compose -f docker-compose.production.yml --env-file .env.production up -d
```

## Nginx e SSL

1. Copiar `deploy/nginx.bloodmoon.conf` para `/etc/nginx/sites-available/bloodmoon`.
2. Trocar `seu-dominio.com` pelos dominios reais.
3. Ativar o site:

```bash
ln -s /etc/nginx/sites-available/bloodmoon /etc/nginx/sites-enabled/bloodmoon
nginx -t
systemctl reload nginx
```

4. Emitir SSL:

```bash
certbot --nginx -d seu-dominio.com -d www.seu-dominio.com -d api.seu-dominio.com
```

## Depois de subir

- Conferir `https://seu-dominio.com`.
- Conferir `https://api.seu-dominio.com/api`.
- Rodar importacao inicial dos dados, se necessario:

```bash
docker compose -f docker-compose.production.yml --env-file .env.production exec api npm run db:import
```

## Seguranca minima

- Nao commitar `.env.production`.
- Usar senhas longas.
- Manter `MU_BRIDGE_ENABLED=false` ate a integracao com o banco do jogo estar auditada.
- Habilitar backup diario do PostgreSQL.
- Manter copia externa dos backups.

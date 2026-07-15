# Backup e deploy no VPS do jogo

Este documento e o roteiro operacional para salvar o site atual e colocar o novo Blood Moon para rodar no mesmo VPS do jogo.

## Regra principal

Nao apagar nem sobrescrever o PG MuCMS atual antes de ter backup verificado.

Fluxo seguro:

```text
1. identificar raiz do site atual
2. copiar site atual para pasta fora do projeto
3. compactar backup
4. subir projeto novo em pasta separada
5. buildar o projeto
6. rodar o novo site localmente
7. apontar o dominio/proxy somente depois de testar
```

## Pastas recomendadas

### Linux

```text
/var/www/mubloodmoon-current          site atual, se for Linux/LiteSpeed padrao
/opt/bloodmoon/app                    novo projeto
/opt/bloodmoon/backups                backups do site atual
/opt/bloodmoon/logs                   logs do app novo
/opt/bloodmoon/storage                uploads e arquivos futuros
```

### Windows

```text
C:\inetpub\wwwroot ou pasta do painel   site atual, se for Windows/IIS/LiteSpeed
C:\BloodMoon\app                        novo projeto
C:\BloodMoonBackups                     backups do site atual
C:\BloodMoon\logs                       logs do app novo
C:\BloodMoon\storage                    uploads e arquivos futuros
```

## Antes de executar

Coletar no VPS:

- sistema operacional;
- usuario de administracao;
- raiz atual do site `mubloodmoon.com.br`;
- web server usado: LiteSpeed, OpenLiteSpeed, IIS, Apache, Nginx ou painel;
- versao do Node.js, ou permissao para instalar;
- caminho dos backups atuais;
- confirmacao se o dominio pode apontar direto para o novo app ou se vamos manter o PG MuCMS em uma rota temporaria.

## Acesso remoto observado

No IP `151.243.219.30`, o teste local encontrou RDP aberto e WinRM/SSH fechados. Portanto:

- para executar estes scripts diretamente, entrar por RDP;
- ou habilitar temporariamente WinRM/SSH com firewall restrito ao IP de administracao;
- sem RDP interativo ou shell remoto, nao ha como fazer backup/deploy por linha de comando a partir desta maquina.

## Backup do site atual

### Linux

Usar `deploy/scripts/game-vps-backup-site-linux.sh`:

```bash
chmod +x deploy/scripts/game-vps-backup-site-linux.sh
sudo SITE_ROOT=/caminho/do/site/atual BACKUP_ROOT=/opt/bloodmoon/backups ./deploy/scripts/game-vps-backup-site-linux.sh
```

### Windows PowerShell

Usar `deploy/scripts/game-vps-backup-site-windows.ps1`:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\scripts\game-vps-backup-site-windows.ps1 `
  -SiteRoot "C:\caminho\do\site\atual" `
  -BackupRoot "C:\BloodMoonBackups"
```

## Deploy inicial do novo site

### Linux

Usar `deploy/scripts/game-vps-deploy-web-linux.sh`:

```bash
chmod +x deploy/scripts/game-vps-deploy-web-linux.sh
sudo APP_ROOT=/opt/bloodmoon/app REPO_URL=https://github.com/BryanPatrick/mu-bloodmoon-v1.git ./deploy/scripts/game-vps-deploy-web-linux.sh
```

O script:

- clona ou atualiza o projeto;
- instala dependencias;
- gera o build do Nuxt;
- cria um servico systemd `bloodmoon-web.service`;
- inicia o app em `127.0.0.1:3000`.

Depois disso o web server do VPS precisa fazer proxy do dominio para `127.0.0.1:3000`.

### Windows

Usar `deploy/scripts/game-vps-deploy-web-windows.ps1`:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\scripts\game-vps-deploy-web-windows.ps1 `
  -AppRoot "C:\BloodMoon\app" `
  -RepoUrl "https://github.com/BryanPatrick/mu-bloodmoon-v1.git"
```

O script:

- clona ou atualiza o projeto;
- instala dependencias;
- gera o build do Nuxt;
- cria um script `start-web.ps1`;
- deixa o comando pronto para rodar o app em `127.0.0.1:3000`.

No Windows ainda precisamos confirmar se vamos usar NSSM, PM2, IIS reverse proxy ou OpenLiteSpeed para manter o processo sempre online.

## Proxy do dominio

Nao configurar no escuro. Depende do web server real.

Alvo do proxy:

```text
http://127.0.0.1:3000
```

Cuidados:

- manter HTTPS;
- preservar headers `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`;
- decidir se `/admincp` continua indo para o PG MuCMS antigo durante transicao;
- validar rollback antes de trocar a raiz do dominio.

## Rollback

Se o novo site falhar:

1. parar `bloodmoon-web` ou processo Node;
2. remover proxy para `127.0.0.1:3000`;
3. apontar o web server de volta para a raiz antiga;
4. conferir `https://mubloodmoon.com.br`;
5. guardar logs da falha.

## O que fica pendente apos subir

- integrar SQL Server real;
- decidir substituicao ou convivencia com `/admincp`;
- configurar processo permanente no Windows se o VPS for Windows;
- configurar backup automatico do site e banco;
- revisar seguranca do AdminCP atual.

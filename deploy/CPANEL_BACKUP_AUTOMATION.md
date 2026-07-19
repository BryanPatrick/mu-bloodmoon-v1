# Backup automatico no cPanel

## O que fica protegido

A rotina `deploy/scripts/cpanel-production-backup.sh` gera:

- dump consistente do MySQL/MariaDB, incluindo procedures, triggers e events;
- arquivo compactado somente dos diretorios mutaveis que existirem;
- checksums SHA-256 e manifesto de cada execucao;
- log separado e bloqueio contra duas execucoes simultaneas.

O codigo da API e do site continua protegido pelo Git e pelos pacotes de deploy. Um backup completo do cPanel deve ser criado antes de mudancas grandes, mas nao deve permanecer na conta: a cota atual de 2 GB nao comporta retencao de backups completos.

## Instalacao

No cPanel, salve o script em:

```text
/home/USUARIO/bin/bloodmoon-backup.sh
```

Permissoes:

```bash
chmod 700 /home/USUARIO/bin/bloodmoon-backup.sh
```

Cron recomendado, diariamente as 03:17:

```cron
17 3 * * * /home/USUARIO/bin/bloodmoon-backup.sh
```

Por padrao, a conexao MySQL e lida do arquivo protegido do Node.js Selector. Se o provedor mudar, crie `~/.bloodmoon-backup.env` com permissao `600` e defina `DATABASE_URL`.

## Retencao e copia externa

A conta conserva tres dias localmente por padrao. Para um backup realmente resistente a perda da hospedagem, configure um destino externo:

```env
RCLONE_REMOTE=backblaze:bloodmoon-production
LOCAL_RETENTION_DAYS=3
BACKUP_ALERT_EMAIL=operacao@example.com
```

Destinos adequados: Backblaze B2, Amazon S3, Cloudflare R2 ou outro servidor. A maquina de desenvolvimento pode receber copias adicionais, mas nao substitui um destino automatico sempre disponivel.

Politica recomendada no destino externo:

- diarios: 7;
- semanais: 4;
- mensais: 6;
- teste de restauracao: mensal.

## Restauracao

Validar o checksum antes de restaurar:

```bash
cd CAMINHO_DO_BACKUP
sha256sum -c SHA256SUMS
```

Banco:

```bash
gzip -dc database.sql.gz | mysql -h HOST -u USUARIO -p BANCO
```

Arquivos mutaveis:

```bash
tar -xzf mutable-assets.tar.gz -C /home/USUARIO
```

Toda restauracao deve ser testada primeiro em banco e diretorio temporarios.

# Blood Moon Preview - production readiness

Data da auditoria: 2026-08-11

## Decisao da release

O deploy permanece bloqueado. Nenhuma migration pendente foi aplicada e o
codigo atual de producao nao foi substituido. A decisao e deliberada: a
auditoria encontrou pre-condicoes obrigatorias ausentes para habilitar
cadastro publico com seguranca.

## Identificacao

- release pretendida: `Blood Moon Preview`;
- baseline auditada: `b4172a529f25d0f2a48867447e68fd32b718ff91`;
- dominio web: `https://mubloodmoon.com.br`;
- dominio API: `https://api.mubloodmoon.com.br`.

## Backup

- backup MySQL consistente criado antes de qualquer migration;
- artefato remoto: `~/backups/bloodmoon/daily/20260811-203613`;
- conteudo: dump compactado, manifesto e checksums SHA-256;
- cron diario: `03:17`;
- copia externa: ainda nao configurada;
- retencao local padrao: tres dias.

O script foi atualizado para proteger `~/bloodmoon-storage`, os fallbacks
legados em `~/bmapi/storage` e os demais caminhos mutaveis conhecidos. Midias
novas devem usar `COMMUNITY_MEDIA_DIR` e `GUILD_MEDIA_DIR` fora das raizes
substituidas pelo deploy.

## Banco e migrations

O banco de producao possui 70 tabelas e a tabela `_prisma_migrations` esta
presente. Nao existem migrations exclusivas de producao que estejam ausentes
do repositorio.

Migrations versionadas pendentes:

1. `20260802130000_community_social_profiles`;
2. `20260802170000_community_posts_stage_three`;
3. `20260802190000_community_social_interactions`;
4. `20260809120000_password_reset_tokens`;
5. `20260811191200_mercadopago_recharge_payments`;
6. `20260811210000_guilds_foundation`.

Elas so podem ser aplicadas depois de remover os bloqueadores abaixo. Apos a
aplicacao, executar `prisma migrate status`, conferir as seis entradas em
`_prisma_migrations` e validar as tabelas `PasswordResetToken` e `Guild`.

## Bloqueadores

### SUPER_ADMIN

Producao possui zero contas `SUPER_ADMIN` ativas. Existem tres contas
`PLAYER` ativas. Nao promover conta de teste com senha conhecida. O fluxo
seguro e:

1. configurar Turnstile;
2. cadastrar uma conta proprietaria com senha forte e e-mail controlado;
3. promover essa conta uma unica vez por procedimento operacional auditado;
4. invalidar sessoes anteriores e confirmar login no painel;
5. manter cadastro publico restrito a `PLAYER`.

### CAPTCHA

As variaveis reais `TURNSTILE_SECRET_KEY`,
`TURNSTILE_EXPECTED_HOSTNAMES` e `NUXT_PUBLIC_TURNSTILE_SITE_KEY` nao estao
configuradas em producao. O backend valida o token no servidor e falha fechado
quando a chave nao existe. Chaves oficiais de teste nunca devem ser usadas com
`NODE_ENV=production`.

### Recuperacao de senha

O fluxo de token hash, expiracao, uso unico e revogacao de sessoes esta
implementado, mas producao ainda nao possui transporte de e-mail aprovado. O
cPanel possui infraestrutura de caixas postais, mas o aplicativo nao deve
simular entrega. E necessario aprovar e configurar SMTP do cPanel ou um
provedor transacional e executar um teste real de entrega.

## Controles confirmados

- cadastro cria explicitamente `PLAYER`, `ACTIVE` e saldos zerados;
- login, refresh, logout e sessoes persistidas sao server-side;
- endpoints de autenticacao possuem CAPTCHA server-side e limites separados;
- eventos `auth.login_failed`, `auth.rate_limited` e
  `auth.captcha_failed` sao auditados sem senha, JWT ou token CAPTCHA;
- CORS de producao aceita a origem HTTPS oficial e credenciais;
- HTTP redireciona para HTTPS nos dominios web, `www` e API;
- uploads Community/Guild exigem JWT, limite de 8 MB, validacao do formato
  real, dimensoes/pixels, reprocessamento Sharp e nome aleatorio;
- cobranca real permanece desabilitada por padrao e e rejeitada tambem na API;
- a interface de recarga informa indisponibilidade quando a flag publica esta
  desligada;
- integracoes financeiras e sincronizacao real de Guilds permanecem fora do
  preview.

## Gates executados

- `npm run api:check`: aprovado;
- `npm run test:beta`: aprovado;
- smoke web: 16 testes aprovados;
- Community: 111 testes aprovados;
- abuso de autenticacao, Guilds e recarga: 39 testes aprovados;
- pagamento/recarga: inclui teste fail-closed com a flag desligada;
- `npm run lint`: zero erros e 49 warnings preexistentes;
- Marketplace: check estrutural da API e smoke da experiencia comercial
  aprovados; ainda nao existe um E2E backend dedicado para Marketplace.

## Estado publico observado antes da release

- Home, Login, Marketplace e Community respondem;
- `/gazeta` ainda responde 404 porque a nova release nao foi publicada;
- `/loja` ainda exibe o comportamento da release anterior;
- CORS HTTPS responde corretamente para a origem oficial.

## Rollback planejado

### Codigo

1. conservar o pacote atualmente publicado antes da troca;
2. registrar o commit anterior e o commit da release;
3. restaurar os diretorios Passenger anteriores da API e do web;
4. reiniciar ambas as aplicacoes no Node Selector;
5. validar Home, Login e endpoint publico da API.

### Banco

As seis migrations pendentes criam tabelas, colunas, indices, enums e chaves
estrangeiras. Nao existe rollback automatico seguro por `prisma migrate`.
Se a release falhar depois das migrations, restaurar o dump completo em um
banco temporario, validar checksums e consistencia, e somente entao efetuar a
restauracao controlada. Nao executar `migrate reset` em producao.

### Midias

Restaurar `mutable-assets.tar.gz` para a home da conta e manter
`bloodmoon-storage` fora das raizes substituidas pelo deploy.

## Checklist para desbloqueio

- [ ] criar Turnstile real para os hostnames oficiais;
- [ ] configurar as chaves apenas no ambiente do cPanel;
- [ ] aprovar SMTP/provedor e remetente de recuperacao;
- [ ] cadastrar e promover de forma auditada um proprietario `SUPER_ADMIN`;
- [ ] definir caminhos persistentes de Community/Guild no ambiente da API;
- [ ] executar novo backup imediatamente antes das migrations;
- [ ] aplicar somente as seis migrations listadas;
- [ ] publicar API e web com pagamentos reais desligados;
- [ ] executar os 18 testes pos-deploy do plano da release.

# Checklist para publicar no VPS do jogo

Este e o novo caminho preferencial do Blood Moon: rodar o site no mesmo VPS do servidor MU e conversar com o SQL Server pelo lado servidor.

## Regra de seguranca

O navegador do usuario nunca deve acessar o SQL Server diretamente. A comunicacao correta e:

```text
Usuario -> HTTPS -> site/API server-side -> SQL Server local/privado
```

## O que ja foi observado publicamente

- Dominio atual: `mubloodmoon.com.br`.
- IP atual: `190.102.41.133`.
- IP do VPS informado para deploy: `151.243.219.30`.
- Em `151.243.219.30`, apenas RDP `3389` respondeu no teste local.
- Em `151.243.219.30`, SSH `22`, HTTP `80`, HTTPS `443`, SMB `445`, RPC `135` e WinRM `5985/5986` nao responderam no teste local.
- Site atual: PG MuCMS, originalmente DmN MuCMS.
- Runtime publico: PHP 8.1.33 em LiteSpeed.
- AdminCP atual: `/admincp`.
- No dominio atual `mubloodmoon.com.br`/`190.102.41.133`, as portas `1433` e `3389` nao responderam publicamente no teste local, o que e desejavel.
- O AdminCP ja possui mapeamentos de tabelas MU, incluindo:
  - `Character.ResetCount`
  - `Character.MasterResetCount`
  - `CashShopData.WCoinC`
  - `CashShopData.GoblinPoint`
  - `MasterSkillTree.MasterLevel`
  - rankings como `RankingBloodCastle`, `RankingDevilSquare`, `RankingChaosCastle`, `RankingCastleSiege`

## Acessos necessarios

- Acesso ao VPS por RDP ou SSH, conforme o sistema operacional.
- Usuario administrativo temporario.
- Caminho onde o MuServer esta instalado.
- Caminho onde o site atual PG MuCMS esta instalado.
- Dados de conexao SQL Server:
  - host/instancia;
  - porta;
  - banco principal;
  - usuario;
  - permissoes;
  - se usa Windows Auth ou SQL Auth.
- Local dos backups atuais.
- Como o LiteSpeed/PHP esta instalado e configurado.
- Se ha painel tipo CyberPanel/OpenLiteSpeed/cPanel/Plesk.

## Primeira entrada no VPS

1. Nao alterar arquivos ainda.
2. Confirmar sistema operacional e recursos.
3. Exportar lista de servicos.
4. Identificar web server e raiz do site atual.
5. Identificar SQL Server e bancos.
6. Fazer backup do site atual.
7. Fazer backup do banco antes de qualquer migracao.
8. Registrar portas abertas e firewall.
9. Confirmar se podemos rodar Node.js no VPS.
10. Confirmar se o site novo vai substituir o PG MuCMS ou rodar em rota/subdominio temporario.

## Backup e deploy do site novo

Roteiro detalhado: `deploy/GAME_VPS_BACKUP_AND_DEPLOY.md`.

Scripts preparados:

- Linux backup: `deploy/scripts/game-vps-backup-site-linux.sh`
- Windows backup: `deploy/scripts/game-vps-backup-site-windows.ps1`
- Linux deploy web: `deploy/scripts/game-vps-deploy-web-linux.sh`
- Windows deploy web: `deploy/scripts/game-vps-deploy-web-windows.ps1`

Esses scripts nao devem ser executados sem antes confirmar a raiz real do site atual no VPS.

## Estrategia recomendada

### Fase 1: convivencia segura

- Manter o PG MuCMS atual funcionando.
- Subir o Blood Moon novo em porta local ou subdominio temporario.
- Usar API interna/server-side para ler SQL Server.
- Nao escrever inventario, moedas ou warehouse ate validar procedures e locks.

### Fase 2: leitura controlada

- Ler contas, personagens, rankings, guilds e status online.
- Criar adaptadores para as tabelas reais do servidor.
- Manter credenciais em `.env` no VPS, nunca no repositorio.

### Fase 3: escrita auditada

- Liberar somente operacoes pequenas e reversiveis.
- Registrar auditoria propria.
- Usar transacoes SQL.
- Validar backups antes de qualquer operacao de moeda, loja, bau ou inventario.

### Fase 4: substituicao do CMS antigo

- Migrar paginas publicas.
- Migrar painel administrativo necessario.
- Manter ou redirecionar rotas antigas.
- Desativar o PG MuCMS somente depois de validacao.

## Pontos que precisam de decisao

- O novo site vai substituir a raiz `https://mubloodmoon.com.br/` imediatamente ou primeiro ficar em `/novo`/subdominio?
- O painel novo vai substituir `/admincp` ou manteremos o AdminCP antigo durante a transicao?
- Vamos manter dados editoriais/wiki em arquivos/JSON inicialmente ou criar tabelas proprias no SQL Server?
- O marketplace sera desativado ate existir trava real de item no banco do jogo?

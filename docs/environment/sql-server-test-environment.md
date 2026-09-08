---
status: LIVE_DOCUMENT — BLOCKED, AGUARDANDO DECISÃO
category: environment
audience: internal (engineering + Bryan)
lastVerified: 2026-08-30
---

# Ambiente de Teste SQL Server¹ Descartável — Tentativa e Bloqueio

## Objetivo

Decisão F do plano `docs/gamebridge/gamebridge-agent-extension-plan.md` aprovou a criação de um SQL Server local/descartável, compatível com produção, para testar de verdade as 4 novas stored procedures² (`bm_GrantVip`, `bm_SyncVipTier`, `bm_AnonymizeGameAccount`, `bm_PurgeGameAccount`) antes de qualquer alteração em produção. Este documento registra a tentativa real de criar esse ambiente e o motivo exato do bloqueio encontrado.

## ANTERIOR (estado antes desta tentativa)

Nenhum motor SQL Server, em nenhuma edição, estava presente nesta máquina. Nenhum Docker. Nenhum `sqlcmd`. Nenhum `SqlLocalDB`. Confirmado via:
```powershell
docker --version          # comando não encontrado
sqllocaldb info           # comando não reconhecido
Get-Service -Name "MSSQL*"  # nenhum resultado
```

## Decisão tomada com Bryan

Perguntado diretamente (via pergunta estruturada no chat) qual caminho seguir: (1) instalar .NET SDK + SQL Server Express/Developer local; (2) só .NET SDK, procedures como código não-testado; (3) nenhuma instalação. **Bryan escolheu a opção 1** — instalar ambos.

## Tentativa 1 — SQL Server 2022 Developer Edition (motor completo)

- **Origem do instalador**: bootstrapper oficial da Microsoft, `https://go.microsoft.com/fwlink/p/?linkid=2215158` (link oficial de download do SQL Server 2022 Developer Edition — gratuita para uso de desenvolvimento/teste, não para produção).
- **Onde foi baixado**: `D:\MU\RemoteData\sql-server-test-install\SQL2022-SSEI-Dev.exe` (bootstrapper, ~4,2 MB).
- **Comando tentado**:
  ```powershell
  Start-Process -FilePath $exe -ArgumentList "/ACTION=Download","/MEDIAPATH=$mediaPath","/MEDIATYPE=Core","/QUIET" -Wait -NoNewWindow
  ```
- **Resultado**: falhou imediatamente, antes mesmo de baixar a mídia completa de instalação.
- **Erro exato**: `Start-Process : Esse comando não pode ser executado devido ao erro: A operação solicitada requer elevação.`
- **Causa raiz**: o bootstrapper do SQL Server exige privilégio de administrador do Windows mesmo só para baixar a mídia de instalação — não é possível contornar isso na camada do PowerShell.

## Tentativa 2 — SQL Server Express LocalDB (motor mais leve)

Como segunda tentativa, mais leve (LocalDB é o mesmo motor T-SQL³ real do SQL Server, mas roda como processo por usuário em vez de serviço do Windows tradicional — em algumas configurações não exige administrador):

- **Origem do instalador**: download oficial da Microsoft, `https://download.microsoft.com/download/3/8/d/38de7036-2433-4207-8eae-06e247e17b25/SqlLocalDB.msi` (instalador MSI standalone do SQL Server 2022 Express LocalDB).
- **Onde foi baixado**: `D:\MU\RemoteData\sql-server-test-install\SqlLocalDB.msi` (~63,5 MB).
- **Comando tentado**:
  ```powershell
  msiexec.exe /i "SqlLocalDB.msi" /quiet /norestart /log "localdb-install.log"
  ```
- **Resultado**: instalação abortada. Código de saída do MSI: `1603` (erro fatal de instalação).
- **Erro exato, extraído do log** (`localdb-install.log`, decodificado de UTF-16LE):
  > "Product: Microsoft SQL Server 2022 LocalDB -- Setup requires this user to be in the administrator group in order to continue the installation process. Setup is aborting, as the current user is not in the administrator group."
- **Causa raiz confirmada, sem ambiguidade**: o usuário do Windows usado por esta sessão (`DESKTOP-9368KF9\Mini DELL3080`) **não é membro do grupo Administrators local** — confirmado de duas formas independentes: (a) `whoami /groups` não lista `Administrators`; (b) o próprio instalador do LocalDB verifica isso explicitamente como condição de lançamento (`LaunchConditions`) e recusa continuar.

## COMO FICOU (estado atual)

- **.NET SDK**: instalado com sucesso, sem esse problema (instalação por usuário, não precisa de admin — ver `development-environment.md`).
- **SQL Server (qualquer edição)**: **não instalado**. Bloqueado por falta de privilégio de administrador do Windows na conta usada por esta sessão — não é um problema de rede, de licença, de espaço em disco, nem de escolha de edição; é estritamente uma questão de permissão do sistema operacional.
- Nenhum dado, nenhuma configuração de produção foi tocada nesta tentativa — apenas downloads para uma pasta local (`D:\MU\RemoteData\sql-server-test-install\`) e duas tentativas de instalação, ambas recusadas pelo próprio instalador antes de qualquer mudança real no sistema.

## O que resolveria isso (nenhuma executada ainda — decisão do Bryan)

1. **Bryan (ou outra conta administradora desta máquina) instala o SQL Server manualmente**, de forma interativa, aceitando o prompt de UAC⁴ que uma sessão automatizada não consegue responder. Uma vez instalado, uma sessão futura do Claude pode usá-lo normalmente (criar/apagar bancos de teste, rodar as procedures) sem precisar de privilégio de administrador para o *uso* — só a *instalação* exige isso.
2. **Adicionar a conta `Mini DELL3080` ao grupo Administrators** — resolveria de forma mais ampla (não só para SQL Server), mas é uma mudança de permissão do sistema com implicações de segurança fora do escopo desta tarefa; deve ser uma decisão consciente do Bryan, não algo que uma sessão do Claude decida ou solicite implicitamente.
3. **Não instalar SQL Server nesta máquina** e usar um ambiente de teste remoto/separado (ex.: uma instância de teste na nuvem, ou pedir para alguém com acesso administrativo rodar os testes em outra máquina) — mais trabalho de coordenação, mas evita mexer em permissões desta máquina.
4. **Prosseguir sem testar as stored procedures contra um motor T-SQL real nesta fase** — as 4 procedures são escritas como código completo, revisado, seguindo rigorosamente o mesmo padrão já aprovado e comprovado em produção (`dbo.DmN_CreateGameAccount`), mas ficam marcadas como não-executadas até que uma das opções acima resolva o acesso.

**Esta sessão está seguindo a opção 4 como fallback prático enquanto aguarda a decisão do Bryan sobre 1-3**, e vai deixar isso reportado explicitamente como uma pendência real (`REAL_BLOCKERS_REMAINING`) no relatório final da fase — não como algo silenciosamente resolvido.

## Como reproduzir esta tentativa (para verificação futura)

Os dois instaladores continuam salvos em `D:\MU\RemoteData\sql-server-test-install\` (bootstrapper do Developer Edition e o MSI do LocalDB) — uma conta administradora pode rodar os mesmos comandos documentados acima diretamente, sem precisar baixar nada de novo, e devem funcionar normalmente com privilégio de administrador.

## Glossário

1. **SQL Server**: o motor de banco de dados relacional da Microsoft usado pelo GameServer real do Blood Moon (banco `MuOnline`) — diferente do MySQL usado pelo Portal (apps/api).
2. **Stored procedure**: um bloco de código SQL pré-compilado e salvo dentro do próprio banco de dados, que pode ser executado por nome em vez de enviar o SQL bruto a cada chamada — é a base do modelo de segurança do GameBridge (o usuário `bloodmoon_writer` só pode *executar* procedures específicas, nunca enviar SQL livre).
3. **T-SQL — Transact-SQL**: o dialeto de SQL usado especificamente pelo SQL Server (diferente do dialeto usado por MySQL/MariaDB) — inclui recursos como `sp_getapplock` (usado neste projeto para controle de concorrência) que não existem em outros bancos.
4. **UAC — User Account Control**: o mecanismo do Windows que exibe um prompt de confirmação antes de permitir que um programa faça alterações que exigem privilégio de administrador — não pode ser respondido por um processo não-interativo.

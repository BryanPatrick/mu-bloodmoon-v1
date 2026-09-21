---
status: LIVE_DOCUMENT
category: environment
audience: internal (engineering + future agents/onboarding)
lastVerified: 2026-08-30
---

# Ambiente de Desenvolvimento — Estado e Histórico

Este documento registra, de forma permanente, o que existe (ou não existe) na máquina de desenvolvimento usada nas sessões deste projeto, o que foi instalado, por quê, como, e quais limitações reais foram encontradas. Não é um documento de uma fase específica — é o estado consolidado do ambiente, atualizado conforme ele muda.

## Máquina

- Sistema operacional: Windows 10 IoT Enterprise LTSC 2021 (10.0.19044)
- Usuário do Windows usado pelas sessões do Claude: `DESKTOP-9368KF9\Mini DELL3080`
- **Este usuário NÃO é membro do grupo Administrators do Windows** (confirmado em 2026-08-30, via `whoami /groups` e via uma tentativa real de instalação que falhou por esse motivo exato — ver `sql-server-test-environment.md`). Isso significa: nenhuma instalação que exija elevação (UAC) pode ser concluída de forma automatizada por uma sessão do Claude nesta máquina, mesmo com aprovação do usuário no chat — a aprovação no chat não substitui a elevação real do Windows.

## Ferramentas confirmadas presentes (antes de qualquer instalação nova)

| Ferramenta | Presente? | Versão | Observação |
|---|---|---|---|
| Node.js | Sim | (via `node --version`, usado extensivamente em todo o projeto) | Usado por apps/api, apps/web, apps/game-data-worker |
| npm | Sim | — | Gerenciador de pacotes do workspace raiz |
| Git (Git Bash) | Sim | — | Shell POSIX usado pela ferramenta Bash |
| MySQL local | Sim | — | `bloodmoon_local_claude`, credencial via DPAPI¹, ver ~~`docs/environment/gamebridge-local-testing.md`~~ `docs/gamebridge/gamebridge-local-testing.md` *(caminho corrigido em 2026-09-21, Fase 20B)* para o papel dela nos testes do Portal |
| Docker | **Não** | — | Confirmado ausente (`docker: command not found`) em múltiplas sessões deste projeto, incluindo esta |
| SQL Server (qualquer edição) | **Não, antes desta fase** | — | Nenhuma instância local, nenhum `sqlcmd`, nenhum `SqlLocalDB` |
| .NET SDK | **Não, antes desta fase** | — | Apenas o *runtime* .NET estava presente (`C:\Program Files\dotnet` e `C:\Program Files (x86)\dotnet`, só a pasta `shared`, sem `sdk`) — suficiente para *rodar* um app .NET já compilado, insuficiente para compilar ou rodar testes do GameBridge Agent (`apps/game-bridge-agent`, projeto .NET 8) |
| winget | Não | — | Sem gerenciador de pacotes do Windows disponível |

## O que foi instalado nesta fase (2026-08-30, Fase de extensão do GameBridge)

### .NET 8 SDK — instalado com sucesso

- **O que**: .NET SDK 8.0.424 (a versão canal 8.0 mais recente disponível no momento)
- **Por que**: `apps/game-bridge-agent/BloodMoon.GameBridgeAgent.csproj` e seu projeto de testes (`BloodMoon.GameBridgeAgent.Tests`) são um projeto .NET 8 real já existente no repositório — sem o SDK, não é possível compilar (`dotnet build`), rodar (`dotnet run`) nem testar (`dotnet test`) esse código, o que bloquearia qualquer verificação real das mudanças no Agent para a extensão do GameBridge (`GRANT_VIP`/`SYNC_VIP_TIER`/`ANONYMIZE_GAME_ACCOUNT`/`PURGE_GAME_ACCOUNT`).
- **Como foi instalado**: script oficial da Microsoft (`https://dot.net/v1/dotnet-install.ps1`), baixado e executado via PowerShell, **sem precisar de privilégio de administrador** (instalação por usuário, não instala um serviço do Windows nem precisa de MSI elevado).
- **Onde foi instalado**: `C:\Users\Mini DELL3080\AppData\Local\Microsoft\dotnet` (escopo do usuário atual, não system-wide).
- **Comando exato usado**:
  ```powershell
  Invoke-WebRequest -Uri "https://dot.net/v1/dotnet-install.ps1" -OutFile "$env:TEMP\dotnet-install.ps1" -UseBasicParsing
  & "$env:TEMP\dotnet-install.ps1" -Channel 8.0 -InstallDir "$env:LOCALAPPDATA\Microsoft\dotnet"
  ```
- **Configuração aplicada**: nenhuma além do install em si — o PATH precisa ser ajustado manualmente em cada nova sessão de PowerShell (`$env:PATH = "$env:LOCALAPPDATA\Microsoft\dotnet;" + $env:PATH`), já que a instalação por usuário não altera o PATH do sistema permanentemente sem uma etapa adicional (não feita, para não modificar configuração global da máquina sem necessidade).
- **Validação real executada**: `dotnet --version` → `8.0.424`; `dotnet build` no projeto do Agent → sucesso, 0 erros, 0 avisos; `dotnet test` no projeto de testes → **75/75 testes passando** (a documentação antiga do Agent mencionava "70/70" — o código cresceu desde aquele snapshot; 75 é o número real e atual, confirmado nesta sessão).
- **Limitações encontradas**: nenhuma para o SDK em si — a instalação por usuário funcionou sem exigir privilégios elevados, ao contrário do SQL Server (ver abaixo).
- **Como reproduzir**: rodar exatamente os dois comandos acima em qualquer máquina Windows com acesso à internet — não exige conta de administrador.
- **Como remover**: apagar a pasta `C:\Users\Mini DELL3080\AppData\Local\Microsoft\dotnet` — não deixa nenhum serviço do Windows, chave de registro do sistema, ou artefato fora dessa pasta (instalação por usuário).
- **Impacto no projeto**: nenhuma mudança em nenhum arquivo do repositório — é puramente uma ferramenta de desenvolvimento local, não um novo requisito de produção. Um `.dotnet-tools` ou instrução de setup para outros desenvolvedores/sessões futuras pode ser adicionada separadamente se decidido.

### SQL Server (Express, Developer, ou LocalDB) — instalação BLOQUEADA, não foi possível concluir

Ver `docs/environment/sql-server-test-environment.md` para o registro completo e detalhado desta tentativa, incluindo a mensagem de erro exata e as opções restantes.

## Glossário desta seção

1. **DPAPI — Data Protection API**: mecanismo de criptografia do próprio Windows que protege segredos (como credenciais de banco de dados) vinculando-os à conta de usuário e à máquina — usado neste projeto para armazenar a credencial do MySQL local sem colocá-la em texto puro em nenhum arquivo do repositório.

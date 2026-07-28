# Serviços do launcher

Cada classe possui uma responsabilidade única:

- `PatchService`: consulta, valida e aplica atualizações transacionais.
- `BackupService`: cria e restaura backups locais.
- `GameConfigurationService`: grava somente as chaves conhecidas do MU em HKCU.
- `GameProcessService`: valida e inicia `main.exe`.
- `SettingsService`: persiste preferências por usuário em `%LOCALAPPDATA%`.
- `PathGuard`: impede acesso fora da pasta do cliente.

Não coloque lógica visual nesta pasta.

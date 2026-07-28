# BloodMoon Launcher Updater

Processo independente usado somente para atualizar o executavel do launcher. Ele
aguarda o launcher encerrar, move a versao atual para
`BloodMoonLauncher.exe.previous`, instala o arquivo ja validado por SHA-256 e
abre a nova versao.

O updater nao consulta API, banco ou manifesto e nao recebe credenciais. Ele
deve ser distribuido ao lado de `BloodMoonLauncher.exe`.

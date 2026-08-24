[CmdletBinding()]
param([string]$InstallRoot = 'C:\BloodMoonGameBridgeAgent')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security

function Unprotect-Secret([string]$Name) {
  $path = Join-Path $InstallRoot "secrets\$Name.dpapi"
  $protected = [Convert]::FromBase64String((Get-Content -LiteralPath $path -Raw).Trim())
  $plain = [Security.Cryptography.ProtectedData]::Unprotect($protected, $null, [Security.Cryptography.DataProtectionScope]::LocalMachine)
  try { return [Text.Encoding]::UTF8.GetString($plain) }
  finally { [Array]::Clear($plain, 0, $plain.Length); [Array]::Clear($protected, 0, $protected.Length) }
}

$readerUser = Unprotect-Secret 'sql-reader-user'
$readerPassword = Unprotect-Secret 'sql-reader-password'
$writerUser = Unprotect-Secret 'sql-writer-user'
$writerPassword = Unprotect-Secret 'sql-writer-password'
$env:BLOODMOON_AGENT_Agent__AgentId = 'gamebridge-agent-01'
$env:BLOODMOON_AGENT_Agent__ServerId = 'bloodmoon-s6'
$env:BLOODMOON_AGENT_Agent__CommandEnvironment = 'production'
$env:BLOODMOON_AGENT_Agent__WorkerBaseUrl = 'https://bloodmoon-game-data-worker.bryanelrick22.workers.dev'
$env:BLOODMOON_AGENT_Agent__HmacSecret = Unprotect-Secret 'telemetry-hmac'
$env:BLOODMOON_AGENT_Agent__CommandHmacSecret = Unprotect-Secret 'command-hmac'
$env:BLOODMOON_AGENT_Agent__SqlServerConnectionString = "Server=127.0.0.1,1433;Database=MuOnline;User ID=$readerUser;Password=$readerPassword;Encrypt=False;TrustServerCertificate=True;Connect Timeout=8;Application Name=BloodMoonGameBridgeObserver"
$env:BLOODMOON_AGENT_Agent__SqlServerWriterConnectionString = "Server=127.0.0.1,1433;Database=MuOnline;User ID=$writerUser;Password=$writerPassword;Encrypt=False;TrustServerCertificate=True;Connect Timeout=8;Application Name=BloodMoonGameBridgeWriter"
$env:BLOODMOON_AGENT_Agent__LocalStorePath = Join-Path $InstallRoot 'data\agent-local-store.sqlite3'
$env:BLOODMOON_AGENT_Agent__ProvisioningLedgerPath = Join-Path $InstallRoot 'data\provisioning-ledger.sqlite3'
$env:BLOODMOON_AGENT_Agent__GameCredentialKeyRingPath = Join-Path $InstallRoot 'secrets\game-credential-keys.dpapi.json'
$env:BLOODMOON_AGENT_Agent__CommandPollIntervalSeconds = '10'
$env:BLOODMOON_AGENT_Agent__CommandMaxBackoffSeconds = '120'

Set-Location -LiteralPath $InstallRoot
& (Join-Path $InstallRoot 'BloodMoonGameBridgeAgent.exe') *>> (Join-Path $InstallRoot 'logs\agent.log')
exit $LASTEXITCODE

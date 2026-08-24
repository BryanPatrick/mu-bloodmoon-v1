[CmdletBinding()]
param([string]$InstallRoot = 'C:\BloodMoonGameBridgeAgent')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security

$payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
if ($payload.format -ne 'BM_AGENT_INSTALL_V1') { throw 'INVALID_INSTALL_PAYLOAD' }
New-Item -ItemType Directory -Force -Path $InstallRoot,(Join-Path $InstallRoot 'data'),(Join-Path $InstallRoot 'logs'),(Join-Path $InstallRoot 'secrets') | Out-Null

function Protect-Secret([string]$Name, [string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { throw "MISSING_SECRET_$Name" }
  $plain = [Text.Encoding]::UTF8.GetBytes($Value)
  try {
    $protected = [Security.Cryptography.ProtectedData]::Protect($plain, $null, [Security.Cryptography.DataProtectionScope]::LocalMachine)
    $utf8 = New-Object Text.UTF8Encoding($false)
    [IO.File]::WriteAllText((Join-Path $InstallRoot "secrets\$Name.dpapi"), [Convert]::ToBase64String($protected), $utf8)
  } finally { [Array]::Clear($plain, 0, $plain.Length); if ($protected) { [Array]::Clear($protected, 0, $protected.Length) } }
}

Protect-Secret 'sql-reader-user' $payload.sqlReaderUser
Protect-Secret 'sql-reader-password' $payload.sqlReaderPassword
Protect-Secret 'sql-writer-user' $payload.sqlWriterUser
Protect-Secret 'sql-writer-password' $payload.sqlWriterPassword
Protect-Secret 'telemetry-hmac' $payload.telemetryHmac
Protect-Secret 'command-hmac' $payload.commandHmac

$keyRingJson = @{ v1 = [string]$payload.gameCredentialKeyV1 } | ConvertTo-Json -Compress
$keyRingBytes = [Text.Encoding]::UTF8.GetBytes($keyRingJson)
try {
  $protectedRing = [Security.Cryptography.ProtectedData]::Protect($keyRingBytes, $null, [Security.Cryptography.DataProtectionScope]::LocalMachine)
  $ringDocument = @{ format='BM_GAME_CREDENTIAL_KEYS_V1'; protectedPayload=[Convert]::ToBase64String($protectedRing) } | ConvertTo-Json -Compress
  $utf8 = New-Object Text.UTF8Encoding($false)
  [IO.File]::WriteAllText((Join-Path $InstallRoot 'secrets\game-credential-keys.dpapi.json'), $ringDocument, $utf8)
} finally { [Array]::Clear($keyRingBytes, 0, $keyRingBytes.Length); if ($protectedRing) { [Array]::Clear($protectedRing, 0, $protectedRing.Length) } }

$acl = Get-Acl (Join-Path $InstallRoot 'secrets')
$acl.SetAccessRuleProtection($true, $false)
$systemSid = New-Object Security.Principal.SecurityIdentifier('S-1-5-18')
$adminsSid = New-Object Security.Principal.SecurityIdentifier('S-1-5-32-544')
$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($systemSid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')))
$acl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($adminsSid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')))
Set-Acl -LiteralPath (Join-Path $InstallRoot 'secrets') -AclObject $acl

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$InstallRoot\Start-GameBridgeAgent.ps1`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -RestartCount 100 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName 'BloodMoonGameBridgeAgent' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName 'BloodMoonGameBridgeAgent'
[pscustomobject]@{ Installed=$true; Task='BloodMoonGameBridgeAgent'; Secrets='DPAPI_LOCAL_MACHINE'; ListenerAdded=$false } | ConvertTo-Json -Compress

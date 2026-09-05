# Phase AA / Part 3 -- SAFE TOOLING ONLY. Not installed, not scheduled, not
# executed against the production Game VPS by this phase: the VPS exposes
# only RDP (confirmed in deploy/GAME_VPS_CHECKLIST.md's own port scan --
# SSH/WinRM/HTTP(S) do not respond), so there is no remote-exec channel to
# install this as a Scheduled Task from this environment even if we wanted
# to. This closes Part 3's "no reliable automation exists -> create SAFE
# tooling/runbook locally" instruction: an operator who RDPs into the VPS
# can install this as a SQL Server Agent job or a Windows Task Scheduler
# task by hand. Until that happens, the ONLY backup of the game database
# that exists is the one manual COPY_ONLY snapshot documented in
# docs/gameserver/database/lab-environment.md (2026-07-16) -- this script
# does not change that fact by itself.
#
# Mirrors cpanel-production-backup.sh's shape for consistency: compressed
# backup + checksum + manifest + age-based local retention + optional
# rclone offsite copy + optional ops-event reporting -- so an operator who
# already understands the MySQL side recognizes this immediately.
#
# Usage (run BY HAND on the Game VPS itself, as an account with SQL Server
# sysadmin or db_backupoperator on the target database):
#   .\game-vps-sqlserver-backup.ps1 -DatabaseName MuOnline -BackupRoot D:\SqlBackups\bloodmoon
param(
  [string]$DatabaseName = "MuOnline",
  [string]$SqlServerInstance = "localhost",
  [string]$BackupRoot = "D:\SqlBackups\bloodmoon",
  [int]$LocalRetentionDays = 3,
  [string]$RcloneRemote = "",
  [string]$OpsEventIngestUrl = "",
  [string]$OpsEventIngestToken = ""
)

$ErrorActionPreference = "Stop"

function Report-OpsEvent {
  param([string]$EventType, [string]$Severity, [string]$Description)
  if (-not $OpsEventIngestUrl -or -not $OpsEventIngestToken) { return }
  try {
    $body = @{ module = "sql-server-backup"; eventType = $EventType; severity = $Severity; description = $Description } | ConvertTo-Json -Compress
    Invoke-RestMethod -Method Post -Uri $OpsEventIngestUrl -Headers @{ Authorization = "Bearer $OpsEventIngestToken" } -ContentType "application/json" -Body $body -TimeoutSec 10 | Out-Null
  } catch {
    Write-Warning "Failed to report ops event $EventType (non-fatal): $($_.Exception.Message)"
  }
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$runDir = Join-Path $BackupRoot $stamp
New-Item -ItemType Directory -Force -Path $runDir | Out-Null
$bakPath = Join-Path $runDir "$DatabaseName.bak"
$logPath = Join-Path $runDir "backup.log"

Start-Transcript -Path $logPath -Append | Out-Null
try {
  Write-Host "Starting SQL Server backup of '$DatabaseName' at $(Get-Date -Format o)."
  Report-OpsEvent -EventType "BACKUP_STARTED" -Severity "INFO" -Description "Game VPS SQL Server backup started for $DatabaseName ($stamp)."

  # COMPRESSION requires SQL Server 2008 Enterprise+ or 2016 SP1+ Standard;
  # confirmed target is SQL Server 2014 per docs/game-data/deployment-
  # topology.md -- if COMPRESSION is unavailable on that edition, drop it
  # and rely on the offsite rclone step's own compression instead.
  $sql = @"
BACKUP DATABASE [$DatabaseName]
TO DISK = N'$bakPath'
WITH COMPRESSION, CHECKSUM, INIT, STATS = 10;
"@
  sqlcmd -S $SqlServerInstance -Q $sql -b
  if ($LASTEXITCODE -ne 0) { throw "sqlcmd BACKUP DATABASE exited with code $LASTEXITCODE" }

  # Integrity check distinct from the backup statement's own CHECKSUM
  # option: RESTORE VERIFYONLY confirms the backup SET is complete and
  # readable without actually restoring it anywhere.
  $verifySql = "RESTORE VERIFYONLY FROM DISK = N'$bakPath' WITH CHECKSUM;"
  sqlcmd -S $SqlServerInstance -Q $verifySql -b
  if ($LASTEXITCODE -ne 0) {
    Report-OpsEvent -EventType "BACKUP_VERIFICATION_FAILED" -Severity "CRITICAL" -Description "RESTORE VERIFYONLY failed for $DatabaseName backup ($stamp)."
    throw "RESTORE VERIFYONLY failed with code $LASTEXITCODE"
  }

  $hash = (Get-FileHash -Path $bakPath -Algorithm SHA256).Hash
  "$hash  $DatabaseName.bak" | Out-File -Encoding ascii (Join-Path $runDir "SHA256SUMS")

  @"
created_at=$(Get-Date -Format o)
host=$(hostname)
database=$DatabaseName
sql_server_instance=$SqlServerInstance
"@ | Out-File -Encoding ascii (Join-Path $runDir "manifest.txt")

  if ($RcloneRemote) {
    $rclone = Get-Command rclone -ErrorAction SilentlyContinue
    if (-not $rclone) {
      Write-Warning "RcloneRemote is set but rclone is not on PATH."
      Report-OpsEvent -EventType "BACKUP_OFFSITE_FAILED" -Severity "WARNING" -Description "rclone binary not found for SQL Server backup offsite copy ($stamp)."
    } else {
      & rclone copy $runDir "$($RcloneRemote.TrimEnd('/'))/$stamp" --checksum
      if ($LASTEXITCODE -ne 0) {
        Report-OpsEvent -EventType "BACKUP_OFFSITE_FAILED" -Severity "WARNING" -Description "rclone copy failed for SQL Server backup ($stamp)."
      } else {
        Write-Host "Offsite copy completed: $RcloneRemote/$stamp"
      }
    }
  } else {
    Write-Host "Offsite copy is not configured; this backup remains on the Game VPS only."
  }

  $cutoff = (Get-Date).AddDays(-$LocalRetentionDays)
  Get-ChildItem -Path $BackupRoot -Directory | Where-Object { $_.LastWriteTime -lt $cutoff } | ForEach-Object {
    Write-Host "Removing expired local backup: $($_.FullName)"
    Remove-Item -Recurse -Force -LiteralPath $_.FullName
  }

  Write-Host "Backup completed at $(Get-Date -Format o): $runDir"
  Report-OpsEvent -EventType "BACKUP_COMPLETED" -Severity "INFO" -Description "Game VPS SQL Server backup completed for $DatabaseName ($stamp)."
} catch {
  Write-Error $_.Exception.Message
  Report-OpsEvent -EventType "BACKUP_FAILED" -Severity "CRITICAL" -Description "Game VPS SQL Server backup failed for $DatabaseName ($stamp): $($_.Exception.Message)"
  throw
} finally {
  Stop-Transcript | Out-Null
}

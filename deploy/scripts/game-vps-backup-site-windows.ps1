param(
  [Parameter(Mandatory = $true)]
  [string]$SiteRoot,

  [string]$BackupRoot = "C:\BloodMoonBackups"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $SiteRoot -PathType Container)) {
  throw "SiteRoot does not exist: $SiteRoot"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$siteName = Split-Path -Leaf $SiteRoot
$backupDir = Join-Path $BackupRoot "$siteName-$stamp"
$archive = Join-Path $BackupRoot "$siteName-$stamp.zip"

New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

Write-Host "Copying $SiteRoot to $backupDir"
Copy-Item -LiteralPath $SiteRoot -Destination $backupDir -Recurse -Force

Write-Host "Creating archive $archive"
Compress-Archive -LiteralPath $backupDir -DestinationPath $archive -Force

Write-Host "Backup complete:"
Write-Host $backupDir
Write-Host $archive

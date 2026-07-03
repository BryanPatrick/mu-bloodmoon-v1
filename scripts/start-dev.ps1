param(
  [switch]$ImportData
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Start-DevWindow {
  param(
    [string]$Title,
    [string]$Command
  )

  $escapedRoot = $repoRoot.Path.Replace("'", "''")
  $escapedTitle = $Title.Replace("'", "''")
  $script = "Set-Location '$escapedRoot'; `$Host.UI.RawUI.WindowTitle = '$escapedTitle'; $Command"

  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $script
  )
}

function Get-EquipmentCount {
  $env:DATABASE_URL = "postgresql://bloodmoon:bloodmoon@localhost:55432/bloodmoon_portal?schema=public"
  $nodeScript = @"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.equipmentRecord.count()
  .then((count) => console.log(count))
  .catch(() => {
    console.log(0);
    process.exitCode = 0;
  })
  .finally(() => prisma.`$disconnect());
"@

  $output = node -e $nodeScript
  $count = 0
  [void][int]::TryParse(($output | Select-Object -Last 1), [ref]$count)
  return $count
}

Write-Host "Blood Moon - ambiente de desenvolvimento" -ForegroundColor Magenta
Write-Host "Raiz: $repoRoot"

if (-not (Test-Path "node_modules")) {
  Write-Step "Instalando dependencias"
  npm install
}

Write-Step "Preparando PostgreSQL e migrations"
npm run db:setup

$equipmentCount = Get-EquipmentCount
if ($ImportData -or $equipmentCount -eq 0) {
  Write-Step "Importando dados preparados para a API"
  npm run db:import
} else {
  Write-Host "Base ja populada: $equipmentCount equipamentos. Pulando importacao." -ForegroundColor Green
}

Write-Step "Abrindo API e Web em janelas separadas"
Start-DevWindow -Title "Blood Moon API :3333" -Command "npm run api:dev"
Start-Sleep -Seconds 2
Start-DevWindow -Title "Blood Moon Web :3000" -Command "npm run web:dev"

Write-Host ""
Write-Host "Pronto. Aguarde as duas janelas terminarem de compilar." -ForegroundColor Green
Write-Host "Web: http://localhost:3000"
Write-Host "API: http://localhost:3333/api"
Write-Host ""
Write-Host "Dica: use iniciar-dev-com-import.bat quando quiser forcar a reimportacao dos dados."

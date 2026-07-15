param(
  [string]$AppRoot = "C:\BloodMoon\app",
  [string]$RepoUrl = "https://github.com/BryanPatrick/mu-bloodmoon-v1.git",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

$appParent = Split-Path -Parent $AppRoot
New-Item -ItemType Directory -Force -Path $appParent | Out-Null

if (Test-Path -LiteralPath (Join-Path $AppRoot ".git") -PathType Container) {
  Write-Host "Updating repository in $AppRoot"
  git -C $AppRoot fetch origin $Branch
  git -C $AppRoot checkout $Branch
  git -C $AppRoot pull --ff-only origin $Branch
} else {
  Write-Host "Cloning repository to $AppRoot"
  git clone --branch $Branch $RepoUrl $AppRoot
}

Set-Location $AppRoot

Write-Host "Installing dependencies"
npm ci

Write-Host "Building Nuxt web app"
npm run web:build

$startScript = Join-Path $AppRoot "start-web.ps1"
@"
`$env:NODE_ENV = "production"
`$env:HOST = "127.0.0.1"
`$env:PORT = "3000"
Set-Location "$AppRoot"
node apps/web/.output/server/index.mjs
"@ | Set-Content -LiteralPath $startScript -Encoding UTF8

Write-Host "Deploy prepared."
Write-Host "Start command:"
Write-Host "powershell -ExecutionPolicy Bypass -File `"$startScript`""
Write-Host "Next step: configure IIS/OpenLiteSpeed/NSSM/PM2 to keep this process online and proxy the domain to http://127.0.0.1:3000."

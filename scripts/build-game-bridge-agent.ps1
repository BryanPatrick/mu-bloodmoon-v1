param(
    [switch]$Test,
    [switch]$Publish
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$project = Join-Path $repositoryRoot 'apps\game-bridge-agent\BloodMoon.GameBridgeAgent.csproj'
$testProject = Join-Path $repositoryRoot 'apps\game-bridge-agent\BloodMoon.GameBridgeAgent.Tests\BloodMoon.GameBridgeAgent.Tests.csproj'
$bundledDotnet = Join-Path $env:USERPROFILE '.cache\dotnet-sdk-8\dotnet.exe'
$dotnet = if ($env:BLOODMOON_DOTNET) {
    $env:BLOODMOON_DOTNET
} elseif (Test-Path -LiteralPath $bundledDotnet) {
    $bundledDotnet
} elseif (Get-Command dotnet -ErrorAction SilentlyContinue) {
    'dotnet'
} else {
    $null
}
$outputRoot = Join-Path $repositoryRoot 'work\game-bridge-agent'

if (-not $dotnet) {
    throw 'SDK .NET 8 não encontrado. Instale o dotnet ou defina BLOODMOON_DOTNET.'
}

if ($Test) {
    & $dotnet test $testProject
    if ($LASTEXITCODE -ne 0) {
        throw 'Falha nos testes do GameBridge Agent.'
    }
    exit 0
}

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

if ($Publish) {
    $publishDirectory = Join-Path $outputRoot 'publish'
    if (Test-Path -LiteralPath $publishDirectory) {
        Remove-Item -LiteralPath $publishDirectory -Recurse -Force
    }
    & $dotnet publish $project `
        --configuration Release `
        --runtime win-x64 `
        --self-contained true `
        --output $publishDirectory
    if ($LASTEXITCODE -ne 0) {
        throw 'Falha ao publicar o GameBridge Agent.'
    }
    Write-Host "GameBridge Agent publicado em: $publishDirectory"
    exit 0
}

& $dotnet build $project --configuration Debug
if ($LASTEXITCODE -ne 0) {
    throw 'Falha ao compilar o GameBridge Agent.'
}

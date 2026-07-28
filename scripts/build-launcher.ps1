param(
    [switch]$Publish,
    [switch]$Preview
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$project = Join-Path $repositoryRoot 'apps\launcher\BloodMoon.Launcher.csproj'
$updaterProject = Join-Path $repositoryRoot 'apps\launcher-updater\BloodMoon.Launcher.Updater.csproj'
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
$outputRoot = Join-Path $repositoryRoot 'work\launcher'
$launcherVersion = ([xml](Get-Content -LiteralPath $project)).Project.PropertyGroup.Version |
    Where-Object { $_ } |
    Select-Object -First 1

if (-not $dotnet) {
    throw 'SDK .NET 8 não encontrado. Instale o dotnet ou defina BLOODMOON_DOTNET.'
}

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

if ($Publish) {
    $publishDirectory = Join-Path $outputRoot 'publish'
    $archivePath = Join-Path $outputRoot "BloodMoonLauncher-v$launcherVersion-win-x64.zip"
    $publicDirectory = Join-Path $repositoryRoot 'apps\web\public\downloads'
    $publicArchive = Join-Path $publicDirectory 'BloodMoonLauncher.zip'

    if (Test-Path -LiteralPath $publishDirectory) {
        Remove-Item -LiteralPath $publishDirectory -Recurse -Force
    }
    & $dotnet publish $project `
        --configuration Release `
        --runtime win-x64 `
        --self-contained true `
        --output $publishDirectory
    if ($LASTEXITCODE -ne 0) {
        throw 'Falha ao publicar o launcher.'
    }
    $updaterPublishDirectory = Join-Path $outputRoot 'updater-publish'
    if (Test-Path -LiteralPath $updaterPublishDirectory) {
        Remove-Item -LiteralPath $updaterPublishDirectory -Recurse -Force
    }
    & $dotnet publish $updaterProject `
        --configuration Release `
        --runtime win-x64 `
        --self-contained true `
        --output $updaterPublishDirectory
    if ($LASTEXITCODE -ne 0) {
        throw 'Falha ao publicar o atualizador independente.'
    }
    Copy-Item `
        -LiteralPath (Join-Path $updaterPublishDirectory 'BloodMoonLauncherUpdater.exe') `
        -Destination (Join-Path $publishDirectory 'BloodMoonLauncherUpdater.exe') `
        -Force

    Get-ChildItem -LiteralPath $publishDirectory -Filter '*.pdb' -File |
        Remove-Item -Force

    if (Test-Path -LiteralPath $archivePath) {
        Remove-Item -LiteralPath $archivePath -Force
    }
    Compress-Archive -Path (Join-Path $publishDirectory '*') -DestinationPath $archivePath -CompressionLevel Optimal
    New-Item -ItemType Directory -Force -Path $publicDirectory | Out-Null
    Copy-Item -LiteralPath $archivePath -Destination $publicArchive -Force

    $executable = Join-Path $publishDirectory 'BloodMoonLauncher.exe'
    $exeHash = (Get-FileHash -LiteralPath $executable -Algorithm SHA256).Hash
    $archiveHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash
    Write-Host "Launcher publicado em: $publishDirectory"
    Write-Host "Pacote criado em: $archivePath"
    Write-Host "Pacote copiado para: $publicArchive"
    Write-Host "SHA256 EXE: $exeHash"
    Write-Host "SHA256 ZIP: $archiveHash"
    exit 0
}

& $dotnet build $project --configuration Debug
if ($LASTEXITCODE -ne 0) {
    throw 'Falha ao compilar o launcher.'
}

if ($Preview) {
    $previewPath = Join-Path $outputRoot 'launcher-preview.png'
    & $dotnet run `
        --project $project `
        --configuration Debug `
        --no-build `
        -- `
        "--render-preview=$previewPath"
    if ($LASTEXITCODE -ne 0) {
        throw 'Falha ao renderizar a prévia.'
    }

    Write-Host "Prévia criada em: $previewPath"
}

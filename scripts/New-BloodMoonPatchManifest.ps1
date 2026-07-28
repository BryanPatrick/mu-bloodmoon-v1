param(
    [Parameter(Mandatory = $true)]
    [string]$ClientDirectory,

    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,

    [Parameter(Mandatory = $true)]
    [string]$Version,

    [string]$OutputPath = 'manifest.json'
)

$ErrorActionPreference = 'Stop'
$clientRoot = (Resolve-Path -LiteralPath $ClientDirectory).Path

function Get-RelativePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Root,

        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $rootWithSeparator = $Root.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
    $rootUri = [Uri]::new($rootWithSeparator)
    $pathUri = [Uri]::new($Path)
    return [Uri]::UnescapeDataString(
        $rootUri.MakeRelativeUri($pathUri).ToString()
    ).Replace('/', [IO.Path]::DirectorySeparatorChar)
}

if (-not $BaseUrl.StartsWith('https://', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'BaseUrl deve usar HTTPS.'
}

$excludedDirectories = @(
    '.bloodmoon',
    'Scripts - Configs',
    'ScreenShots'
)

$excludedFiles = @(
    'BloodMoonLauncher.exe',
    'launcher.settings.json'
)

$files = Get-ChildItem -LiteralPath $clientRoot -File -Recurse |
    Where-Object {
        $relative = Get-RelativePath -Root $clientRoot -Path $_.FullName
        $topLevel = ($relative -split '[\\/]')[0]
        $topLevel -notin $excludedDirectories -and $_.Name -notin $excludedFiles
    } |
    Sort-Object FullName |
    ForEach-Object {
        $relativePath = (Get-RelativePath -Root $clientRoot -Path $_.FullName).Replace('\', '/')
        [ordered]@{
            path = $relativePath
            sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
            size = $_.Length
        }
    }

$manifest = [ordered]@{
    version = $Version
    baseUrl = $BaseUrl.TrimEnd('/') + '/'
    files = @($files)
}

$absoluteOutput = [IO.Path]::GetFullPath($OutputPath)
$outputDirectory = Split-Path -Parent $absoluteOutput
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $absoluteOutput -Encoding utf8

Write-Host "Manifesto criado em: $absoluteOutput"
Write-Host "Arquivos catalogados: $($files.Count)"

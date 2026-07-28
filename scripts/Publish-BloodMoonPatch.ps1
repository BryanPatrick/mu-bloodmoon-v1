param(
    [Parameter(Mandatory = $true)]
    [string]$ClientDirectory,

    [Parameter(Mandatory = $true)]
    [string]$Version,

    [ValidateSet('test', 'production')]
    [string]$Channel = 'test',

    [string]$OutputDirectory = 'work\patch-repository',
    [string]$PreviousManifest = '',
    [string]$LauncherExecutable = '',
    [string]$LauncherVersion = '',
    [string]$PrivateKeyPath = 'work\launcher\signing\patch-private.pem'
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$configurationPath = Join-Path $repositoryRoot "work\launcher\patch-$Channel-config.json"
$channelBase = if ($Channel -eq 'production') {
    'https://update.mubloodmoon.com.br/launcher'
} else {
    "https://update.mubloodmoon.com.br/launcher/$Channel"
}
$configuration = [ordered]@{
    clientDirectory = [IO.Path]::GetFullPath($ClientDirectory)
    version = $Version
    channel = $Channel
    outputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
    baseUrl = "$channelBase/files"
    launcherBaseUrl = $channelBase
    previousManifest = if ($PreviousManifest) { [IO.Path]::GetFullPath($PreviousManifest) } else { '' }
    launcherExecutable = if ($LauncherExecutable) { [IO.Path]::GetFullPath($LauncherExecutable) } else { '' }
    launcherVersion = if ($LauncherVersion) { $LauncherVersion } else { $Version }
    privateKeyPath = [IO.Path]::GetFullPath($PrivateKeyPath)
}

New-Item -ItemType Directory -Force (Split-Path -Parent $configurationPath) | Out-Null
$configuration | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $configurationPath -Encoding utf8
node (Join-Path $PSScriptRoot 'publish-bloodmoon-patch.mjs') $configurationPath
if ($LASTEXITCODE -ne 0) {
    throw 'Falha ao preparar o patch.'
}

Write-Host ''
Write-Host 'Patch preparado. Envie files/ e o executavel do launcher antes do manifesto.'
Write-Host 'Ative a versao somente ao renomear manifest.next.json para manifest.json no servidor.'

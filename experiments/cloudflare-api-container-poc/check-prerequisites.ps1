[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

function Write-Result {
  param(
    [Parameter(Mandatory)] [string] $Name,
    [Parameter(Mandatory)] [string] $Value
  )
  Write-Output "$Name=$Value"
}

function Value-OrFallback {
  param(
    [AllowEmptyString()] [string] $Value,
    [Parameter(Mandatory)] [string] $Fallback
  )
  if ([string]::IsNullOrWhiteSpace($Value)) { return $Fallback }
  return $Value
}

$windowsBuild = [Environment]::OSVersion.Version.Build
Write-Result 'WINDOWS_BUILD' ([string]$windowsBuild)
if ($windowsBuild -lt 19045) {
  Write-Result 'CONTAINER_ENGINE_AVAILABLE' 'NO'
  Write-Result 'REASON' 'Windows build is below Docker Desktop current minimum supported Windows 10 build 19045'
  Write-Result 'NEXT' 'Update Windows to build 19045+ (or a supported Windows 11 build), then install Docker Desktop with the WSL 2 Linux-container backend.'
  exit 1
}

$docker = Get-Command docker -ErrorAction SilentlyContinue
if (-not $docker) {
  Write-Result 'CONTAINER_ENGINE_AVAILABLE' 'NO'
  Write-Result 'REASON' 'docker command not found'
  Write-Result 'NEXT' 'Install and start Docker Desktop with the WSL 2 Linux-container backend, then rerun this script.'
  exit 2
}

try {
  $clientVersion = (& docker version --format '{{.Client.Version}}' 2>$null).Trim()
  $serverVersion = (& docker version --format '{{.Server.Version}}' 2>$null).Trim()
  $serverOs = (& docker info --format '{{.OSType}}' 2>$null).Trim()
  $composeVersion = (& docker compose version --short 2>$null).Trim()
} catch {
  Write-Result 'CONTAINER_ENGINE_AVAILABLE' 'NO'
  Write-Result 'REASON' 'docker client exists but the engine is unavailable'
  Write-Result 'NEXT' 'Start Docker Desktop and wait until the Linux engine is ready, then rerun this script.'
  exit 3
}

if (-not $serverVersion -or $serverOs -ne 'linux' -or -not $composeVersion) {
  Write-Result 'CONTAINER_ENGINE_AVAILABLE' 'NO'
  Write-Result 'DOCKER_CLIENT_VERSION' (Value-OrFallback $clientVersion 'UNKNOWN')
  Write-Result 'DOCKER_SERVER_VERSION' (Value-OrFallback $serverVersion 'UNAVAILABLE')
  Write-Result 'DOCKER_SERVER_OS' (Value-OrFallback $serverOs 'UNKNOWN')
  Write-Result 'DOCKER_COMPOSE_VERSION' (Value-OrFallback $composeVersion 'UNAVAILABLE')
  Write-Result 'NEXT' 'Enable the Linux/WSL 2 engine and Docker Compose, then rerun this script.'
  exit 4
}

Write-Result 'CONTAINER_ENGINE_AVAILABLE' 'YES'
Write-Result 'TYPE' 'Docker Desktop / Linux containers'
Write-Result 'DOCKER_CLIENT_VERSION' $clientVersion
Write-Result 'DOCKER_SERVER_VERSION' $serverVersion
Write-Result 'DOCKER_SERVER_OS' $serverOs
Write-Result 'DOCKER_COMPOSE_VERSION' $composeVersion
exit 0

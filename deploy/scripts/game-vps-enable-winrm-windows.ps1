param(
  [string]$AllowedRemoteAddress = "143.137.90.5",
  [string]$FirewallRuleName = "BloodMoon-Temporary-WinRM"
)

$ErrorActionPreference = "Stop"

Write-Host "Checking administrator privileges..."
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Run this script from an elevated PowerShell session."
}

Write-Host "Enabling PowerShell Remoting..."
Enable-PSRemoting -Force -SkipNetworkProfileCheck

Write-Host "Ensuring WinRM service is running..."
Start-Service WinRM
Set-Service -Name WinRM -StartupType Automatic

Write-Host "Restricting default WinRM firewall rules..."
Get-NetFirewallRule -DisplayGroup "Windows Remote Management" -ErrorAction SilentlyContinue |
  Set-NetFirewallRule -Enabled False

$existingRule = Get-NetFirewallRule -Name $FirewallRuleName -ErrorAction SilentlyContinue
if ($existingRule) {
  Remove-NetFirewallRule -Name $FirewallRuleName
}

Write-Host "Creating temporary WinRM firewall rule for $AllowedRemoteAddress..."
New-NetFirewallRule `
  -Name $FirewallRuleName `
  -DisplayName "BloodMoon Temporary WinRM" `
  -Enabled True `
  -Direction Inbound `
  -Protocol TCP `
  -Action Allow `
  -LocalPort 5985 `
  -RemoteAddress $AllowedRemoteAddress | Out-Null

Write-Host "WinRM is enabled on port 5985 and restricted to: $AllowedRemoteAddress"
Write-Host "Tell Codex to test: Test-WSMan 151.243.219.30"

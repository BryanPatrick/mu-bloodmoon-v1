param(
  [string]$AllowedRemoteAddress = "143.137.90.5",
  [string]$FirewallRuleName = "BloodMoon-Temporary-SSH"
)

$ErrorActionPreference = "Stop"

Write-Host "Checking administrator privileges..."
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Run this script from an elevated PowerShell session."
}

Write-Host "Installing OpenSSH Server capability if needed..."
$capability = Get-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
if ($capability.State -ne "Installed") {
  Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
}

Write-Host "Starting sshd service..."
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic

Write-Host "Creating restricted firewall rule for SSH..."
$existingRule = Get-NetFirewallRule -Name $FirewallRuleName -ErrorAction SilentlyContinue
if ($existingRule) {
  Remove-NetFirewallRule -Name $FirewallRuleName
}

New-NetFirewallRule `
  -Name $FirewallRuleName `
  -DisplayName "BloodMoon Temporary SSH" `
  -Enabled True `
  -Direction Inbound `
  -Protocol TCP `
  -Action Allow `
  -LocalPort 22 `
  -RemoteAddress $AllowedRemoteAddress | Out-Null

Write-Host "OpenSSH Server is enabled."
Write-Host "SSH is allowed only from: $AllowedRemoteAddress"
Write-Host "Test from the Codex machine with: ssh administrator@151.243.219.30"

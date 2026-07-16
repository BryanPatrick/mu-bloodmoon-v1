param(
  [string]$FirewallRuleName = "BloodMoon-Temporary-SSH",
  [switch]$StopService
)

$ErrorActionPreference = "Stop"

Write-Host "Checking administrator privileges..."
$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "Run this script from an elevated PowerShell session."
}

$existingRule = Get-NetFirewallRule -Name $FirewallRuleName -ErrorAction SilentlyContinue
if ($existingRule) {
  Write-Host "Removing firewall rule: $FirewallRuleName"
  Remove-NetFirewallRule -Name $FirewallRuleName
} else {
  Write-Host "Firewall rule not found: $FirewallRuleName"
}

if ($StopService) {
  Write-Host "Stopping sshd service..."
  Stop-Service sshd -ErrorAction SilentlyContinue
  Set-Service -Name sshd -StartupType Manual -ErrorAction SilentlyContinue
}

Write-Host "Temporary SSH access removed."

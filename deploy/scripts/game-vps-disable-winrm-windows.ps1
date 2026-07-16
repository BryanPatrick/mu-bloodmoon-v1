param(
  [string]$FirewallRuleName = "BloodMoon-Temporary-WinRM",
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
  Write-Host "Stopping WinRM service..."
  Stop-Service WinRM -ErrorAction SilentlyContinue
  Set-Service -Name WinRM -StartupType Manual -ErrorAction SilentlyContinue
}

Write-Host "Temporary WinRM access removed."

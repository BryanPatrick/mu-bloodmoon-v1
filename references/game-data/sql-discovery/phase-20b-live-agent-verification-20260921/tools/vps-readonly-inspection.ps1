# Phase 20B -- the exact READ-ONLY inspection executed on the production VPS through the audited RemoteOps
# wrapper (Invoke-BloodMoonRemote, operation "remote-read"). Reads only: scheduled-task state, process
# existence/creation time, and top-level .exe/.dll hashes + non-secret version metadata.
# It never lists or opens the secrets folder, never reads any file content, never reads a command line,
# never restarts/stops anything and never runs a command through the Agent.
$root = 'C:\BloodMoonGameBridgeAgent'
$o = [ordered]@{}
$o.utcNow = (Get-Date).ToUniversalTime().ToString('o')
$o.hostname = $env:COMPUTERNAME
$t = Get-ScheduledTask -TaskName 'BloodMoonGameBridgeAgent' -ErrorAction SilentlyContinue
if ($t) {
  $i = $t | Get-ScheduledTaskInfo
  $o.task = [ordered]@{ name = $t.TaskName; state = [string]$t.State; lastRunTime = $i.LastRunTime.ToUniversalTime().ToString('o'); lastTaskResult = $i.LastTaskResult; missedRuns = $i.NumberOfMissedRuns }
} else { $o.task = 'NOT_FOUND' }
$o.processes = @(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like "$root\*" } | ForEach-Object { [ordered]@{ pid = $_.ProcessId; name = $_.Name; started = $_.CreationDate.ToUniversalTime().ToString('o') } })
if (Test-Path -LiteralPath $root) {
  $o.binaries = @(Get-ChildItem -LiteralPath $root -File | Where-Object { $_.Extension -in '.exe','.dll' } | ForEach-Object { [ordered]@{ name = $_.Name; sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash; length = $_.Length; modifiedUtc = $_.LastWriteTime.ToUniversalTime().ToString('o'); fileVersion = $_.VersionInfo.FileVersion; productVersion = $_.VersionInfo.ProductVersion } })
} else { $o.binaries = 'INSTALL_DIR_NOT_FOUND' }
$o | ConvertTo-Json -Depth 6 -Compress

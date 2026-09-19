param(
  [Parameter(Mandatory=$true)][string]$Database,
  [Parameter(Mandatory=$true)][string]$QueryFile,
  [Parameter(Mandatory=$true)][string]$OutFile,
  [string]$Separator = "`t"
)
# Read-only guard for Phase 20A lab inspection. Fails closed.
$ErrorActionPreference = 'Stop'
$allowedDbs = @('bloodmoon_gameserver_raw_analysis','bloodmoon_gameserver_lab')
if ($allowedDbs -notcontains $Database) { throw "DATABASE_NOT_ALLOWED: $Database" }
$q = [IO.File]::ReadAllText($QueryFile)
# strip comments before keyword screening
$scan = [regex]::Replace($q, '--[^\r\n]*', '')
$scan = [regex]::Replace($scan, '/\*.*?\*/', '', 'Singleline')
if ($scan -match '(?i)\b(INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|DENY|EXEC|EXECUTE|SP_|XP_|BACKUP|RESTORE|SHUTDOWN|KILL|INTO\s+#|OPENROWSET|OPENQUERY)\b') { throw "QUERY_NOT_READ_ONLY" }
$cs = "Server=localhost;Database=$Database;Integrated Security=SSPI;TrustServerCertificate=True;ApplicationIntent=ReadOnly;Application Name=Phase20A-readonly-lab-inspection"
$conn = New-Object System.Data.SqlClient.SqlConnection $cs
$conn.Open()
try {
  $srv = (New-Object System.Data.SqlClient.SqlCommand "SELECT @@SERVERNAME", $conn).ExecuteScalar()
  if ($srv -ne 'DESKTOP-9368KF9') { throw "SERVER_NOT_LOCAL_LAB: $srv" }
  $cmd = New-Object System.Data.SqlClient.SqlCommand $q, $conn
  $cmd.CommandTimeout = 60
  $rdr = $cmd.ExecuteReader()
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine("-- server=$srv database=$Database readonly=1")
  do {
    $names = @(); for ($i=0; $i -lt $rdr.FieldCount; $i++) { $names += $rdr.GetName($i) }
    [void]$sb.AppendLine(($names -join $Separator))
    while ($rdr.Read()) {
      $vals = @(); for ($i=0; $i -lt $rdr.FieldCount; $i++) { if ($rdr.IsDBNull($i)) { $vals += 'NULL' } else { $vals += [string]$rdr.GetValue($i) } }
      [void]$sb.AppendLine(($vals -join $Separator))
    }
    [void]$sb.AppendLine('-- end result set')
  } while ($rdr.NextResult())
  $rdr.Close()
  [IO.File]::WriteAllText($OutFile, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
  "OK rows written to $OutFile ($($sb.Length) chars) on $srv/$Database"
} finally { $conn.Close() }

$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent
$ini=Join-Path $project 'storage\mysql-local\my.ini'
if (!(Test-Path -LiteralPath $ini)) { throw 'Local MySQL has not been initialized.' }
$connection=Get-NetTCPConnection -State Listen -LocalPort 3307 -ErrorAction SilentlyContinue
if ($connection) { Write-Output 'Port 3307 is already listening. No new server started.'; exit 0 }
$process=Start-Process -FilePath 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe' -ArgumentList "`"--defaults-file=$ini`"" -WindowStyle Hidden -PassThru
Write-Output "Local MySQL started (PID $($process.Id))."

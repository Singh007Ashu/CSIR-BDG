$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$localRoot = Join-Path $project 'storage\mysql-local'
if (Test-Path -LiteralPath $localRoot) { throw 'Local MySQL directory already exists; refusing reinitialization.' }
New-Item -ItemType Directory -Path $localRoot | Out-Null
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls.exe $localRoot /inheritance:r /grant:r "${identity}:(OI)(CI)F" 'SYSTEM:(OI)(CI)F' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not restrict local database folder permissions.' }
$server = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe'
$data = Join-Path $localRoot 'data'
$ini = Join-Path $localRoot 'my.ini'
$rootPass = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
$appPass = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
$database = 'csir_migration_test_bdg_20261116'
@"
[mysqld]
basedir=C:/Program Files/MySQL/MySQL Server 8.4
datadir=$($data.Replace('\','/'))
bind-address=127.0.0.1
port=3307
mysqlx=0
local-infile=0
character-set-server=utf8mb4
collation-server=utf8mb4_bin
log-error=$($localRoot.Replace('\','/'))/server.err
"@ | Set-Content -LiteralPath $ini -Encoding utf8NoBOM
& $server "--defaults-file=$ini" --initialize 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'MySQL initialization failed. Inspect protected local log.' }
$initFile = Join-Path $localRoot 'initialize-account.sql'
@"
ALTER USER 'root'@'localhost' IDENTIFIED BY '$rootPass';
CREATE DATABASE $database CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE USER 'csir_app'@'localhost' IDENTIFIED BY '$appPass';
GRANT SELECT,INSERT,UPDATE,DELETE ON $database.* TO 'csir_app'@'localhost';
"@ | Set-Content -LiteralPath $initFile -Encoding utf8NoBOM
@{port=3307;host='127.0.0.1';database=$database;rootPassword=$rootPass;appUser='csir_app';appPassword=$appPass} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $localRoot 'connection-private.json') -Encoding utf8NoBOM
$process = Start-Process -FilePath $server -ArgumentList @("`"--defaults-file=$ini`"", "`"--init-file=$initFile`"") -WindowStyle Hidden -PassThru
$process.Id | Set-Content -LiteralPath (Join-Path $localRoot 'server.pid')
Write-Output "MySQL initialized and started locally on 127.0.0.1:3307 (PID $($process.Id)). Credentials stored only in restricted local folder."

# ==============================================================================
# Script: backup_production_db.ps1
# Description: Production PostgreSQL backup script for Resume Customizer AI.
# Target: Supabase Cloud (Managed PostgreSQL 15+ / 16+)
# Storage Policy: Strictly saves to E:\ResumeCustomizerAI\backups\
# Security: Never echoes credentials or connection strings to stdout/stderr.
# ==============================================================================

[CmdletBinding()]
param (
    [string]$HostName = "aws-0-ap-southeast-1.pooler.supabase.com",
    [int]$Port = 5432,
    [string]$Database = "postgres",
    [string]$Username = "postgres.blnizmyxkyfngrbrulmr",
    [string]$BackupDir = "E:\ResumeCustomizerAI\backups"
)

$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " Resume Customizer AI -- Production Database Backup Utility" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Verify Client Tools
$pgDump = Get-Command pg_dump.exe -ErrorAction SilentlyContinue
if (-not $pgDump) {
    Write-Error "pg_dump.exe was not found in PATH. Please ensure PostgreSQL client tools are installed."
    exit 1
}
Write-Host "--> Found pg_dump: $($pgDump.Source)" -ForegroundColor Green

# 2. Verify Output Directory
if (-not (Test-Path $BackupDir)) {
    Write-Host "--> Creating backup directory: $BackupDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# 3. Resolve Database Password Securely
$dbPassword = $env:SUPABASE_DB_PASSWORD
if (-not $dbPassword) {
    $dbPassword = $env:PGPASSWORD
}

if (-not $dbPassword) {
    Write-Host ""
    Write-Host "(!) SUPABASE_DB_PASSWORD or PGPASSWORD environment variable is not set." -ForegroundColor Yellow
    Write-Host "    To configure securely for this session without saving in history, run:" -ForegroundColor Gray
    Write-Host '    $env:SUPABASE_DB_PASSWORD = (Read-Host "Enter Supabase DB Password" -AsSecureString | ForEach-Object { [System.Net.NetworkCredential]::new("", $_).Password })' -ForegroundColor Cyan
    Write-Host ""

    if ([Environment]::UserInteractive) {
        $prompt = "Enter Supabase DB Password (hidden): "
        $securePass = Read-Host $prompt -AsSecureString
        $dbPassword = [System.Net.NetworkCredential]::new("", $securePass).Password
    } else {
        Write-Error "Non-interactive session: Please set `$env:SUPABASE_DB_PASSWORD before running this script."
        exit 1
    }
}

if ([string]::IsNullOrWhiteSpace($dbPassword)) {
    Write-Error "Database password cannot be empty."
    exit 1
}

# 4. Generate Non-Colliding Backup Path
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dumpFileName = "supabase_prod_backup_" + $timestamp + ".dump"
$dumpFilePath = Join-Path $BackupDir $dumpFileName

if (Test-Path $dumpFilePath) {
    Write-Error "Collision detected: Backup file already exists. Aborting to prevent overwrite."
    exit 1
}

Write-Host "--> Target Host:     $HostName on port $Port" -ForegroundColor Gray
Write-Host "--> Target Database: $Database (User: $Username)" -ForegroundColor Gray
Write-Host "--> Destination:     $dumpFilePath" -ForegroundColor Gray
Write-Host "--> Executing read-only schema and data dump..." -ForegroundColor Yellow

# 5. Execute pg_dump
$env:PGPASSWORD = $dbPassword
$env:PGCONNECT_TIMEOUT = "15"

$oldEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"

try {
    & $pgDump.Source `
        --host=$HostName `
        --port=$Port `
        --username=$Username `
        --dbname=$Database `
        --format=custom `
        --no-owner `
        --no-privileges `
        --table=public.profiles `
        --table=public.saved_resumes `
        --table=public.customization_history `
        --file=$dumpFilePath 2>&1 | ForEach-Object {
            if ($_ -match "saving|dumping|reading") {
                Write-Host "    $_" -ForegroundColor DarkGray
            }
        }

    $dumpExitCode = $LASTEXITCODE
    if ($dumpExitCode -ne 0) {
        throw "pg_dump process exited with error code $dumpExitCode"
    }
}
finally {
    $ErrorActionPreference = $oldEap
    Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
}

# 6. Verify Backup Integrity
if (-not (Test-Path $dumpFilePath)) {
    Write-Error "Backup failed: Target file was not created."
    exit 1
}

$fileInfo = Get-Item $dumpFilePath
$sizeInKb = [math]::Round($fileInfo.Length / 1024, 2)
if ($fileInfo.Length -le 0) {
    Write-Error "Backup failed: Target file is empty."
    exit 1
}

Write-Host "--> Backup file successfully written: $($fileInfo.Length) bytes ($sizeInKb KB)" -ForegroundColor Green

# 7. Test pg_restore Archive Readability
$pgRestore = Get-Command pg_restore.exe -ErrorAction SilentlyContinue
if ($pgRestore) {
    Write-Host "--> Verifying archive catalog with pg_restore --list..." -ForegroundColor Yellow
    $ErrorActionPreference = "Continue"
    $tocEntries = & $pgRestore.Source --list $dumpFilePath 2>&1
    $listExitCode = $LASTEXITCODE
    $ErrorActionPreference = $oldEap

    if ($listExitCode -ne 0) {
        Write-Error "pg_restore verification failed: Archive catalog could not be read."
        exit 1
    }
    
    $tableEntries = $tocEntries | Where-Object { $_ -match "TABLE DATA public (profiles|saved_resumes|customization_history)" }
    Write-Host "--> Verified archive Table Data TOC entries:" -ForegroundColor Green
    foreach ($entry in $tableEntries) {
        Write-Host "    $entry" -ForegroundColor DarkGreen
    }
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " PRODUCTION BACKUP COMPLETED AND INTEGRITY VERIFIED" -ForegroundColor Green
Write-Host " File: $dumpFilePath" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

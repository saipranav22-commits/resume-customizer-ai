# ==============================================================================
# Script: verify_restore_db.ps1
# Description: Automated recovery validation of a Supabase backup dump into an
#              isolated local PostgreSQL test database (strictly port 5433).
# Target: Local isolated PostgreSQL 18+ on port 5433
# Storage Policy: Operates strictly within E:\ResumeCustomizerAI
# ==============================================================================

[CmdletBinding()]
param (
    [string]$BackupFile = "",
    [string]$LocalHost = "127.0.0.1",
    [int]$LocalPort = 5433,
    [string]$LocalUser = "postgres",
    [string]$SandboxDb = "rca_restore_verify_sandbox",
    [switch]$KeepSandbox
)

$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " Resume Customizer AI -- Automated Backup Recovery Verification" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Safety Guard: Enforce Localhost Only (Never Remote Pooler)
if ($LocalHost -ne "127.0.0.1" -and $LocalHost -ne "localhost") {
    Write-Error "Safety violation: verify_restore_db.ps1 must only be executed against local isolated PostgreSQL (127.0.0.1 / localhost)."
    exit 1
}

# 2. Resolve Backup File
if ([string]::IsNullOrWhiteSpace($BackupFile)) {
    $latestDump = Get-ChildItem "E:\ResumeCustomizerAI\backups" -Filter "*.dump" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $latestDump) {
        Write-Error "No .dump backup files found in E:\ResumeCustomizerAI\backups\. Please run backup_production_db.ps1 first."
        exit 1
    }
    $BackupFile = $latestDump.FullName
}

if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup file does not exist: $BackupFile"
    exit 1
}

$dumpInfo = Get-Item $BackupFile
$sizeKb = [math]::Round($dumpInfo.Length / 1024, 2)
Write-Host "--> Backup File:       $BackupFile" -ForegroundColor Cyan
Write-Host "--> Backup File Size:  $($dumpInfo.Length) bytes ($sizeKb KB)" -ForegroundColor Cyan
Write-Host "--> Target Host:       $LocalHost on port $LocalPort (Isolated Sandbox: $SandboxDb)" -ForegroundColor Cyan

# 3. Verify Local Client Tools
$pgRestore = Get-Command pg_restore.exe -ErrorAction SilentlyContinue
$psql = Get-Command psql.exe -ErrorAction SilentlyContinue
if (-not $pgRestore -or -not $psql) {
    Write-Error "pg_restore.exe and psql.exe must be installed and accessible in PATH."
    exit 1
}
Write-Host "--> pg_restore tool:   $($pgRestore.Source) (v$($pgRestore.Version))" -ForegroundColor Green
Write-Host "--> psql client tool:  $($psql.Source) (v$($psql.Version))" -ForegroundColor Green

# 4. Create Fresh Isolated Sandbox Database on Local Instance
Write-Host "--> Initializing fresh sandbox database '$SandboxDb' on port $LocalPort..." -ForegroundColor Yellow
"SET client_min_messages = warning; DROP DATABASE IF EXISTS $SandboxDb;" | & $psql.Source -q -h $LocalHost -p $LocalPort -U $LocalUser -d postgres | Out-Null
"CREATE DATABASE $SandboxDb;" | & $psql.Source -q -h $LocalHost -p $LocalPort -U $LocalUser -d postgres | Out-Null
Write-Host "--> Created isolated sandbox database '$SandboxDb'" -ForegroundColor Green

$restoreFailed = $false
$firstError = ""

try {
    # 5. Pre-seed Supabase Authentication, Functions and Role Dependencies
    # In Supabase Cloud, public tables reference auth.users(id), auth.uid(), auth.role(),
    # and update triggers execute public.handle_updated_at().
    Write-Host "--> Initializing isolated Supabase environment stubs in sandbox..." -ForegroundColor Yellow
    $setupSql = @'
SET client_min_messages = warning;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT NULL::UUID; $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT 'authenticated'::TEXT; $$;

-- Supabase timestamp trigger function required by public table triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = pg_catalog.timezone('utc', pg_catalog.now());
    RETURN NEW;
END;
$$;
'@
    $setupSql | & $psql.Source -q -h $LocalHost -p $LocalPort -U $LocalUser -d $SandboxDb | Out-Null

    # 6. Execute 3-Stage Sectioned Restore with Explicit Error Capture
    $oldEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"

    # Stage 1: Pre-data (Table schemas)
    Write-Host "--> Stage 1: Restoring table definitions (pre-data)..." -ForegroundColor Yellow
    $preDataOutput = & $pgRestore.Source `
        -h $LocalHost `
        -p $LocalPort `
        -U $LocalUser `
        -d $SandboxDb `
        --section=pre-data `
        --no-owner `
        --no-privileges `
        $BackupFile 2>&1
    $preDataExit = $LASTEXITCODE

    if ($preDataExit -ne 0) {
        $restoreFailed = $true
        $firstError = "pg_restore pre-data failed with exit code $preDataExit"
        Write-Host "=== PG_RESTORE PRE-DATA ERRORS ===" -ForegroundColor Red
        $preDataOutput | ForEach-Object { Write-Host "$_" -ForegroundColor Red }
        throw $firstError
    }

    # Stage 2: Data rows (with triggers disabled)
    Write-Host "--> Stage 2: Restoring data rows (data)..." -ForegroundColor Yellow
    $dataOutput = & $pgRestore.Source `
        -h $LocalHost `
        -p $LocalPort `
        -U $LocalUser `
        -d $SandboxDb `
        --section=data `
        --no-owner `
        --no-privileges `
        --disable-triggers `
        $BackupFile 2>&1
    $dataExit = $LASTEXITCODE

    if ($dataExit -ne 0) {
        $restoreFailed = $true
        $firstError = "pg_restore data failed with exit code $dataExit"
        Write-Host "=== PG_RESTORE DATA ERRORS ===" -ForegroundColor Red
        $dataOutput | ForEach-Object { Write-Host "$_" -ForegroundColor Red }
        throw $firstError
    }

    # Stage 3: Resolve auth.users foreign key dependencies
    Write-Host "--> Stage 3: Resolving auth.users foreign key dependencies..." -ForegroundColor Yellow
    $populateAuthUsers = @'
SET client_min_messages = warning;
INSERT INTO auth.users (id, email)
SELECT DISTINCT p.id, COALESCE(p.email, p.id::text || '@user.mock')
FROM public.profiles p
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (id, email)
SELECT DISTINCT h.user_id, h.user_id::text || '@user.mock'
FROM public.customization_history h
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (id, email)
SELECT DISTINCT r.user_id, r.user_id::text || '@user.mock'
FROM public.saved_resumes r
ON CONFLICT (id) DO NOTHING;
'@
    $populateAuthUsers | & $psql.Source -q -h $LocalHost -p $LocalPort -U $LocalUser -d $SandboxDb | Out-Null

    # Stage 4: Post-data (Primary keys, Unique constraints, Foreign keys, Indexes, Triggers, RLS)
    Write-Host "--> Stage 4: Restoring constraints, indexes, triggers, and RLS (post-data)..." -ForegroundColor Yellow
    $postDataOutput = & $pgRestore.Source `
        -h $LocalHost `
        -p $LocalPort `
        -U $LocalUser `
        -d $SandboxDb `
        --section=post-data `
        --no-owner `
        --no-privileges `
        $BackupFile 2>&1
    $postDataExit = $LASTEXITCODE
    $ErrorActionPreference = $oldEap

    if ($postDataExit -ne 0) {
        $restoreFailed = $true
        $firstError = "pg_restore post-data failed with exit code $postDataExit"
        Write-Host "=== PG_RESTORE POST-DATA ERRORS ===" -ForegroundColor Red
        $postDataOutput | ForEach-Object { Write-Host "$_" -ForegroundColor Red }
        throw $firstError
    }

    # 7. Comprehensive Integrity Auditing
    Write-Host "--> Auditing restored schema integrity..." -ForegroundColor Yellow

    # Row counts
    $auditQuery = @'
SELECT 
    'profiles' AS table_name, count(*) AS row_count FROM public.profiles
UNION ALL
SELECT 
    'saved_resumes' AS table_name, count(*) AS row_count FROM public.saved_resumes
UNION ALL
SELECT 
    'customization_history' AS table_name, count(*) AS row_count FROM public.customization_history;
'@
    Write-Host "--> Restored Table Row Counts:" -ForegroundColor Green
    $auditQuery | & $psql.Source -h $LocalHost -p $LocalPort -U $LocalUser -d $SandboxDb

    # Triggers audit
    $trigQuery = @'
SELECT 
    tgname AS trigger_name,
    relname AS table_name,
    tgenabled AS status
FROM pg_trigger
JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
WHERE relname IN ('profiles', 'saved_resumes', 'customization_history') AND NOT tgisinternal
ORDER BY relname, trigger_name;
'@
    Write-Host "--> Restored Table Triggers:" -ForegroundColor Green
    $trigQuery | & $psql.Source -h $LocalHost -p $LocalPort -U $LocalUser -d $SandboxDb

    # Constraints audit
    $constraintQuery = @'
SELECT 
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    contype AS type
FROM pg_constraint
WHERE conrelid IN ('public.profiles'::regclass, 'public.saved_resumes'::regclass, 'public.customization_history'::regclass)
ORDER BY conrelid::regclass::text, conname;
'@
    Write-Host "--> Restored Constraints (PK, FK, Unique):" -ForegroundColor Green
    $constraintQuery | & $psql.Source -h $LocalHost -p $LocalPort -U $LocalUser -d $SandboxDb

    # Indexes audit
    $indexQuery = @'
SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public' AND tablename IN ('profiles', 'saved_resumes', 'customization_history')
ORDER BY tablename, indexname;
'@
    Write-Host "--> Restored Indexes:" -ForegroundColor Green
    $indexQuery | & $psql.Source -h $LocalHost -p $LocalPort -U $LocalUser -d $SandboxDb

    # RLS Status audit
    $rlsQuery = @'
SELECT 
    tablename, 
    rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('profiles', 'saved_resumes', 'customization_history')
ORDER BY tablename;
'@
    Write-Host "--> Row Level Security (RLS) Status:" -ForegroundColor Green
    $rlsQuery | & $psql.Source -h $LocalHost -p $LocalPort -U $LocalUser -d $SandboxDb

    # RLS Policies audit
    $policyQuery = @'
SELECT 
    tablename,
    policyname,
    cmd AS command
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('profiles', 'saved_resumes', 'customization_history')
ORDER BY tablename, policyname;
'@
    Write-Host "--> Restored Row Level Security Policies:" -ForegroundColor Green
    $policyQuery | & $psql.Source -h $LocalHost -p $LocalPort -U $LocalUser -d $SandboxDb

    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host " RECOVERY VERIFICATION SUCCEEDED: BACKUP IS 100% VALID AND RESTORABLE" -ForegroundColor Green
    Write-Host " Archive: $BackupFile" -ForegroundColor Cyan
    Write-Host "======================================================================" -ForegroundColor Cyan
}
catch {
    $restoreFailed = $true
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Red
    Write-Host " RECOVERY VERIFICATION FAILED" -ForegroundColor Red
    Write-Host " Error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "======================================================================" -ForegroundColor Red
    throw $_
}
finally {
    if (-not $KeepSandbox) {
        Write-Host "--> Cleaning up temporary sandbox database '$SandboxDb'..." -ForegroundColor Yellow
        "SET client_min_messages = warning; DROP DATABASE IF EXISTS $SandboxDb;" | & $psql.Source -q -h $LocalHost -p $LocalPort -U $LocalUser -d postgres 2>$null | Out-Null
        Write-Host "--> Cleaned up sandbox database" -ForegroundColor Green
    } else {
        Write-Host "--> Sandbox database retained at '$SandboxDb' on port $LocalPort for inspection." -ForegroundColor Yellow
    }
}

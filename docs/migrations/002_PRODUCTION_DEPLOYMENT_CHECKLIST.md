# Resume Customizer AI — Migration 002 Production Deployment Checklist

**Migration:** `002_add_resume_versioning.sql`  
**Rollback Script:** `002_add_resume_versioning.rollback.sql`  
**Target:** Supabase PostgreSQL 15+ / 16+ (Managed Cloud Instance)  
**Storage Policy:** Backups and logs must reside strictly on `E:` or `D:`. Never on `C:` or `S:`.  
**Safety Protocol:** Strictly zero destructive purge execution. Never run migration without a verified backup.

---

## 1. Environment & Engine Verification

Prior to executing any commands, verify the production database engine version and user privileges.

```sql
-- Run in Supabase SQL Editor or via psql CLI:
SELECT version();
-- Supabase Cloud returns: PostgreSQL 15.x or 16.x on x86_64-pc-linux-gnu

SELECT current_user, session_user;
-- Expected: postgres (or service administrator)

-- Confirm available extensions:
SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');
```

---

## 2. Pre-Migration Schema & Data Integrity Verification

Verify the baseline Phase 5A schema state and quantify existing records before applying alterations.

```sql
-- 1. Verify existence of Phase 5A customization_history table
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'customization_history' AND table_schema = 'public';

-- 2. Count existing records to establish baseline for backfill validation
SELECT count(*) AS total_history_records FROM public.customization_history;

-- 3. Verify no orphaned records exist
SELECT count(*) AS orphaned_records 
FROM public.customization_history h
LEFT JOIN auth.users u ON h.user_id = u.id
WHERE u.id IS NULL;
-- Must be 0

-- 4. Check existing constraints
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'public.customization_history'::regclass;
```

---

## 3. Full Production Backup & Verification Procedure

### 3.1 Execute Backup to Designated Volume (`E:` or `D:`)
Never use `C:` or temporary OS paths. Use the dedicated development drive:

```bash
# Set environment variables for authentication
export PGPASSWORD="<SUPABASE_DB_PASSWORD>"

# Timestamped schema + data backup
pg_dump \
  -h db.<PROJECT_REF>.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  --format=custom \
  --verbose \
  --file="E:\ResumeCustomizerAI\backups\customization_history_pre_002_$(date +%Y%m%d_%H%M%S).dump" \
  -t public.customization_history \
  -t public.saved_resumes \
  -t public.profiles
```

### 3.2 Verify Backup Integrity Before Proceeding
A backup is considered non-existent until verified:

```bash
# Verify archive header and table catalog integrity
pg_restore --list "E:\ResumeCustomizerAI\backups\customization_history_pre_002_*.dump"

# Test restore into an isolated temporary database on E: or D:
createdb -h localhost -p 5433 -U postgres temp_verify_backup
pg_restore -h localhost -p 5433 -U postgres -d temp_verify_backup "E:\ResumeCustomizerAI\backups\customization_history_pre_002_*.dump"
psql -h localhost -p 5433 -U postgres -d temp_verify_backup -c "SELECT count(*) FROM public.customization_history;"
dropdb -h localhost -p 5433 -U postgres temp_verify_backup
```

---

## 4. Database Lock Levels & Downtime Analysis

Migration 002 is engineered to minimize locking and avoid service interruption:

| Operation | Lock Mode | Impact & Mitigation |
| :--- | :--- | :--- |
| `ALTER TABLE ... ADD COLUMN ... DEFAULT ...` | `ACCESS EXCLUSIVE` (brief) | PostgreSQL 11+ optimizes `ADD COLUMN` with constant defaults as metadata-only catalog updates without table rewriting. Lock duration is sub-second (< 20ms). |
| `UPDATE public.customization_history SET ... WHERE root_id IS NULL` | `ROW EXCLUSIVE` | Sequential scan and row lock on existing records. On standard workloads (< 100k rows), completes in < 500ms. |
| `ALTER TABLE ... ADD CONSTRAINT` | `SHARE ROW EXCLUSIVE` | Composite uniqueness and check constraints validate existing rows. Idempotent guards prevent repeat locks. |
| `CREATE INDEX IF NOT EXISTS` | `SHARE` | Standard index creation. For high-volume production tables, indexes can optionally use `CONCURRENTLY` if traffic is heavy. In current scale, execution takes < 150ms per index. |

**Recommended Maintenance Window:** Normal off-peak operational window or standard rolling deployment. Expected database lock impact is under 2 seconds.

---

## 5. Migration Execution (`002_add_resume_versioning.sql`)

Execute migration via Supabase Dashboard SQL Editor or direct `psql` connection:

```bash
psql -h db.<PROJECT_REF>.supabase.co -U postgres -d postgres -f docs/migrations/002_add_resume_versioning.sql
```

The script runs wrapped in an atomic transaction (`BEGIN; ... COMMIT;`). Any failure automatically issues a rollback, leaving the existing database completely untouched.

---

## 6. Post-Migration Trigger, RLS & Data Integrity Checks

Run the following post-flight verification queries immediately after applying Migration 002:

```sql
-- 1. Confirm all columns exist with appropriate defaults
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'customization_history' AND column_name IN (
    'version_name', 'version_number', 'parent_id', 'root_id',
    'version_tags', 'version_notes', 'is_starred'
);

-- 2. Verify all records have a valid root_id and version_number
SELECT count(*) AS unbackfilled_count
FROM public.customization_history
WHERE root_id IS NULL OR version_number IS NULL;
-- Must be 0

-- 3. Verify all active triggers are enabled
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'public.customization_history'::regclass
  AND tgname IN (
      'trg_set_next_version_number',
      'trg_handle_version_deletion',
      'trg_enforce_version_immutability'
  );
-- Must return 3 rows with tgenabled = 'O' (Origin/Always enabled)

-- 4. Verify internal_auth schema privileges are revoked from public/anon/authenticated
SELECT grantee, privilege_type 
FROM information_schema.schema_privileges 
WHERE schema_name = 'internal_auth'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated');
-- Must be 0 rows

-- 5. Test immutability enforcement
DO $$
DECLARE
    test_id UUID;
BEGIN
    SELECT id INTO test_id FROM public.customization_history LIMIT 1;
    IF test_id IS NOT NULL THEN
        BEGIN
            UPDATE public.customization_history 
            SET tailored_result = '{"tampered":true}'::jsonb 
            WHERE id = test_id;
            RAISE EXCEPTION 'TEST FAILED: immutability trigger did not block update!';
        EXCEPTION
            WHEN OTHERS THEN
                IF SQLERRM NOT LIKE '%tailored_result is immutable%' THEN
                    RAISE EXCEPTION 'Unexpected error: %', SQLERRM;
                END IF;
                -- Expected behavior
        END;
    END IF;
END $$;
```

---

## 7. PostgREST Schema Cache Refresh

Supabase uses PostgREST to serve its REST API. After DDL alterations, signal PostgREST to reload its schema cache:

```sql
-- Execute in Supabase SQL Editor:
NOTIFY pgrst, 'reload schema';
```

Alternatively, restart the REST API service via the Supabase Dashboard (`Settings > Infrastructure > Restart Services > PostgREST`).

---

## 8. Backward Compatibility with Phase 5A Backend

Migration 002 is fully non-breaking for the existing Phase 5A backend:
* All Phase 5A columns (`id`, `user_id`, `resume_id`, `title`, `job_description`, `match_score`, `ats_score`, `tailored_result`, `created_at`, `updated_at`) remain intact with identical types and constraints.
* Phase 5A insertion requests without `version_name`, `parent_id`, or `root_id` are automatically captured by `trg_set_next_version_number`:
  * Default `root_id = id`
  * Default `version_number = 1`
  * Default `version_name = 'v1 - ' || title`
* Existing Phase 5A endpoints continue to operate transparently both before and after the backend is updated.

---

## 9. Staging Verification Requirements

Before triggering traffic redirection to the new frontend/backend:
1. **User Sign-In:** Authenticate with test user account.
2. **List History:** Open History Drawer; verify grouped family cards and version badges render.
3. **Save Child Revision:** Tailor an existing resume and save with "Child Revision" checked; verify version increments to `v2`.
4. **Compare Versions:** Select `v1` and `v2`; verify comparison modal side-by-side metrics and bullet diffs render.
5. **Export Check:** Export `v1` and `v2` as PDF and DOCX; confirm downloads succeed.
6. **Deletion Check:** Delete `v1`; confirm surviving `v2` is promoted to root without cascade deletion.

---

## 10. Rollback & Recovery Procedure

If unexpected anomalies occur:

### 10.1 Database Rollback (Zero Data Loss)
Execute `002_add_resume_versioning.rollback.sql` in Supabase SQL editor:
```sql
-- Reverts triggers, functions, constraints, and indexes
-- Retains all data rows and columns intact
\i docs/migrations/002_add_resume_versioning.rollback.sql
NOTIFY pgrst, 'reload schema';
```

### 10.2 Service Rollback
Revert frontend and backend deployments to baseline commit `83d400d`.

### 10.3 Full Disaster Recovery (Catastrophic Failure Only)
In the event of unrecoverable data corruption (requiring prior authorization):
```bash
pg_restore \
  -h db.<PROJECT_REF>.supabase.co \
  -U postgres \
  -d postgres \
  --clean \
  --if-exists \
  "E:\ResumeCustomizerAI\backups\customization_history_pre_002_*.dump"
```

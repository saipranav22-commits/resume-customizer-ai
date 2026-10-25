-- ============================================================================
-- DANGER: DESTRUCTIVE ACTION — PERMANENTLY PURGE RESUME VERSIONING COLUMNS
-- Target: Supabase PostgreSQL 15+ / 16
-- ============================================================================
--
-- CRITICAL WARNING:
-- This script permanently drops versioning columns (version_name, version_number,
-- parent_id, root_id, version_tags, version_notes, is_starred).
--
-- THIS ACTION IS COMPLETELY IRREVERSIBLE AND DESTROYS ALL VERSION LINEAGE.
-- DO NOT RUN WITHOUT:
--   1. Explicit architectural approval
--   2. Verified external database backup/export
--   3. Explicit creation of the local pre-purge confirmation table
-- ============================================================================

BEGIN;

-- MANDATORY HUMAN GUARD: Require explicit pre-purge backup verification table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'customization_history_pre_purge_backup'
    ) THEN
        RAISE EXCEPTION 'DESTRUCTIVE PURGE ABORTED: Confirmation table public.customization_history_pre_purge_backup does not exist. To proceed, you must explicitly create a verified snapshot first: CREATE TABLE public.customization_history_pre_purge_backup AS SELECT * FROM public.customization_history;';
    END IF;
END $$;

-- 1. Drop Triggers and Functions
DROP TRIGGER IF EXISTS trg_enforce_version_immutability ON public.customization_history;
DROP FUNCTION IF EXISTS public.fn_enforce_version_immutability();

DROP TRIGGER IF EXISTS trg_handle_version_deletion ON public.customization_history;
DROP FUNCTION IF EXISTS public.fn_handle_version_deletion();

DROP TRIGGER IF EXISTS trg_set_next_version_number ON public.customization_history;
DROP FUNCTION IF EXISTS public.fn_set_next_version_number();

-- Drop Internal Security Context
DROP TABLE IF EXISTS internal_auth.active_reparenting_sessions;
DROP SCHEMA IF EXISTS internal_auth CASCADE;

-- 2. Drop Constraints
ALTER TABLE public.customization_history
    DROP CONSTRAINT IF EXISTS chk_customization_history_root_consistency,
    DROP CONSTRAINT IF EXISTS chk_customization_history_parent_not_self,
    DROP CONSTRAINT IF EXISTS uq_customization_history_root_version,
    DROP CONSTRAINT IF EXISTS fk_customization_history_root_owner,
    DROP CONSTRAINT IF EXISTS fk_customization_history_parent_owner,
    DROP CONSTRAINT IF EXISTS uq_customization_history_id_user_id;

-- 3. Drop Indexes
DROP INDEX IF EXISTS public.idx_customization_history_starred;
DROP INDEX IF EXISTS public.idx_customization_history_parent_id;
DROP INDEX IF EXISTS public.idx_customization_history_root_lineage;
DROP INDEX IF EXISTS public.idx_customization_history_resume_versions;

-- 4. PERMANENTLY DROP VERSIONING COLUMNS
ALTER TABLE public.customization_history
    DROP COLUMN IF EXISTS is_starred,
    DROP COLUMN IF EXISTS version_notes,
    DROP COLUMN IF EXISTS version_tags,
    DROP COLUMN IF EXISTS root_id,
    DROP COLUMN IF EXISTS parent_id,
    DROP COLUMN IF EXISTS version_number,
    DROP COLUMN IF EXISTS version_name;

COMMIT;

-- ============================================================================
-- Migration 002 Rollback: Revert Resume Versioning Triggers & Constraints
-- Target: Supabase PostgreSQL 15+ / 16 (Strictly Non-Destructive to Data)
-- ============================================================================
--
-- SAFETY GUARANTEE:
-- This rollback script reverts database triggers, trigger functions, indexes,
-- and versioning constraints to restore Phase 5A behavior immediately.
--
-- THIS SCRIPT NEVER DROPS COLUMNS. ALL SAVED VERSIONING METADATA AND
-- CUSTOMIZATION SNAPSHOTS REMAIN 100% PRESERVED IN THE DATABASE.
-- ============================================================================

BEGIN;

-- 1. Drop Trigger Functions and Triggers
DROP TRIGGER IF EXISTS trg_enforce_version_immutability ON public.customization_history;
DROP FUNCTION IF EXISTS public.fn_enforce_version_immutability();

DROP TRIGGER IF EXISTS trg_handle_version_deletion ON public.customization_history;
DROP FUNCTION IF EXISTS public.fn_handle_version_deletion();

DROP TRIGGER IF EXISTS trg_set_next_version_number ON public.customization_history;
DROP FUNCTION IF EXISTS public.fn_set_next_version_number();

-- Drop Internal Security Context
DROP TABLE IF EXISTS internal_auth.active_reparenting_sessions;
DROP SCHEMA IF EXISTS internal_auth CASCADE;

-- 2. Drop Versioning Constraints (Composite FKs, Check Invariants & Uniqueness)
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

-- NOTICE: Versioning columns (version_name, version_number, parent_id, root_id,
-- version_tags, version_notes, is_starred) are intentionally retained to guarantee
-- zero data loss.

COMMIT;

-- ============================================================================
-- Migration 002: Add Resume Versioning, Lineage Tracking & Immutable Snapshots
-- Target: Supabase PostgreSQL 15+ / 16 (Additive, Idempotent, Non-Destructive)
-- ============================================================================
--
-- Version Family Specification:
-- A "Version Family" is defined strictly as a Revision Tree identified by root_id.
-- - Every standalone or initial tailored resume initiates a new Revision Tree:
--     root_id = id, parent_id = NULL, version_number = 1
-- - Subsequent iterations, edits or forks branch from an existing version in the tree:
--     root_id = parent.root_id, parent_id = parent.id, version_number = MAX + 1
-- - Version numbers belong strictly to the Revision Tree (user_id, root_id).
-- - Uniqueness is enforced at the database layer: UNIQUE (user_id, root_id, version_number).
-- - Parentless records are guaranteed to be their own root: CHECK (parent_id IS NOT NULL OR root_id = id).
-- - No version can be its own parent: CHECK (parent_id IS NULL OR parent_id != id).
-- - Association with a base candidate resume (resume_id -> saved_resumes) is optional
--   and non-destructive: multiple revision trees can reference the same base resume.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Add Additive Versioning Columns to customization_history
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'customization_history' AND column_name = 'version_name'
    ) THEN
        ALTER TABLE public.customization_history ADD COLUMN version_name VARCHAR(120);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'customization_history' AND column_name = 'version_number'
    ) THEN
        ALTER TABLE public.customization_history ADD COLUMN version_number INTEGER NOT NULL DEFAULT 1;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'customization_history' AND column_name = 'parent_id'
    ) THEN
        ALTER TABLE public.customization_history ADD COLUMN parent_id UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'customization_history' AND column_name = 'root_id'
    ) THEN
        ALTER TABLE public.customization_history ADD COLUMN root_id UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'customization_history' AND column_name = 'version_tags'
    ) THEN
        ALTER TABLE public.customization_history ADD COLUMN version_tags TEXT[] NOT NULL DEFAULT '{}';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'customization_history' AND column_name = 'version_notes'
    ) THEN
        ALTER TABLE public.customization_history ADD COLUMN version_notes TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'customization_history' AND column_name = 'is_starred'
    ) THEN
        ALTER TABLE public.customization_history ADD COLUMN is_starred BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Safe Backfill for Existing Phase 5A Records (Idempotent: WHERE root_id IS NULL)
-- ----------------------------------------------------------------------------
-- Backfill existing rows: each existing record becomes the root of its own revision tree
UPDATE public.customization_history
SET 
    version_name = COALESCE(NULLIF(TRIM(title), ''), 'v1.0 - Initial Customization'),
    version_number = 1,
    root_id = id
WHERE root_id IS NULL;

-- Now that existing rows have a valid root_id and version_name, enforce NOT NULL
ALTER TABLE public.customization_history
    ALTER COLUMN root_id SET NOT NULL,
    ALTER COLUMN version_name SET NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. Composite Uniqueness, Check Invariants & Foreign Key Ownership Constraints
-- ----------------------------------------------------------------------------
-- Composite unique constraint on (id, user_id) allows composite FK references
-- preventing any user from referencing records belonging to another tenant
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_customization_history_id_user_id'
    ) THEN
        ALTER TABLE public.customization_history
            ADD CONSTRAINT uq_customization_history_id_user_id
            UNIQUE (id, user_id);
    END IF;
END $$;

-- Invariant 1: Self-referencing parent is strictly forbidden
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_customization_history_parent_not_self'
    ) THEN
        ALTER TABLE public.customization_history
            ADD CONSTRAINT chk_customization_history_parent_not_self
            CHECK (parent_id IS NULL OR parent_id != id);
    END IF;
END $$;

-- Invariant 2: Every parentless record MUST be its own root
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_customization_history_root_consistency'
    ) THEN
        ALTER TABLE public.customization_history
            ADD CONSTRAINT chk_customization_history_root_consistency
            CHECK (parent_id IS NOT NULL OR root_id = id);
    END IF;
END $$;

-- Parent reference: strictly scoped to the same user_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_customization_history_parent_owner'
    ) THEN
        ALTER TABLE public.customization_history
            ADD CONSTRAINT fk_customization_history_parent_owner
            FOREIGN KEY (parent_id, user_id)
            REFERENCES public.customization_history(id, user_id)
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;

-- Root reference: strictly scoped to the same user_id, RESTRICT prevents cascade deletion
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_customization_history_root_owner'
    ) THEN
        ALTER TABLE public.customization_history
            ADD CONSTRAINT fk_customization_history_root_owner
            FOREIGN KEY (root_id, user_id)
            REFERENCES public.customization_history(id, user_id)
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END $$;

-- Database-enforced version number uniqueness within each Revision Tree
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_customization_history_root_version'
    ) THEN
        ALTER TABLE public.customization_history
            ADD CONSTRAINT uq_customization_history_root_version
            UNIQUE (user_id, root_id, version_number);
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. High-Performance Indexes for Version Trees & Lineage
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_customization_history_resume_versions
    ON public.customization_history (user_id, resume_id, version_number DESC)
    WHERE resume_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customization_history_root_lineage
    ON public.customization_history (user_id, root_id, version_number ASC);

CREATE INDEX IF NOT EXISTS idx_customization_history_parent_id
    ON public.customization_history (parent_id)
    WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customization_history_starred
    ON public.customization_history (user_id, is_starred)
    WHERE is_starred = true;

-- ----------------------------------------------------------------------------
-- 5. Trigger Function: Concurrency-Safe Version Number & Root Allocation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_set_next_version_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    next_ver INTEGER;
    parent_root UUID;
BEGIN
    -- 1. Resolve and strictly validate lineage
    IF NEW.parent_id IS NULL THEN
        -- Every parentless record is STRICTLY an independent new root
        IF NEW.root_id IS NOT NULL AND NEW.root_id != NEW.id THEN
            RAISE EXCEPTION 'Ambiguous lineage: parentless record cannot specify a distinct root_id %', NEW.root_id;
        END IF;

        NEW.root_id := NEW.id;
        NEW.version_number := 1;
    ELSE
        -- When parent_id is provided, parent MUST exist, belong to same user, and cannot be self
        IF NEW.parent_id = NEW.id THEN
            RAISE EXCEPTION 'Self-referencing lineage is prohibited: version % cannot be its own parent', NEW.id;
        END IF;

        SELECT root_id INTO parent_root
        FROM public.customization_history
        WHERE id = NEW.parent_id AND user_id = NEW.user_id;

        IF parent_root IS NULL THEN
            RAISE EXCEPTION 'Parent version % not found or does not belong to user %', NEW.parent_id, NEW.user_id;
        END IF;

        -- Reject conflicting client-submitted root_id
        IF NEW.root_id IS NOT NULL AND NEW.root_id != parent_root THEN
            RAISE EXCEPTION 'Lineage conflict: client root_id % does not match parent root_id %', NEW.root_id, parent_root;
        END IF;

        NEW.root_id := parent_root;
    END IF;

    -- 2. Concurrency Control: Advisory Transaction Lock per (user_id, root_id)
    -- Serializes concurrent version creation within the exact same revision family
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtext(NEW.user_id::text || ':' || NEW.root_id::text)
    );

    -- 3. Calculate version_number
    IF NEW.id = NEW.root_id THEN
        NEW.version_number := 1;
    ELSE
        SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_ver
        FROM public.customization_history
        WHERE user_id = NEW.user_id AND root_id = NEW.root_id;

        NEW.version_number := next_ver;
    END IF;

    -- 4. Default version_name if omitted or blank
    IF NEW.version_name IS NULL OR pg_catalog.btrim(NEW.version_name::text) = '' THEN
        NEW.version_name := 'v' || NEW.version_number || ' - ' || COALESCE(NULLIF(pg_catalog.btrim(NEW.title::text), ''), 'Customized Resume');
    END IF;

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_set_next_version_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_set_next_version_number() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_set_next_version_number ON public.customization_history;
CREATE TRIGGER trg_set_next_version_number
    BEFORE INSERT ON public.customization_history
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_set_next_version_number();

-- ----------------------------------------------------------------------------
-- 6. Internal Security Context for Unforgeable Lineage Reparenting
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS internal_auth;
REVOKE ALL ON SCHEMA internal_auth FROM PUBLIC, anon, authenticated;

CREATE UNLOGGED TABLE IF NOT EXISTS internal_auth.active_reparenting_sessions (
    txid BIGINT PRIMARY KEY,
    deleted_id UUID NOT NULL
);
REVOKE ALL ON TABLE internal_auth.active_reparenting_sessions FROM PUBLIC, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 7. Trigger Function: Safe Root and Parent Deletion Without Cascade Loss
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_handle_version_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    new_root UUID;
BEGIN
    -- Advisory lock on the version family to serialize concurrent operations
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtext(OLD.user_id::text || ':' || OLD.root_id::text)
    );

    -- Authorize internal structural reparenting via unforgeable database session record
    INSERT INTO internal_auth.active_reparenting_sessions (txid, deleted_id)
    VALUES (pg_catalog.txid_current(), OLD.id)
    ON CONFLICT (txid) DO UPDATE SET deleted_id = EXCLUDED.deleted_id;

    IF OLD.root_id = OLD.id THEN
        -- Case A: Root Version Deletion (OLD.root_id = OLD.id)
        -- Find the oldest surviving child in this family to elect as the new root
        SELECT id INTO new_root
        FROM public.customization_history
        WHERE root_id = OLD.id AND id != OLD.id AND user_id = OLD.user_id
        ORDER BY version_number ASC, created_at ASC
        LIMIT 1;

        IF new_root IS NOT NULL THEN
            -- Atomically promote new_root (root_id = new_root, parent_id = NULL)
            -- and reparent all surviving siblings in the family to new_root.
            -- Any child whose parent was OLD.id is reparented to new_root.
            -- Any grandchild retains its existing parent.
            UPDATE public.customization_history
            SET root_id = new_root,
                parent_id = CASE
                    WHEN id = new_root THEN NULL
                    WHEN parent_id = OLD.id THEN new_root
                    ELSE parent_id
                END
            WHERE root_id = OLD.id AND id != OLD.id AND user_id = OLD.user_id;
        END IF;
    ELSE
        -- Case B: Intermediate Version Deletion (OLD.root_id != OLD.id, OLD.parent_id IS NOT NULL)
        -- Reparent direct children of OLD to OLD's parent, preserving the existing root_id
        UPDATE public.customization_history
        SET parent_id = OLD.parent_id
        WHERE parent_id = OLD.id AND user_id = OLD.user_id;
    END IF;

    -- Clear reparenting authorization
    DELETE FROM internal_auth.active_reparenting_sessions WHERE txid = pg_catalog.txid_current();

    RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_handle_version_deletion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_handle_version_deletion() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_handle_version_deletion ON public.customization_history;
CREATE TRIGGER trg_handle_version_deletion
    BEFORE DELETE ON public.customization_history
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_handle_version_deletion();

-- ----------------------------------------------------------------------------
-- 8. Trigger Function: Enforce Immutable Snapshot Content at Database Layer
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_enforce_version_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    active_deleted_id UUID;
BEGIN
    -- Prevent modification of generated resume content and scoring
    IF NEW.tailored_result IS DISTINCT FROM OLD.tailored_result THEN
        RAISE EXCEPTION 'tailored_result is immutable and cannot be modified';
    END IF;

    IF NEW.job_description IS DISTINCT FROM OLD.job_description THEN
        RAISE EXCEPTION 'job_description is immutable and cannot be modified';
    END IF;

    IF NEW.match_score IS DISTINCT FROM OLD.match_score THEN
        RAISE EXCEPTION 'match_score is immutable and cannot be modified';
    END IF;

    IF NEW.ats_score IS DISTINCT FROM OLD.ats_score THEN
        RAISE EXCEPTION 'ats_score is immutable and cannot be modified';
    END IF;

    IF NEW.customization_engine IS DISTINCT FROM OLD.customization_engine THEN
        RAISE EXCEPTION 'customization_engine is immutable and cannot be modified';
    END IF;

    IF NEW.is_llm_generated IS DISTINCT FROM OLD.is_llm_generated THEN
        RAISE EXCEPTION 'is_llm_generated is immutable and cannot be modified';
    END IF;

    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'created_at is immutable and cannot be modified';
    END IF;

    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'user_id is immutable and cannot be transferred';
    END IF;

    IF NEW.version_number IS DISTINCT FROM OLD.version_number THEN
        RAISE EXCEPTION 'version_number is immutable and cannot be modified';
    END IF;

    -- Structural Mutation Security:
    -- root_id and parent_id can NEVER be directly modified by client requests.
    -- Mutation is permitted exclusively when authorized by fn_handle_version_deletion():
    -- 1. Must be executed from within a nested trigger context (pg_trigger_depth() >= 2).
    -- 2. Must possess an active reparenting record in internal_auth.active_reparenting_sessions.
    -- 3. The deleted ID must match the row's OLD.id, OLD.root_id, or OLD.parent_id.
    IF (NEW.root_id IS DISTINCT FROM OLD.root_id) OR (NEW.parent_id IS DISTINCT FROM OLD.parent_id) THEN
        IF pg_catalog.pg_trigger_depth() < 2 THEN
            RAISE EXCEPTION 'Lineage mutation rejected: root_id and parent_id are immutable and cannot be directly modified';
        END IF;

        SELECT deleted_id INTO active_deleted_id
        FROM internal_auth.active_reparenting_sessions
        WHERE txid = pg_catalog.txid_current();

        IF active_deleted_id IS NULL THEN
            RAISE EXCEPTION 'Lineage mutation rejected: unauthorized execution context (missing reparenting authorization)';
        END IF;

        IF active_deleted_id != OLD.id AND active_deleted_id != OLD.root_id AND active_deleted_id != OLD.parent_id THEN
            RAISE EXCEPTION 'Lineage mutation rejected: unauthorized reparenting target mismatch';
        END IF;
    END IF;

    -- Note: title, version_name, version_notes, version_tags, is_starred, updated_at
    -- and authorized internal reparenting are permitted.

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_enforce_version_immutability() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_enforce_version_immutability() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_enforce_version_immutability ON public.customization_history;
CREATE TRIGGER trg_enforce_version_immutability
    BEFORE UPDATE ON public.customization_history
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_enforce_version_immutability();

COMMIT;

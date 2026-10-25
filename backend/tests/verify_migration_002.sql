-- ============================================================================
-- Migration 002 Comprehensive Verification & Security Audit Script
-- Executed against isolated local PostgreSQL (Port 5433)
-- ============================================================================

\set ON_ERROR_STOP on

-- Step 1: Mock Supabase auth environment
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN;
    END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
    SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'authenticated')::text;
$$;

-- Step 2: Apply Migration 001 (Phase 5A baseline)
\i docs/migrations/001_initial_auth_and_history.sql

-- Step 3: Seed realistic Phase 5A baseline data
INSERT INTO auth.users (id, email) VALUES
    ('11111111-1111-1111-1111-111111111111', 'user1@example.com'),
    ('22222222-2222-2222-2222-222222222222', 'user2@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name) VALUES
    ('11111111-1111-1111-1111-111111111111', 'user1@example.com', 'Test User 1'),
    ('22222222-2222-2222-2222-222222222222', 'user2@example.com', 'Test User 2')
ON CONFLICT (id) DO NOTHING;

-- Insert Phase 5A history records (before versioning columns existed)
INSERT INTO public.customization_history (id, user_id, title, job_description, match_score, ats_score, tailored_result)
VALUES
    ('a0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Senior Backend Engineer', 'FastAPI & Postgres required', 85, 88, '{"candidate_name":"Alice"}'::jsonb),
    ('a0000002-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Cloud Architect', 'AWS & Kubernetes required', 90, 92, '{"candidate_name":"Alice"}'::jsonb),
    ('b0000001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Data Engineer', 'Spark & Python required', 80, 84, '{"candidate_name":"Bob"}'::jsonb);

\echo '--- [Step 3 Complete] Seeded Phase 5A baseline data ---'

-- Step 4: Apply Migration 002
\i docs/migrations/002_add_resume_versioning.sql

\echo '--- [Step 4 Complete] Applied Migration 002 ---'

-- Step 5: Verify backfill
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT * FROM public.customization_history LOOP
        IF r.version_number != 1 THEN
            RAISE EXCEPTION 'Backfill check failed: version_number % is not 1 for id %', r.version_number, r.id;
        END IF;
        IF r.root_id != r.id THEN
            RAISE EXCEPTION 'Backfill check failed: root_id % is not equal to id %', r.root_id, r.id;
        END IF;
        IF r.parent_id IS NOT NULL THEN
            RAISE EXCEPTION 'Backfill check failed: parent_id % should be NULL for id %', r.parent_id, r.id;
        END IF;
    END LOOP;
END $$;

\echo '--- [Step 5 Complete] Verified Phase 5A records successfully backfilled ---'

-- Step 6: Repeat execution (Idempotency test)
\i docs/migrations/002_add_resume_versioning.sql

\echo '--- [Step 6 Complete] Verified Repeat Execution of Migration 002 (Idempotency) ---'

-- Step 7: Test Rollback
\i docs/migrations/002_add_resume_versioning.rollback.sql

-- Verify Phase 5A still functions and data was preserved
DO $$
DECLARE
    cnt INTEGER;
BEGIN
    SELECT count(*) INTO cnt FROM public.customization_history;
    IF cnt != 3 THEN
        RAISE EXCEPTION 'Rollback lost data! Expected 3 rows, got %', cnt;
    END IF;
END $$;

\echo '--- [Step 7 Complete] Verified Rollback preserves all data ---'

-- Step 8: Re-apply Migration 002 for security and behavior validation
\i docs/migrations/002_add_resume_versioning.sql

\echo '--- [Step 8 Complete] Re-applied Migration 002 ---'

-- Step 9: Version Lineage & Auto-Increment Test
-- User 1 creates a child revision branching from a0000001
INSERT INTO public.customization_history (id, user_id, parent_id, title, version_name, job_description, tailored_result)
VALUES (
    'a0000001-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'a0000001-0000-0000-0000-000000000001',
    'Senior Backend Engineer - v2',
    'v2.0 - Fintech Emphasis',
    'FastAPI & Postgres Fintech JD',
    '{"candidate_name":"Alice","skills":["Python","Fintech"]}'::jsonb
);

-- User 1 creates another child revision branching from v2 (grandchild)
INSERT INTO public.customization_history (id, user_id, parent_id, title, version_name, job_description, tailored_result)
VALUES (
    'a0000001-0000-0000-0000-000000000003',
    '11111111-1111-1111-1111-111111111111',
    'a0000001-0000-0000-0000-000000000002',
    'Senior Backend Engineer - v3',
    'v3.0 - Lead Role',
    'FastAPI & Postgres Lead JD',
    '{"candidate_name":"Alice","skills":["Python","Leadership"]}'::jsonb
);

-- Verify version numbers
DO $$
DECLARE
    v2_num INT;
    v2_root UUID;
    v3_num INT;
    v3_root UUID;
BEGIN
    SELECT version_number, root_id INTO v2_num, v2_root
    FROM public.customization_history
    WHERE id = 'a0000001-0000-0000-0000-000000000002';

    SELECT version_number, root_id INTO v3_num, v3_root
    FROM public.customization_history
    WHERE id = 'a0000001-0000-0000-0000-000000000003';

    IF v2_num != 2 OR v2_root != 'a0000001-0000-0000-0000-000000000001'::uuid THEN
        RAISE EXCEPTION 'Child revision lineage failed: v2_num=%, v2_root=%', v2_num, v2_root;
    END IF;

    IF v3_num != 3 OR v3_root != 'a0000001-0000-0000-0000-000000000001'::uuid THEN
        RAISE EXCEPTION 'Grandchild revision lineage failed: v3_num=%, v3_root=%', v3_num, v3_root;
    END IF;
END $$;

\echo '--- [Step 9 Complete] Verified Lineage and Auto-Increment ---'

-- Step 10: Security Test - Immutability Enforcement
-- Try to modify tailored_result -> MUST FAIL
DO $$
BEGIN
    BEGIN
        UPDATE public.customization_history
        SET tailored_result = '{"tampered": true}'::jsonb
        WHERE id = 'a0000001-0000-0000-0000-000000000002';

        RAISE EXCEPTION 'SECURITY BREACH: tailored_result immutability was bypassed!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM NOT LIKE '%tailored_result is immutable%' THEN
                RAISE EXCEPTION 'Unexpected error: %', SQLERRM;
            END IF;
    END;
END $$;

-- Try to directly alter root_id or parent_id -> MUST FAIL
DO $$
BEGIN
    BEGIN
        UPDATE public.customization_history
        SET parent_id = NULL
        WHERE id = 'a0000001-0000-0000-0000-000000000002';

        RAISE EXCEPTION 'SECURITY BREACH: Lineage mutation was bypassed!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM NOT LIKE '%Lineage mutation rejected%' THEN
                RAISE EXCEPTION 'Unexpected error: %', SQLERRM;
            END IF;
    END;
END $$;

-- Try to modify version_number -> MUST FAIL
DO $$
BEGIN
    BEGIN
        UPDATE public.customization_history
        SET version_number = 999
        WHERE id = 'a0000001-0000-0000-0000-000000000002';

        RAISE EXCEPTION 'SECURITY BREACH: version_number modification was bypassed!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM NOT LIKE '%version_number is immutable%' THEN
                RAISE EXCEPTION 'Unexpected error: %', SQLERRM;
            END IF;
    END;
END $$;

\echo '--- [Step 10 Complete] Verified Snapshot & Lineage Immutability ---'

-- Step 11: Security Test - internal_auth Schema Abuse Prevention
-- Authenticated users must NOT have permissions on internal_auth
DO $$
DECLARE
    has_perm BOOLEAN;
BEGIN
    SELECT has_schema_privilege('authenticated', 'internal_auth', 'USAGE') INTO has_perm;
    IF has_perm THEN
        RAISE EXCEPTION 'SECURITY BREACH: authenticated role has USAGE privilege on internal_auth schema!';
    END IF;

    SELECT has_table_privilege('authenticated', 'internal_auth.active_reparenting_sessions', 'SELECT') INTO has_perm;
    IF has_perm THEN
        RAISE EXCEPTION 'SECURITY BREACH: authenticated role has SELECT privilege on internal_auth.active_reparenting_sessions!';
    END IF;

    SELECT has_table_privilege('authenticated', 'internal_auth.active_reparenting_sessions', 'INSERT') INTO has_perm;
    IF has_perm THEN
        RAISE EXCEPTION 'SECURITY BREACH: authenticated role has INSERT privilege on internal_auth.active_reparenting_sessions!';
    END IF;
END $$;

\echo '--- [Step 11 Complete] Verified internal_auth schema isolation ---'

-- Step 12: Deletion Safety & Reparenting Test (Case A: Root Deletion)
-- When root a0000001-0000-0000-0000-000000000001 is deleted:
-- 1. Surviving oldest child (a0000001-0000-0000-0000-000000000002, v2) must become the NEW ROOT (root_id=self, parent_id=NULL).
-- 2. Its child (a0000001-0000-0000-0000-000000000003, v3) must be reparented so root_id = new_root.
-- 3. No cascade deletion may occur (total remaining versions must be exactly 2 for this family).
DELETE FROM public.customization_history
WHERE id = 'a0000001-0000-0000-0000-000000000001';

DO $$
DECLARE
    new_root_row RECORD;
    v3_row RECORD;
    remaining_cnt INT;
BEGIN
    -- Check total surviving rows for this family
    SELECT count(*) INTO remaining_cnt
    FROM public.customization_history
    WHERE id IN ('a0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000003');

    IF remaining_cnt != 2 THEN
        RAISE EXCEPTION 'Deletion anomaly: surviving count % != 2', remaining_cnt;
    END IF;

    SELECT * INTO new_root_row
    FROM public.customization_history
    WHERE id = 'a0000001-0000-0000-0000-000000000002';

    IF new_root_row.root_id != new_root_row.id THEN
        RAISE EXCEPTION 'Root promotion failed: root_id % != id %', new_root_row.root_id, new_root_row.id;
    END IF;
    IF new_root_row.parent_id IS NOT NULL THEN
        RAISE EXCEPTION 'Root promotion failed: parent_id % is not NULL', new_root_row.parent_id;
    END IF;

    SELECT * INTO v3_row
    FROM public.customization_history
    WHERE id = 'a0000001-0000-0000-0000-000000000003';

    IF v3_row.root_id != new_root_row.id THEN
        RAISE EXCEPTION 'Reparenting failed: v3 root_id % != new_root %', v3_row.root_id, new_root_row.id;
    END IF;
    IF v3_row.parent_id != new_root_row.id THEN
        RAISE EXCEPTION 'Reparenting failed: v3 parent_id % != new_root %', v3_row.parent_id, new_root_row.id;
    END IF;
END $$;

\echo '--- [Step 12 Complete] Verified Root Deletion reparents surviving children without cascade loss ---'

-- Step 13: Deletion Safety (Case B: Intermediate Deletion)
-- Insert a child under v3 to create a 3-level chain: NewRoot (v2) -> v3 -> v4
INSERT INTO public.customization_history (id, user_id, parent_id, title, version_name, job_description, tailored_result)
VALUES (
    'a0000001-0000-0000-0000-000000000004',
    '11111111-1111-1111-1111-111111111111',
    'a0000001-0000-0000-0000-000000000003',
    'Senior Backend Engineer - v4',
    'v4.0 - Principal Role',
    'FastAPI & Postgres Principal JD',
    '{"candidate_name":"Alice","skills":["Python","Principal"]}'::jsonb
);

-- Now delete intermediate version v3 (id = a0000001-0000-0000-0000-000000000003)
-- v4 must be safely reparented to v2 (which was v3's parent)
DELETE FROM public.customization_history
WHERE id = 'a0000001-0000-0000-0000-000000000003';

DO $$
DECLARE
    v4_row RECORD;
BEGIN
    SELECT * INTO v4_row
    FROM public.customization_history
    WHERE id = 'a0000001-0000-0000-0000-000000000004';

    IF v4_row.parent_id != 'a0000001-0000-0000-0000-000000000002'::uuid THEN
        RAISE EXCEPTION 'Intermediate deletion reparenting failed: v4 parent_id % != v2', v4_row.parent_id;
    END IF;
    IF v4_row.root_id != 'a0000001-0000-0000-0000-000000000002'::uuid THEN
        RAISE EXCEPTION 'Intermediate deletion root preservation failed: v4 root_id % != v2', v4_row.root_id;
    END IF;
END $$;

\echo '--- [Step 13 Complete] Verified Intermediate Deletion reparents direct children ---'

-- Step 14: Cross-User Lineage Attack Prevention
-- User 2 attempts to branch from User 1's version -> MUST FAIL with foreign key violation
DO $$
BEGIN
    BEGIN
        INSERT INTO public.customization_history (id, user_id, parent_id, title, version_name, job_description, tailored_result)
        VALUES (
            'b0000001-0000-0000-0000-000000000002',
            '22222222-2222-2222-2222-222222222222', -- User 2
            'a0000001-0000-0000-0000-000000000002', -- User 1's version
            'Hacked Branch',
            'Hacked v2',
            'JD',
            '{"candidate_name":"Bob"}'::jsonb
        );

        RAISE EXCEPTION 'SECURITY BREACH: User 2 was able to fork User 1 version!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM NOT LIKE '%fk_customization_history_parent_owner%'
               AND SQLERRM NOT LIKE '%Parent version%not found or does not belong to user%' THEN
                RAISE EXCEPTION 'Unexpected error: %', SQLERRM;
            END IF;
    END;
END $$;

\echo '--- [Step 14 Complete] Verified Cross-User Lineage Attack is Blocked ---'

\echo '========================================================================'
\echo 'ALL 14 DATABASE MIGRATION AND SECURITY INVARIANTS VERIFIED SUCCESSFULLY!'
\echo '========================================================================'

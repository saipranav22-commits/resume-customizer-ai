-- Migration 001: Initial Authentication, User Profiles, Saved Resumes, and Customization History
-- Target: Supabase PostgreSQL 15+ / 16 (auth.users integration)
-- Security Hardened: Strict Composite Foreign Key Ownership, Robust Triggers, Explicit RLS & Grants

-- 1. Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. Profiles Table (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================================================
-- 3. Saved Resumes Table (stores base uploaded resumes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.saved_resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    original_filename TEXT,
    raw_text TEXT NOT NULL,
    candidate_name TEXT,
    contact_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_saved_resumes_id_user_id UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_resumes_user_id ON public.saved_resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_resumes_user_created ON public.saved_resumes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_resumes_created_at ON public.saved_resumes(created_at DESC);

-- ============================================================================
-- 4. Customization History Table (stores tailored resume snapshots)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customization_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resume_id UUID,
    title TEXT NOT NULL,
    target_role TEXT,
    job_description TEXT NOT NULL,
    customization_engine TEXT NOT NULL DEFAULT 'gemini',
    is_llm_generated BOOLEAN NOT NULL DEFAULT true,
    match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
    ats_score INTEGER CHECK (ats_score >= 0 AND ats_score <= 100),
    tailored_result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT fk_customization_history_resume_owner
        FOREIGN KEY (resume_id, user_id)
        REFERENCES public.saved_resumes(id, user_id)
        ON DELETE SET NULL (resume_id)
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customization_history_user_id ON public.customization_history(user_id);
CREATE INDEX IF NOT EXISTS idx_customization_history_user_created ON public.customization_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customization_history_resume_owner ON public.customization_history(resume_id, user_id) WHERE resume_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customization_history_created_at ON public.customization_history(created_at DESC);

-- ============================================================================
-- 5. Enable Row Level Security (RLS) on all tables
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customization_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. Role Grants and Permissions Audit
-- ============================================================================
-- Revoke all permissions from PUBLIC and anon on private user tables
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.saved_resumes FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.customization_history FROM PUBLIC, anon;

-- Grant CRUD permissions to authenticated users (strictly filtered by RLS policies)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saved_resumes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customization_history TO authenticated;

-- Grant administrative access to service_role (backend services & administrative tasks)
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.saved_resumes TO service_role;
GRANT ALL ON TABLE public.customization_history TO service_role;

-- ============================================================================
-- 7. RLS Policies for Profiles
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = id)
    WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
    ON public.profiles FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = id);

-- ============================================================================
-- 8. RLS Policies for Saved Resumes
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own saved resumes" ON public.saved_resumes;
CREATE POLICY "Users can view own saved resumes"
    ON public.saved_resumes FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own saved resumes" ON public.saved_resumes;
CREATE POLICY "Users can insert own saved resumes"
    ON public.saved_resumes FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own saved resumes" ON public.saved_resumes;
CREATE POLICY "Users can update own saved resumes"
    ON public.saved_resumes FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own saved resumes" ON public.saved_resumes;
CREATE POLICY "Users can delete own saved resumes"
    ON public.saved_resumes FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- 9. RLS Policies for Customization History
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own customization history" ON public.customization_history;
CREATE POLICY "Users can view own customization history"
    ON public.customization_history FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own customization history" ON public.customization_history;
CREATE POLICY "Users can insert own customization history"
    ON public.customization_history FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own customization history" ON public.customization_history;
CREATE POLICY "Users can update own customization history"
    ON public.customization_history FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own customization history" ON public.customization_history;
CREATE POLICY "Users can delete own customization history"
    ON public.customization_history FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- 10. Automatic Profile Creation Trigger on Supabase Auth Sign Up
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            ''
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            ''
        )
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Restrict execution of SECURITY DEFINER function
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 11. Automatic Updated At Trigger Function
-- ============================================================================
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

REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated, service_role;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_saved_resumes_updated_at ON public.saved_resumes;
CREATE TRIGGER set_saved_resumes_updated_at
    BEFORE UPDATE ON public.saved_resumes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_customization_history_updated_at ON public.customization_history;
CREATE TRIGGER set_customization_history_updated_at
    BEFORE UPDATE ON public.customization_history
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

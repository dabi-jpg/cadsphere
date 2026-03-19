-- ============================================================================
-- Supabase Row Level Security (RLS) Setup for CAD Platform
--
-- Run this SQL in the Supabase SQL Editor after running `npx prisma db push`.
--
-- SECURITY: These policies enforce user-scoped data access at the database
-- level, providing defense-in-depth even if application code has bugs.
-- The anon key + RLS ensures the browser client can only access data
-- belonging to the authenticated user.
-- ============================================================================

-- ─── Enable RLS ─────────────────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- ─── Users Table Policies ───────────────────────────────────────────────────

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid()::text = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid()::text = id);

-- Allow server-side inserts (service role bypasses RLS; this is for
-- the anon key client which shouldn't insert users directly)
CREATE POLICY "Service role can insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid()::text = id);

-- ─── Files Table Policies ───────────────────────────────────────────────────

-- Users can only see their own files
CREATE POLICY "Users can read own files"
  ON public.files
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can only insert files with their own user_id
CREATE POLICY "Users can insert own files"
  ON public.files
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can only delete their own files
CREATE POLICY "Users can delete own files"
  ON public.files
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- ─── Storage Policies (apply via Supabase Dashboard → Storage → Policies) ──
-- 
-- For the "cad-files" bucket, create these policies in the dashboard:
--
-- SELECT (download):
--   (bucket_id = 'cad-files') AND (auth.uid()::text = (storage.foldername(name))[1])
--
-- INSERT (upload):
--   (bucket_id = 'cad-files') AND (auth.uid()::text = (storage.foldername(name))[1])
--
-- DELETE:
--   (bucket_id = 'cad-files') AND (auth.uid()::text = (storage.foldername(name))[1])
--
-- These policies ensure files in the {user_id}/ folder can only be accessed
-- by the user whose ID matches the folder name.
-- ============================================================================

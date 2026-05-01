-- Maintenance script: archive (optional) all drink logs, wipe logs, remove test user.
-- Run in Supabase Dashboard > SQL Editor (database owner). Review before executing.
--
-- WARNING: Step 2 deletes EVERY row in public.drink_logs (all members / households).
-- Step 3 deletes auth user(s) whose display_name is exactly 'ゆうすけテスト'.

-- ---------------------------------------------------------------------------
-- 1) Optional archive: keep a copy without FKs (safe snapshot before wipe)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.drink_logs_archive (
  id uuid NOT NULL,
  user_id uuid NOT NULL,
  household_id uuid NOT NULL,
  drink_type text NOT NULL,
  custom_drink_name text,
  drank_on date NOT NULL,
  created_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.drink_logs_archive (
  id,
  user_id,
  household_id,
  drink_type,
  custom_drink_name,
  drank_on,
  created_at
)
SELECT
  id,
  user_id,
  household_id,
  drink_type,
  custom_drink_name,
  drank_on,
  created_at
FROM public.drink_logs;

-- ---------------------------------------------------------------------------
-- 2) Remove all drink log rows (test / historical entries)
-- ---------------------------------------------------------------------------
DELETE FROM public.drink_logs;

-- ---------------------------------------------------------------------------
-- 3) Delete Auth user(s) matched by profile display name
--    (cascades user_profiles, household_members, etc. per your FKs)
-- ---------------------------------------------------------------------------
DELETE FROM auth.users
WHERE id IN (
  SELECT user_id
  FROM public.user_profiles
  WHERE display_name = 'ゆうすけテスト'
);

-- ---------------------------------------------------------------------------
-- 4) Drop orphaned households (no members left)
-- ---------------------------------------------------------------------------
DELETE FROM public.households AS h
WHERE NOT EXISTS (
  SELECT 1
  FROM public.household_members AS hm
  WHERE hm.household_id = h.id
);

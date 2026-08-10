-- The previous migration (20260722000000) tried to add a strict CHECK
-- constraint to looking_for, but that column already existed in the
-- schema long before it was wired up to any UI, and some existing rows
-- carry values from an earlier version of the app that don't match the
-- 5-option set this feature introduced. Enforcing the constraint failed
-- immediately on that pre-existing data.
--
-- Fix: don't force a rigid constraint onto data whose full shape isn't
-- known. relationship_status is a brand-new column (every existing row
-- is null there, so its constraint is safe and unaffected). looking_for
-- validation now happens at the application layer instead — the edit
-- screen's dropdown only ever writes one of the 5 canonical values going
-- forward, and the display code already falls back to showing the raw
-- value as-is for any legacy value it doesn't recognize, so nothing
-- breaks either way.

alter table public.user_profiles
  drop constraint if exists user_profiles_looking_for_check;

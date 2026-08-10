-- Adds relationship_status, matching the existing looking_for column
-- (which already existed in the schema but was never wired to any UI —
-- both are wired up together as part of this change).

alter table public.user_profiles
  add column if not exists relationship_status text;

-- Keep values constrained to a known set so display logic (badges, filters)
-- never has to handle arbitrary free text.
alter table public.user_profiles
  drop constraint if exists user_profiles_relationship_status_check;
alter table public.user_profiles
  add constraint user_profiles_relationship_status_check
  check (relationship_status is null or relationship_status in
    ('single', 'married', 'divorced', 'widowed', 'separated'));

alter table public.user_profiles
  drop constraint if exists user_profiles_looking_for_check;
alter table public.user_profiles
  add constraint user_profiles_looking_for_check
  check (looking_for is null or looking_for in
    ('friendship', 'serious', 'casual', 'flirting', 'not_sure'));

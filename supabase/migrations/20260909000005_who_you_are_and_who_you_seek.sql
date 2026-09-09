-- Who you are, who you are looking for, and where you are.
--
-- Discovery had no filters at all: it showed the twenty newest or online
-- public profiles to everyone. It could not have filtered, because nothing
-- usable was stored - gender was never asked (every row carried the column
-- default 'prefer-not-to-say'), and location was free text ("Toronto
-- canada", "Nigeria ", and a "New York, NY" that was the edit form's
-- placeholder saved as if it were real).
--
-- This adds three structured fields to the profile - gender, who they are
-- looking for, and country (ISO 3166-1 alpha-2) - and a country on the
-- member's saved search preferences. The screens ask for them at sign-up,
-- in Edit Profile, and once for existing members; Discovery's filter sheet
-- uses them.

-- ---- profile: gender is a real answer or nothing ------------------------
alter table public.user_profiles alter column gender drop default;
update public.user_profiles
   set gender = case
                  when lower(gender) in ('male', 'man', 'm') then 'man'
                  when lower(gender) in ('female', 'woman', 'f') then 'woman'
                  else null
                end;
alter table public.user_profiles drop constraint if exists user_profiles_gender_check;
alter table public.user_profiles
  add constraint user_profiles_gender_check check (gender is null or gender in ('man', 'woman'));

alter table public.user_profiles
  add column if not exists seeking text
    check (seeking is null or seeking in ('men', 'women', 'everyone')),
  add column if not exists country_code char(2)
    check (country_code is null or country_code ~ '^[A-Z]{2}$');

-- The edit form's placeholder was being saved as a location.
update public.user_profiles set location = null where location = 'New York, NY';

create index if not exists user_profiles_discovery_idx
  on public.user_profiles (gender, country_code, age)
  where profile_visibility = 'public' or profile_visibility is null;

-- ---- saved search: add country beside the existing gender and age --------
alter table public.user_preferences
  add column if not exists country_code char(2)
    check (country_code is null or country_code ~ '^[A-Z]{2}$');
alter table public.user_preferences
  drop constraint if exists user_preferences_preferred_gender_check;
alter table public.user_preferences
  add constraint user_preferences_preferred_gender_check
    check (preferred_gender is null or preferred_gender in ('men', 'women', 'everyone'));

-- One row per member; the filter sheet upserts on user_id.
create unique index if not exists user_preferences_user_id_key on public.user_preferences (user_id);

-- user_profiles is granted column by column; the new columns need their own
-- grants or the browser's update is refused outright.
grant update (seeking, country_code) on public.user_profiles to authenticated;
grant insert (seeking, country_code, gender) on public.user_profiles to authenticated;

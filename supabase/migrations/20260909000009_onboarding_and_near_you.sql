-- Onboarding that cannot be skipped, and a first screen with real people on it.
--
-- Eight of the first fourteen members never set a gender or a city, so the
-- site could neither show them to anyone nor show anyone to them. Three
-- things here:
--
--   1. user_profiles.region_code - a province or state, so "people near you"
--      means something on a site whose members are spread across a country.
--   2. my_profile_completion() - the one server-side definition of "complete"
--      (a photo, gender, who you seek, country, city). The app gates on it.
--   3. members_near_me() - the people in your province, then your country,
--      with counts, for the screen shown the moment onboarding finishes.
--
-- And the Staff overview learns two honest numbers: how many profiles are
-- complete, and how many sign-ups came through an invitation.

alter table public.user_profiles
  add column if not exists region_code text
  check (region_code is null or region_code ~ '^[A-Z0-9]{1,3}$');

-- user_profiles carries column-level grants, so a new column is invisible
-- to the app until it is granted like the others.
grant select (region_code) on public.user_profiles to anon, authenticated;
grant insert (region_code), update (region_code) on public.user_profiles to authenticated;

create index if not exists user_profiles_near_idx
  on public.user_profiles (country_code, region_code)
  where profile_visibility is null or profile_visibility = 'public';

-- What "complete" means, in one place.
create or replace function public.my_profile_completion()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'photo',   exists (select 1 from public.user_photos ph where ph.user_id = auth.uid()),
    'gender',  p.gender is not null,
    'seeking', p.seeking is not null,
    'country', p.country_code is not null,
    'city',    coalesce(nullif(trim(p.location), ''), '') <> '',
    'complete',
      exists (select 1 from public.user_photos ph where ph.user_id = auth.uid())
      and p.gender is not null and p.seeking is not null
      and p.country_code is not null
      and coalesce(nullif(trim(p.location), ''), '') <> ''
  )
  from public.user_profiles p
  where p.user_id = auth.uid();
$$;

revoke all on function public.my_profile_completion() from public, anon;
grant execute on function public.my_profile_completion() to authenticated;

-- People near you: same province first, then same country. Only complete,
-- public profiles with a photo, matching who you said you are looking for,
-- never anyone either side has blocked, never yourself.
create or replace function public.members_near_me(p_limit integer default 12)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_country text;
  v_region text;
  v_seeking text;
  v_gender text;
  v_limit integer := greatest(1, least(coalesce(p_limit, 12), 40));
  v_out jsonb;
begin
  if v_me is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select country_code, region_code, seeking into v_country, v_region, v_seeking
  from public.user_profiles where user_id = v_me;

  v_gender := case v_seeking when 'women' then 'woman' when 'men' then 'man' else null end;

  with candidates as (
    select p.user_id, p.first_name, p.full_name, p.age, p.location, p.region_code, p.country_code,
           p.is_online, p.last_active, p.is_verified, p.created_at,
           (v_region is not null and p.region_code = v_region) as in_region
    from public.user_profiles p
    where p.user_id <> v_me
      and (p.profile_visibility is null or p.profile_visibility = 'public')
      and p.gender is not null and p.seeking is not null
      and coalesce(nullif(trim(p.location), ''), '') <> ''
      and p.country_code is not null
      and (v_country is null or p.country_code = v_country)
      and (v_gender is null or p.gender = v_gender)
      and exists (select 1 from public.user_photos ph where ph.user_id = p.user_id)
      and not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = v_me and b.blocked_id = p.user_id)
           or (b.blocker_id = p.user_id and b.blocked_id = v_me)
      )
  ),
  counts as (
    select count(*) filter (where in_region) as region_count, count(*) as country_count from candidates
  ),
  picked as (
    select c.user_id,
           coalesce(nullif(trim(c.first_name), ''), split_part(coalesce(c.full_name, ''), ' ', 1)) as first_name,
           c.age, c.location, c.region_code, c.country_code, c.is_online, c.last_active, c.is_verified, c.in_region,
           (select ph.photo_url from public.user_photos ph
             where ph.user_id = c.user_id
             order by ph.is_primary desc, ph.display_order nulls last, ph.created_at
             limit 1) as photo_url
    from candidates c
    order by c.in_region desc, c.is_online desc nulls last, c.last_active desc nulls last, c.created_at desc
    limit v_limit
  )
  select jsonb_build_object(
    'scope', case when counts.region_count > 0 then 'region' else 'country' end,
    'region_code', v_region,
    'country_code', v_country,
    'region_count', counts.region_count,
    'country_count', counts.country_count,
    'members', (select coalesce(jsonb_agg(row_to_json(picked)), '[]'::jsonb) from picked)
  ) into v_out
  from counts;

  return v_out;
end;
$$;

revoke all on function public.members_near_me(integer) from public, anon;
grant execute on function public.members_near_me(integer) to authenticated;

-- Staff overview: completed profiles and invited sign-ups, alongside the
-- counts it already had.
create or replace function public.staff_overview_counts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_members integer;
  v_complete integer;
  v_signups_30d integer;
  v_referred_30d integer;
begin
  if not public.can_moderate(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select count(*) into v_members from public.user_profiles;

  select count(*) into v_complete
  from public.user_profiles p
  where p.gender is not null and p.seeking is not null and p.country_code is not null
    and coalesce(nullif(trim(p.location), ''), '') <> ''
    and exists (select 1 from public.user_photos ph where ph.user_id = p.user_id);

  select count(*) into v_signups_30d from public.user_profiles where created_at >= now() - interval '30 days';
  select count(*) into v_referred_30d from public.referrals where created_at >= now() - interval '30 days';

  return jsonb_build_object(
    'members', v_members,
    'verified', (select count(*) from public.user_profiles where verification_status = 'verified' or is_verified = true),
    'joined_7d', (select count(*) from public.user_profiles where created_at >= now() - interval '7 days'),
    'active_7d', (select count(*) from public.user_profiles where last_active >= now() - interval '7 days'),
    'pending_deletions', (select count(*) from public.account_deletion_requests where status in ('pending', 'held')),
    'paid_usd', (select coalesce(sum(amount_usd), 0) from public.app_payment_intents where status = 'finished'),
    'paid_count', (select count(*) from public.app_payment_intents where status = 'finished'),
    'paid_30d_usd', (select coalesce(sum(amount_usd), 0) from public.app_payment_intents where status = 'finished' and created_at >= now() - interval '30 days'),
    'completed_profiles', v_complete,
    'completed_pct', case when v_members > 0 then round(100.0 * v_complete / v_members) else 0 end,
    'women', (select count(*) from public.user_profiles where gender = 'woman'),
    'men', (select count(*) from public.user_profiles where gender = 'man'),
    'signups_30d', v_signups_30d,
    'referred_7d', (select count(*) from public.referrals where created_at >= now() - interval '7 days'),
    'referred_30d', v_referred_30d,
    'referred_pct_30d', case when v_signups_30d > 0 then round(100.0 * v_referred_30d / v_signups_30d) else 0 end,
    'referrals_rewarded', (select count(*) from public.referrals where status = 'rewarded')
  );
end;
$$;

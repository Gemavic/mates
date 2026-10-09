-- One person, one account. A real age, from a real birth date. Members only.
--
-- What was wrong (9 Oct 2026):
--
-- 1. One member had three accounts, each on a different email address (two
--    through Google, one with a password). Supabase already refuses a second
--    account on the same address, but nothing noticed the same person coming
--    back under another one.
-- 2. A member's age could be typed straight into user_profiles.age with no
--    birth date behind it, and Google sign-ups were never asked for a birth
--    date at all. 14 of 17 profiles had none. The app then printed 25 for
--    anyone with no age.
-- 3. looking_for defaulted to 'serious', so every new member was labelled
--    "Real love" and the question that asks them was never shown.
-- 4. The anon key - which ships in the site's JavaScript - could read every
--    public profile row, email address, birth date and GPS point included,
--    and every photo row. Any signed-in account, finished or not, could read
--    the same.
--
-- What this does:
--
--   * existing_account_for(): the one place that decides "this person already
--     has an account" - same email, or the same full name and birth date.
--   * registration_check(): asked by the sign-up form before an account is
--     created. Answers with a masked hint (re•••@gmail.com) and how that
--     account signs in, so the person can sign in or reset their password.
--   * set_my_birth_date() refuses a birth date that matches another account's
--     name and birth date, and handle_new_user() will not copy one onto a new
--     account either. Such an account can never finish its profile, so it is
--     never shown to anyone.
--   * age is derived from date_of_birth and nothing else. No birth date, no
--     age. A birth date under 18 is refused outright. Once set, only staff can
--     change it. A nightly job keeps ages right across birthdays.
--   * A profile is complete only with a birth date on file.
--   * Seeing other members requires being one: signed in (not a guest), email
--     confirmed, and a complete profile - photo, birth date, gender, who they
--     are looking for, country and city. The anon role sees no member rows.
--   * Email, birth date and location coordinates are no longer readable from
--     other members' rows. A member reads their own through my_private_profile().
--
-- Existing duplicate accounts are NOT touched here. That needs the owner's
-- decision about which account each person keeps.

-- ---------------------------------------------------------------- helpers

create or replace function public.norm_person_name(p text)
returns text
language sql
stable
set search_path = public, extensions
as $$
  -- Lower case, accents off, punctuation off, words sorted, so that
  -- "Aderemi Adeshina", "aderemi  adeshina" and "Adeshina, Aderemi" agree.
  select nullif(array_to_string(array(
    select w
    from unnest(regexp_split_to_array(
           lower(extensions.unaccent(coalesce(p, ''))), '[^[:alpha:]]+')) w
    where w <> ''
    order by w
  ), ' '), '');
$$;

create or replace function public.mask_email(p text)
returns text
language sql
immutable
as $$
  select case
    when p is null or position('@' in p) = 0 then null
    else left(split_part(p, '@', 1), 2) || '•••@' || split_part(p, '@', 2)
  end;
$$;

-- How an existing account signs in, in words the sign-up form can use.
create or replace function public.account_sign_in_method(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when u.raw_app_meta_data->'providers' ? 'google' and u.raw_app_meta_data->'providers' ? 'email' then 'google_or_password'
    when u.raw_app_meta_data->'providers' ? 'google' then 'google'
    else 'password'
  end
  from auth.users u where u.id = p_user;
$$;

-- The one definition of "this person already has an account".
-- Not callable from the API; the functions below use it.
create or replace function public.existing_account_for(
  p_email text,
  p_full_name text,
  p_dob date,
  p_exclude uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text;
begin
  if nullif(trim(coalesce(p_email, '')), '') is not null then
    select u.id, u.email into v_id, v_email
    from auth.users u
    where lower(u.email) = lower(trim(p_email))
      and coalesce(u.is_anonymous, false) = false
      and (p_exclude is null or u.id <> p_exclude)
    limit 1;
    if v_id is not null then
      return jsonb_build_object('match', 'email', 'hint', public.mask_email(v_email),
                                'method', public.account_sign_in_method(v_id));
    end if;
  end if;

  if p_dob is not null and public.norm_person_name(p_full_name) is not null then
    select p.user_id, u.email into v_id, v_email
    from public.user_profiles p
    join auth.users u on u.id = p.user_id
    where p.date_of_birth = p_dob
      and public.norm_person_name(p.full_name) = public.norm_person_name(p_full_name)
      and coalesce(p.verification_status, '') <> 'deleted'
      and coalesce(u.is_anonymous, false) = false
      and (p_exclude is null or p.user_id <> p_exclude)
    order by p.created_at
    limit 1;
    if v_id is not null then
      return jsonb_build_object('match', 'name_and_birth_date', 'hint', public.mask_email(v_email),
                                'method', public.account_sign_in_method(v_id));
    end if;
  end if;

  return null;
end;
$$;

revoke all on function public.existing_account_for(text, text, date, uuid) from public, anon, authenticated;
revoke all on function public.account_sign_in_method(uuid) from public, anon, authenticated;

-- ------------------------------------------------- asked before signing up

create or replace function public.registration_check(p_email text, p_full_name text, p_dob date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_found jsonb;
begin
  if p_dob is null then
    return jsonb_build_object('status', 'birth_date_required');
  end if;
  if p_dob > (current_date - interval '18 years') then
    return jsonb_build_object('status', 'under_18');
  end if;
  if p_dob < (current_date - interval '110 years') then
    return jsonb_build_object('status', 'implausible_birth_date');
  end if;

  v_found := public.existing_account_for(p_email, p_full_name, p_dob, null);
  if v_found is null then
    return jsonb_build_object('status', 'ok');
  end if;

  return jsonb_build_object(
    'status', case when v_found->>'match' = 'email' then 'email_exists' else 'possible_duplicate' end,
    'hint', v_found->>'hint',
    'method', v_found->>'method'
  );
end;
$$;

revoke all on function public.registration_check(text, text, date) from public;
grant execute on function public.registration_check(text, text, date) to anon, authenticated;

-- ------------------------------------------------------ the birth date

create or replace function public.set_my_birth_date(p_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_existing date;
  v_name text;
  v_found jsonb;
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'error', 'not_signed_in');
  end if;

  select date_of_birth, full_name into v_existing, v_name
  from public.user_profiles where user_id = v_user;

  if v_existing is not null then
    return jsonb_build_object('success', false, 'error', 'already_set',
      'message', 'Your date of birth is already on file. Contact admin@dates.care if it is wrong.');
  end if;

  if p_date is null or p_date > (current_date - interval '18 years') then
    return jsonb_build_object('success', false, 'error', 'under_18',
      'message', 'Dates.care is strictly for adults aged 18 and over.');
  end if;

  if p_date < (current_date - interval '110 years') then
    return jsonb_build_object('success', false, 'error', 'implausible',
      'message', 'Please enter your real date of birth.');
  end if;

  v_found := public.existing_account_for(null, v_name, p_date, v_user);
  if v_found is not null then
    return jsonb_build_object('success', false, 'error', 'duplicate_account',
      'hint', v_found->>'hint', 'method', v_found->>'method',
      'message', 'You already have a Dates.care account. Please sign in to that one instead.');
  end if;

  update public.user_profiles
     set date_of_birth = p_date, updated_at = now()
   where user_id = v_user;

  return jsonb_build_object('success', true,
    'age', (select age from public.user_profiles where user_id = v_user));
end;
$$;

revoke all on function public.set_my_birth_date(date) from public, anon;
grant execute on function public.set_my_birth_date(date) to authenticated;

-- A new account copies its birth date from sign-up only when it is 18+ and
-- does not match another account's name and birth date. Otherwise it is left
-- empty and the member is asked for it, through set_my_birth_date(), which
-- says why.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  full_name_value text;
  email_value     text;
  dob_value       date;
begin
  begin
    full_name_value := coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, 'user@example.com'), '@', 1),
      'User'
    );
  exception when others then
    full_name_value := 'User';
  end;

  email_value := coalesce(new.email, '');

  begin
    dob_value := nullif(new.raw_user_meta_data->>'date_of_birth', '')::date;
    if dob_value is not null
       and (dob_value > (current_date - interval '18 years')
            or dob_value < (current_date - interval '110 years')) then
      raise log 'handle_new_user: birth date outside the accepted range for %, left unset', new.id;
      dob_value := null;
    end if;
    if dob_value is not null
       and public.existing_account_for(null, full_name_value, dob_value, new.id) is not null then
      raise log 'handle_new_user: name and birth date match another account for %, left unset', new.id;
      dob_value := null;
    end if;
  exception when others then
    dob_value := null;
  end;

  begin
    insert into public.user_profiles (
      user_id, email, full_name, first_name,
      date_of_birth,
      is_verified, verification_status, is_online,
      profile_visibility, show_online_status,
      bio, interests, distance_preference,
      age_range_min, age_range_max,
      created_at, updated_at
    ) values (
      new.id, email_value, full_name_value,
      split_part(full_name_value, ' ', 1),
      dob_value,
      false, 'not_started', false,
      'public', true,
      '', '{}', 50,
      18, 99,
      now(), now()
    )
    on conflict (user_id) do nothing;
  exception when others then
    raise log 'handle_new_user: user_profiles insert failed for %: %',
      new.id, sqlerrm;
  end;

  return new;
end;
$function$;

-- Age comes from the birth date and from nothing else.
create or replace function public.derive_age_from_birth_date()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  -- Not security definer, so current_user is the caller: 'authenticated' or
  -- 'anon' for a request from the app, the function owner inside
  -- set_my_birth_date() and other server functions, service_role for staff
  -- tools.
  v_from_app boolean := current_user in ('authenticated', 'anon');
begin
  if v_from_app then
    if tg_op = 'INSERT' then
      new.date_of_birth := null;
    elsif new.date_of_birth is distinct from old.date_of_birth then
      -- Only set_my_birth_date() may write it, and only once.
      new.date_of_birth := old.date_of_birth;
    end if;
  end if;

  if new.date_of_birth is not null
     and (new.date_of_birth > (current_date - interval '18 years')
          or new.date_of_birth < (current_date - interval '110 years')) then
    raise exception 'date_of_birth must make the member 18 or over'
      using errcode = '23514';
  end if;

  new.age := case when new.date_of_birth is null then null
                  else extract(year from age(current_date, new.date_of_birth))::integer end;

  if new.date_of_birth is not null then
    if tg_op = 'UPDATE'
       and old.date_of_birth is not null
       and new.date_of_birth is distinct from old.date_of_birth then
      new.date_of_birth_changes := coalesce(old.date_of_birth_changes, 0) + 1;
    end if;
    if new.date_of_birth_set_at is null then
      new.date_of_birth_set_at := now();
    end if;
  end if;

  return new;
end;
$$;

-- Ages typed in with no birth date behind them are not ages.
update public.user_profiles set age = null where date_of_birth is null and age is not null;

-- Birthdays happen. Keep stored ages right; 04:40 UTC daily.
create or replace function public.refresh_member_ages()
returns integer
language sql
security definer
set search_path = public
as $$
  with changed as (
    update public.user_profiles
       set age = extract(year from age(current_date, date_of_birth))::integer
     where date_of_birth is not null
       and age is distinct from extract(year from age(current_date, date_of_birth))::integer
    returning 1
  )
  select count(*)::integer from changed;
$$;
revoke all on function public.refresh_member_ages() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'refresh-member-ages';
select cron.schedule('refresh-member-ages', '40 4 * * *', $$select public.refresh_member_ages();$$);

-- -------------------------------------------- no invented relationship goal

alter table public.user_profiles alter column looking_for drop default;
-- Every row got 'serious' whether or not the member chose it. Clear it so
-- the app asks, once, and shows only what the member actually said.
update public.user_profiles set looking_for = null where looking_for = 'serious';

-- ------------------------------------------------------- profile complete

create or replace function public.my_profile_completion()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'photo',      exists (select 1 from public.user_photos ph where ph.user_id = auth.uid()),
    'birth_date', p.date_of_birth is not null,
    'gender',     p.gender is not null,
    'seeking',    p.seeking is not null,
    'country',    p.country_code is not null,
    'city',       coalesce(nullif(trim(p.location), ''), '') <> '',
    'complete',
      exists (select 1 from public.user_photos ph where ph.user_id = auth.uid())
      and p.date_of_birth is not null
      and p.gender is not null and p.seeking is not null
      and p.country_code is not null
      and coalesce(nullif(trim(p.location), ''), '') <> ''
  )
  from public.user_profiles p
  where p.user_id = auth.uid();
$$;

-- The member's own private fields, which other members can no longer read.
create or replace function public.my_private_profile()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('email', p.email, 'date_of_birth', p.date_of_birth)
  from public.user_profiles p
  where p.user_id = auth.uid();
$$;
revoke all on function public.my_private_profile() from public, anon;
grant execute on function public.my_private_profile() to authenticated;

-- --------------------------------------------------- members see members

create or replace function public.can_see_members()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    public.is_active_staff(auth.uid())
    or exists (
      select 1
      from auth.users u
      join public.user_profiles p on p.user_id = u.id
      where u.id = auth.uid()
        and coalesce(u.is_anonymous, false) = false
        and u.email_confirmed_at is not null
        and coalesce(p.verification_status, '') <> 'deleted'
        and p.date_of_birth is not null
        and p.gender is not null and p.seeking is not null
        and p.country_code is not null
        and coalesce(nullif(trim(p.location), ''), '') <> ''
        and exists (select 1 from public.user_photos ph where ph.user_id = u.id)
    )
  );
$$;
revoke all on function public.can_see_members() from public, anon;
grant execute on function public.can_see_members() to authenticated;

-- Nobody outside sees a member row or a member photo row.
drop policy if exists "Anonymous users can view public profiles" on public.user_profiles;
drop policy if exists "Anonymous users can view public photos" on public.user_photos;
revoke select on public.user_profiles from anon;
revoke select on public.user_photos from anon;

-- Inside, you see your own row always, and other members once you are one.
drop policy if exists "Users can view profiles" on public.user_profiles;
create policy "Users can view profiles" on public.user_profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (profile_visibility = 'public' and (select public.can_see_members()))
  );

drop policy if exists "View user photos" on public.user_photos;
create policy "View user photos" on public.user_photos
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or ((select public.can_see_members())
        and exists (select 1 from public.user_profiles up
                    where up.user_id = user_photos.user_id
                      and (up.profile_visibility is null or up.profile_visibility = 'public')))
  );

-- Other members' email, birth date and coordinates are not theirs to read.
revoke select on public.user_profiles from authenticated;
grant select (
  user_id, full_name, first_name, age, location, bio, interests,
  profile_visibility, is_verified, created_at, updated_at, verification_status,
  occupation, education, looking_for, distance_preference, age_range_min,
  age_range_max, is_online, last_active, show_online_status, gender,
  relationship_status, seeking, country_code, region_code
) on public.user_profiles to authenticated;

-- The old, unused profiles table was readable by anyone.
drop policy if exists "Anyone can view profiles" on public.profiles;
revoke select on public.profiles from anon;
create policy "Members can view profiles" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.can_see_members()));

-- People near you: only for members, and only members with a real age.
create or replace function public.members_near_me(p_limit integer default 12)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_me uuid := auth.uid();
  v_country text;
  v_region text;
  v_seeking text;
  v_gender text;
  v_limit integer := greatest(1, least(coalesce(p_limit, 12), 40));
  v_out jsonb;
begin
  if v_me is null or not public.can_see_members() then
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
    join auth.users u on u.id = p.user_id
    where p.user_id <> v_me
      and coalesce(u.is_anonymous, false) = false
      and coalesce(p.verification_status, '') <> 'deleted'
      and (p.profile_visibility is null or p.profile_visibility = 'public')
      and p.date_of_birth is not null
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
$function$;

-- Applied to production on 2026-09-05. Three related holes.
--
-- 1. PHONE VERIFICATION WAS DECORATIVE.
--    The browser generated the six-digit code, stored it, read it back, and
--    displayed it in an alert whenever Twilio failed. It also wrote
--    phone_verified and user_profiles.is_verified itself. Anyone could award
--    themselves the verified badge without owning the phone number - and on a
--    dating site that badge is part of why someone agrees to meet a stranger.
--
-- 2. AGE WAS ASKED TWICE AND NEITHER ANSWER WAS BINDING.
--    Sign-up collected a date of birth, checked 18+ in the browser, and threw
--    the date away - user_profiles had no column for it. The profile screen
--    then offered a free-typed Age number box. Two questions, two answers,
--    no record.
--
-- 3. COLUMN-LEVEL REVOKES DO NOTHING UNDER A TABLE-LEVEL GRANT.
--    The first attempt at (1) revoked SELECT on otp_code alone. The
--    table-level SELECT still covered it. Table grants are replaced by
--    column lists below.

-- ---------------------------------------------------------------- age

alter table public.user_profiles
  add column if not exists date_of_birth date,
  add column if not exists date_of_birth_set_at timestamptz,
  add column if not exists date_of_birth_changes integer not null default 0;

alter table public.user_profiles drop constraint if exists user_profiles_dob_adult_check;
alter table public.user_profiles add constraint user_profiles_dob_adult_check
  check (
    date_of_birth is null
    or (date_of_birth <= (current_date - interval '18 years')
        and date_of_birth >= (current_date - interval '110 years'))
  );

create or replace function public.derive_age_from_birth_date()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if new.date_of_birth is not null then
    new.age := extract(year from age(current_date, new.date_of_birth))::integer;
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

drop trigger if exists trg_derive_age_from_birth_date on public.user_profiles;
create trigger trg_derive_age_from_birth_date
  before insert or update on public.user_profiles
  for each row execute function public.derive_age_from_birth_date();

-- Write-once. A birth date that can be edited freely is a preference, not a
-- declaration. Anyone who genuinely mistyped theirs contacts support, which
-- leaves a trace.
create or replace function public.set_my_birth_date(p_date date)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_user uuid := auth.uid();
  v_existing date;
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'error', 'not_signed_in');
  end if;

  select date_of_birth into v_existing from public.user_profiles where user_id = v_user;
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

  update public.user_profiles set date_of_birth = p_date, updated_at = now()
   where user_id = v_user;

  return jsonb_build_object('success', true,
    'age', (select age from public.user_profiles where user_id = v_user));
end;
$$;

revoke all on function public.set_my_birth_date(date) from public;
revoke all on function public.set_my_birth_date(date) from anon;
grant execute on function public.set_my_birth_date(date) to authenticated;

-- ------------------------------------------------- verification integrity

create or replace function public.block_self_granted_verification()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if coalesce(current_setting('app.verification_checked', true), '') = '1'
     or auth.role() = 'service_role' then
    return new;
  end if;
  if new.phone_verified is distinct from old.phone_verified then
    raise exception 'phone_verified is set by confirm_phone_verification(), not directly';
  end if;
  if new.verification_status is distinct from old.verification_status then
    raise exception 'verification_status is set by the server, not directly';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_block_self_granted_verification on public.verification_requests;
create trigger trg_block_self_granted_verification
  before update on public.verification_requests
  for each row execute function public.block_self_granted_verification();

create or replace function public.block_self_granted_profile_badge()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if coalesce(current_setting('app.verification_checked', true), '') = '1'
     or auth.role() = 'service_role' then
    return new;
  end if;
  if new.is_verified is distinct from old.is_verified then
    raise exception 'is_verified is awarded by the server, not set by the account';
  end if;
  if new.verification_status is distinct from old.verification_status then
    raise exception 'verification_status is awarded by the server, not set by the account';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_block_self_granted_profile_badge on public.user_profiles;
create trigger trg_block_self_granted_profile_badge
  before update on public.user_profiles
  for each row execute function public.block_self_granted_profile_badge();

create or replace function public.confirm_phone_verification(p_code text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_user uuid := auth.uid();
  v_row public.verification_requests%rowtype;
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'error', 'not_signed_in');
  end if;

  select * into v_row from public.verification_requests where user_id = v_user;
  if not found or v_row.otp_code is null then
    return jsonb_build_object('success', false, 'error', 'no_code_requested');
  end if;
  if v_row.otp_expires_at is not null and v_row.otp_expires_at < now() then
    return jsonb_build_object('success', false, 'error', 'code_expired');
  end if;
  if length(coalesce(p_code,'')) <> length(v_row.otp_code)
     or v_row.otp_code is distinct from p_code then
    return jsonb_build_object('success', false, 'error', 'incorrect_code');
  end if;

  perform set_config('app.verification_checked', '1', true);

  update public.verification_requests
     set phone_verified = true, otp_code = null, otp_expires_at = null, updated_at = now()
   where user_id = v_user;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.confirm_phone_verification(text) from public;
revoke all on function public.confirm_phone_verification(text) from anon;
grant execute on function public.confirm_phone_verification(text) to authenticated;

-- The badge is awarded from the evidence on the row, not because the browser
-- says its checklist looks finished.
create or replace function public.submit_verification()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  v_user uuid := auth.uid();
  v_row public.verification_requests%rowtype;
  v_missing text[] := '{}';
begin
  if v_user is null then
    return jsonb_build_object('success', false, 'error', 'not_signed_in');
  end if;

  select * into v_row from public.verification_requests where user_id = v_user;
  if not found then
    return jsonb_build_object('success', false, 'error', 'nothing_submitted',
                              'missing', to_jsonb(array['selfie','phone']));
  end if;

  if v_row.selfie_url is null or v_row.selfie_url = '' then
    v_missing := v_missing || 'selfie';
  end if;
  if coalesce(v_row.phone_verified, false) is not true then
    v_missing := v_missing || 'phone';
  end if;

  if array_length(v_missing, 1) is not null then
    return jsonb_build_object('success', false, 'error', 'incomplete',
                              'missing', to_jsonb(v_missing));
  end if;

  perform set_config('app.verification_checked', '1', true);

  update public.verification_requests
     set verification_status = 'submitted', submitted_at = now(), updated_at = now()
   where user_id = v_user;

  update public.user_profiles
     set is_verified = true, verification_status = 'verified', updated_at = now()
   where user_id = v_user;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.submit_verification() from public;
revoke all on function public.submit_verification() from anon;
grant execute on function public.submit_verification() to authenticated;

-- ------------------------------------------------------------- grants
--
-- Table-level grants are replaced with column lists. A column-level REVOKE
-- is a no-op while a table-level grant is in force, which is why the first
-- attempt at hiding otp_code changed nothing.

revoke select, insert, update on public.verification_requests from anon;
revoke select, insert, update on public.verification_requests from authenticated;
revoke delete, truncate on public.verification_requests from anon;
revoke delete, truncate on public.verification_requests from authenticated;

grant select (
  id, user_id, full_name, phone_number, address_info,
  government_id_url, selfie_url, address_proof_url,
  verification_status, submitted_at, reviewed_at, reviewed_by,
  rejection_reason, created_at, updated_at, phone_verified
) on public.verification_requests to authenticated;

grant insert (
  user_id, full_name, phone_number, address_info,
  government_id_url, selfie_url, address_proof_url,
  created_at, updated_at
) on public.verification_requests to authenticated;

grant update (
  full_name, phone_number, address_info,
  government_id_url, selfie_url, address_proof_url,
  updated_at
) on public.verification_requests to authenticated;

revoke update on public.user_profiles from anon;
revoke update on public.user_profiles from authenticated;

grant update (
  full_name, first_name, email,
  bio, location, occupation, education, interests,
  looking_for, relationship_status, gender,
  profile_visibility, show_online_status,
  distance_preference, age_range_min, age_range_max,
  is_online, last_active,
  geo_location, location_updated_at, location_accuracy_meters,
  updated_at
) on public.user_profiles to authenticated;

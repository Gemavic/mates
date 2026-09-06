-- handle_new_user built the profile but ignored raw_user_meta_data's
-- date_of_birth, so the one binding question sign-up asked was discarded.
-- Same function, same behaviour on every other field, plus the birth date.
-- A missing, unparseable or under-18 date leaves the column null rather than
-- aborting account creation: refusing here would leave an auth user with no
-- profile at all, which is a worse failure than an unanswered question.
-- Applied to production on 2026-09-05.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
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
    raise log 'handle_new_user: user_profiles insert failed for %: %', new.id, sqlerrm;
  end;

  return new;
end;
$function$;

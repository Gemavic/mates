-- Let histogm@gmail.com be Gbenga's approved second account.
--
-- The "one person, one account" rule stopped this account from saving its
-- date of birth, because it matches mattocanada1@gmail.com (same name and
-- birth date). This adds a short list of accounts the owner has approved as
-- exceptions, and puts only histogm@gmail.com on it. Everyone else is still
-- held to one account.

create table if not exists public.account_duplicate_exemptions (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  reason     text not null,
  created_at timestamptz not null default now()
);
alter table public.account_duplicate_exemptions enable row level security;
-- No policies: members cannot read or change this list. Only the database does.
revoke all on public.account_duplicate_exemptions from anon, authenticated;

insert into public.account_duplicate_exemptions (user_id, reason)
select id, 'Owner''s approved second account'
from auth.users where lower(email) = 'histogm@gmail.com'
on conflict (user_id) do nothing;

create or replace function public.set_my_birth_date(p_date date)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  -- Approved exceptions skip the duplicate check; everyone else does not.
  if not exists (select 1 from public.account_duplicate_exemptions e where e.user_id = v_user) then
    v_found := public.existing_account_for(null, v_name, p_date, v_user);
    if v_found is not null then
      return jsonb_build_object('success', false, 'error', 'duplicate_account',
        'hint', v_found->>'hint', 'method', v_found->>'method',
        'message', 'You already have a Dates.care account. Please sign in to that one instead.');
    end if;
  end if;

  update public.user_profiles
     set date_of_birth = p_date, updated_at = now()
   where user_id = v_user;

  return jsonb_build_object('success', true,
    'age', (select age from public.user_profiles where user_id = v_user));
end;
$function$;


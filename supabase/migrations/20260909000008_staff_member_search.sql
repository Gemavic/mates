-- Staff panel: a real member search, and real numbers on the overview.
--
-- The Users tab used to filter a hard-coded list of four invented people.
-- staff_search_members looks up actual members by name, email or user id.
-- staff_overview_counts replaces the invented "1,234 users / $12,345"
-- with what the tables actually hold.
--
-- Both are security definer and refuse anyone who is not active staff or an
-- admin (public.can_moderate), the same gate the email lookup uses.

create or replace function public.staff_search_members(p_query text default '', p_limit integer default 25)
returns table (
  user_id uuid,
  full_name text,
  email text,
  verification_status text,
  credits integer,
  is_staff boolean,
  is_admin boolean,
  joined_at timestamptz,
  last_active timestamptz,
  deletion_pending boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q text := trim(coalesce(p_query, ''));
  v_like text;
  v_uuid uuid;
  v_limit integer := greatest(1, least(coalesce(p_limit, 25), 50));
begin
  if not public.can_moderate(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if length(v_q) > 120 then
    v_q := left(v_q, 120);
  end if;

  -- % and _ typed by staff are letters to find, not wildcards.
  v_like := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  begin
    v_uuid := v_q::uuid;
  exception when others then
    v_uuid := null;
  end;

  return query
  select
    up.user_id,
    coalesce(nullif(trim(up.full_name), ''), nullif(trim(up.first_name), '')) as full_name,
    up.email,
    up.verification_status,
    coalesce(a.complimentary_credits, 0) + coalesce(a.purchased_credits, 0) as credits,
    coalesce(a.is_staff, false) as is_staff,
    coalesce(a.is_admin, false) as is_admin,
    up.created_at as joined_at,
    up.last_active,
    exists (
      select 1 from public.account_deletion_requests d
      where d.user_id = up.user_id and d.status in ('pending', 'held')
    ) as deletion_pending
  from public.user_profiles up
  left join public.app_credit_accounts a on a.user_id = up.user_id
  where v_q = ''
     or up.user_id = v_uuid
     or up.full_name ilike v_like escape '\'
     or up.first_name ilike v_like escape '\'
     or up.email ilike v_like escape '\'
  order by
    (up.user_id = v_uuid) desc nulls last,
    (lower(up.email) = lower(v_q)) desc,
    (up.full_name ilike (replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%') escape '\') desc,
    coalesce(up.last_active, up.created_at) desc nulls last
  limit v_limit;
end;
$$;

revoke all on function public.staff_search_members(text, integer) from public, anon;
grant execute on function public.staff_search_members(text, integer) to authenticated;

create or replace function public.staff_overview_counts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_moderate(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'members', (select count(*) from public.user_profiles),
    'verified', (select count(*) from public.user_profiles where verification_status = 'verified' or is_verified = true),
    'joined_7d', (select count(*) from public.user_profiles where created_at >= now() - interval '7 days'),
    'active_7d', (select count(*) from public.user_profiles where last_active >= now() - interval '7 days'),
    'pending_deletions', (select count(*) from public.account_deletion_requests where status in ('pending', 'held')),
    'paid_usd', (select coalesce(sum(amount_usd), 0) from public.app_payment_intents where status = 'finished'),
    'paid_count', (select count(*) from public.app_payment_intents where status = 'finished'),
    'paid_30d_usd', (select coalesce(sum(amount_usd), 0) from public.app_payment_intents where status = 'finished' and created_at >= now() - interval '30 days')
  );
end;
$$;

revoke all on function public.staff_overview_counts() from public, anon;
grant execute on function public.staff_overview_counts() to authenticated;

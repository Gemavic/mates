-- Time-bound, admin-approved free-feature access for staff.
--
-- Design: is_staff (existing flat flag) still just marks "this account is a
-- staff/support account" — it no longer, by itself, grants unlimited free
-- calling/messaging/gifts. Free access to a specific feature now requires
-- an explicit request that a designated admin ("operation manager") has
-- approved, and every approval carries an expiry — nothing is granted
-- indefinitely without a human re-approving it.

-- 1. Admin flag — separate from is_staff. Only settable directly via SQL
--    by the account owner; never exposed through any RPC, so nobody can
--    self-elevate or grant themselves admin through the app.
-- ---------------------------------------------------------------------------
alter table public.app_credit_accounts
  add column if not exists is_admin boolean not null default false;

-- 2. Requests table
-- ---------------------------------------------------------------------------
create table if not exists public.app_staff_access_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  scope          text not null check (scope in ('calling', 'messaging', 'gifts', 'all')),
  reason         text,
  status         text not null default 'pending'
                   check (status in ('pending', 'approved', 'denied', 'revoked')),
  requested_at   timestamptz not null default now(),
  reviewed_by    uuid references auth.users(id),
  reviewed_at    timestamptz,
  duration_days  integer,
  expires_at     timestamptz
);

create index if not exists idx_staff_access_requests_user
  on public.app_staff_access_requests (user_id, scope, status);

alter table public.app_staff_access_requests enable row level security;

drop policy if exists "staff access requests: read own or admin" on public.app_staff_access_requests;
create policy "staff access requests: read own or admin" on public.app_staff_access_requests
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.app_credit_accounts a where a.user_id = auth.uid() and a.is_admin)
  );

-- No direct insert/update policies — all writes go through the RPCs below,
-- which enforce the actual business rules (must be staff to request, must
-- be admin to review) server-side rather than trusting the client.
revoke insert, update, delete on public.app_staff_access_requests from authenticated, anon;

-- 3. RPC: request_staff_access — staff members ask for time-bound free
--    access to a feature. Refuses duplicate pending requests for the same
--    scope, and refuses non-staff accounts entirely.
-- ---------------------------------------------------------------------------
create or replace function public.request_staff_access(p_scope text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_staff boolean;
  v_existing uuid;
begin
  select is_staff into v_is_staff
  from public.app_credit_accounts where user_id = auth.uid();

  if not coalesce(v_is_staff, false) then
    return jsonb_build_object('success', false, 'error', 'not_staff');
  end if;

  if p_scope not in ('calling', 'messaging', 'gifts', 'all') then
    return jsonb_build_object('success', false, 'error', 'invalid_scope');
  end if;

  select id into v_existing
  from public.app_staff_access_requests
  where user_id = auth.uid() and scope = p_scope and status = 'pending'
  limit 1;

  if v_existing is not null then
    return jsonb_build_object('success', false, 'error', 'already_pending', 'request_id', v_existing);
  end if;

  insert into public.app_staff_access_requests (user_id, scope, reason)
  values (auth.uid(), p_scope, p_reason)
  returning id into v_existing;

  return jsonb_build_object('success', true, 'request_id', v_existing);
end;
$$;

grant execute on function public.request_staff_access(text, text) to authenticated;

-- 4. RPC: review_staff_access_request — admin-only approve/deny, with a
--    mandatory expiry on approval. duration_days defaults to 30 and is
--    capped at 90 so nothing can be silently approved "forever".
-- ---------------------------------------------------------------------------
create or replace function public.review_staff_access_request(
  p_request_id uuid,
  p_approve boolean,
  p_duration_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_duration integer;
begin
  select is_admin into v_is_admin
  from public.app_credit_accounts where user_id = auth.uid();

  if not coalesce(v_is_admin, false) then
    return jsonb_build_object('success', false, 'error', 'not_admin');
  end if;

  v_duration := least(greatest(coalesce(p_duration_days, 30), 1), 90);

  update public.app_staff_access_requests
  set status = case when p_approve then 'approved' else 'denied' end,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      duration_days = case when p_approve then v_duration else null end,
      expires_at = case when p_approve then now() + (v_duration || ' days')::interval else null end
  where id = p_request_id and status = 'pending';

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found_or_already_reviewed');
  end if;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.review_staff_access_request(uuid, boolean, integer) to authenticated;

-- 5. RPC: revoke_staff_access — admin can pull an approval early, e.g. if
--    abuse is spotted before the natural expiry.
-- ---------------------------------------------------------------------------
create or replace function public.revoke_staff_access(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  select is_admin into v_is_admin
  from public.app_credit_accounts where user_id = auth.uid();

  if not coalesce(v_is_admin, false) then
    return jsonb_build_object('success', false, 'error', 'not_admin');
  end if;

  update public.app_staff_access_requests
  set status = 'revoked'
  where id = p_request_id and status = 'approved';

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found_or_not_approved');
  end if;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.revoke_staff_access(uuid) to authenticated;

-- 6. Function: has_active_staff_grant — the actual gate other features
--    check. True only while status = 'approved' AND not yet expired.
--    A separate 'all' scope grant also satisfies any specific scope check.
-- ---------------------------------------------------------------------------
create or replace function public.has_active_staff_grant(p_user_id uuid, p_scope text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.app_staff_access_requests
    where user_id = p_user_id
      and status = 'approved'
      and expires_at > now()
      and scope in (p_scope, 'all')
  );
$$;

grant execute on function public.has_active_staff_grant(uuid, text) to authenticated;

-- 7. RPC: my_staff_access_requests — lets a user see their own request
--    history/status without needing admin rights.
-- ---------------------------------------------------------------------------
create or replace function public.my_staff_access_requests()
returns setof public.app_staff_access_requests
language sql
security definer
set search_path = public
stable
as $$
  select * from public.app_staff_access_requests
  where user_id = auth.uid()
  order by requested_at desc;
$$;

grant execute on function public.my_staff_access_requests() to authenticated;

-- 8. RPC: pending_staff_access_requests — admin-only view of everything
--    awaiting a decision, joined with the requester's name for display.
-- ---------------------------------------------------------------------------
create or replace function public.pending_staff_access_requests()
returns table (
  id uuid, user_id uuid, requester_name text, scope text, reason text,
  requested_at timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_is_admin boolean;
begin
  select is_admin into v_is_admin
  from public.app_credit_accounts where user_id = auth.uid();

  if not coalesce(v_is_admin, false) then
    raise exception 'not_admin';
  end if;

  return query
    select r.id, r.user_id, coalesce(p.full_name, 'Unknown'), r.scope, r.reason, r.requested_at
    from public.app_staff_access_requests r
    left join public.user_profiles p on p.user_id = r.user_id
    where r.status = 'pending'
    order by r.requested_at asc;
end;
$$;

grant execute on function public.pending_staff_access_requests() to authenticated;

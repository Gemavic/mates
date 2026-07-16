create table if not exists public.app_dispute_submissions (
  id               bigint generated always as identity primary key,
  reference        text not null unique,
  user_id          uuid references auth.users(id) on delete set null,
  dispute_type     text not null,
  name             text not null,
  email            text not null,
  phone            text,
  incident_date    text,
  description      text not null,
  evidence         text,
  desired_resolution text,
  status           text not null default 'open' check (status in ('open','in_review','resolved','closed')),
  created_at       timestamptz not null default now()
);

create index if not exists idx_disputes_created on public.app_dispute_submissions (created_at desc);
create index if not exists idx_disputes_status on public.app_dispute_submissions (status);

alter table public.app_dispute_submissions enable row level security;

revoke insert, update, delete, select on public.app_dispute_submissions from anon, authenticated;

drop function if exists public.submit_dispute(text, text, text, text, text, text, text, text);
create or replace function public.submit_dispute(
  p_dispute_type text,
  p_name text,
  p_email text,
  p_description text,
  p_phone text default null,
  p_incident_date text default null,
  p_evidence text default null,
  p_desired_resolution text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref text;
begin
  if p_dispute_type is null or length(trim(p_dispute_type)) = 0
     or p_name is null or length(trim(p_name)) = 0
     or p_email is null or length(trim(p_email)) = 0
     or p_description is null or length(trim(p_description)) < 10 then
    return jsonb_build_object('success', false, 'error', 'missing_required_fields');
  end if;

  v_ref := 'DSP-' || to_char(now(), 'YYYYMMDD') || '-' ||
           upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  insert into public.app_dispute_submissions
    (reference, user_id, dispute_type, name, email, phone, incident_date,
     description, evidence, desired_resolution)
  values
    (v_ref, auth.uid(), left(p_dispute_type,100), left(p_name,200), left(p_email,200),
     left(p_phone,50), left(p_incident_date,50), left(p_description,5000),
     left(p_evidence,5000), left(p_desired_resolution,2000));

  return jsonb_build_object('success', true, 'reference', v_ref);
end;
$$;

grant execute on function public.submit_dispute(text, text, text, text, text, text, text, text)
  to anon, authenticated;

drop function if exists public.staff_list_disputes(text);
create or replace function public.staff_list_disputes(p_status text default null)
returns setof public.app_dispute_submissions
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.app_credit_accounts a where a.user_id = auth.uid() and a.is_staff
  ) then
    return;
  end if;

  return query
  select * from public.app_dispute_submissions
  where p_status is null or status = p_status
  order by created_at desc;
end;
$$;

grant execute on function public.staff_list_disputes(text) to authenticated;

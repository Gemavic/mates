create table if not exists public.app_traffic_events (
  id          bigint generated always as identity primary key,
  session_id  text not null,
  user_id     uuid references auth.users(id) on delete set null,
  event_type  text not null check (event_type in ('page_view','signup','ad_click')),
  path        text,
  referrer    text,
  source      text,
  medium      text,
  campaign    text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_app_traffic_created on public.app_traffic_events (created_at desc);
create index if not exists idx_app_traffic_source on public.app_traffic_events (source, created_at desc);
create index if not exists idx_app_traffic_type on public.app_traffic_events (event_type, created_at desc);

alter table public.app_traffic_events enable row level security;

revoke select, insert, update, delete on public.app_traffic_events from anon, authenticated;

drop function if exists public.log_traffic_event(text, text, text, text, text, text, text, jsonb);
create or replace function public.log_traffic_event(
  p_event_type text,
  p_session_id text,
  p_path text default null,
  p_referrer text default null,
  p_source text default null,
  p_medium text default null,
  p_campaign text default null,
  p_meta jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_type not in ('page_view','signup','ad_click') then
    return;
  end if;
  if p_session_id is null or length(p_session_id) < 8 or length(p_session_id) > 64 then
    return;
  end if;

  insert into public.app_traffic_events
    (session_id, user_id, event_type, path, referrer, source, medium, campaign, meta)
  values (
    p_session_id,
    auth.uid(),
    p_event_type,
    left(p_path, 200),
    left(p_referrer, 300),
    left(coalesce(nullif(p_source,''),'direct'), 100),
    left(p_medium, 100),
    left(p_campaign, 150),
    p_meta
  );
end;
$$;

grant execute on function public.log_traffic_event(text, text, text, text, text, text, text, jsonb)
  to anon, authenticated;

drop function if exists public.staff_traffic_summary(integer);
create or replace function public.staff_traffic_summary(p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_staff boolean;
  v_since timestamptz;
  v_result jsonb;
begin
  select is_staff into v_is_staff
  from public.app_credit_accounts
  where user_id = auth.uid();

  if not coalesce(v_is_staff, false) then
    return jsonb_build_object('error', 'forbidden');
  end if;

  v_since := now() - make_interval(days => greatest(1, least(p_days, 90)));

  select jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'page_views', count(*) filter (where event_type = 'page_view'),
        'unique_sessions', count(distinct session_id),
        'signups', count(*) filter (where event_type = 'signup'),
        'ad_clicks', count(*) filter (where event_type = 'ad_click'),
        'signed_in_views', count(*) filter (where event_type = 'page_view' and user_id is not null)
      )
      from public.app_traffic_events where created_at >= v_since
    ),
    'by_source', (
      select coalesce(jsonb_agg(row_to_json(s)), '[]'::jsonb) from (
        select source,
               count(*) filter (where event_type = 'page_view') as views,
               count(distinct session_id) as sessions,
               count(*) filter (where event_type = 'signup') as signups
        from public.app_traffic_events
        where created_at >= v_since
        group by source
        order by views desc
        limit 15
      ) s
    ),
    'by_day', (
      select coalesce(jsonb_agg(row_to_json(d) order by d.day), '[]'::jsonb) from (
        select date_trunc('day', created_at)::date as day,
               count(*) filter (where event_type = 'page_view') as views,
               count(*) filter (where event_type = 'signup') as signups,
               count(*) filter (where event_type = 'ad_click') as ad_clicks
        from public.app_traffic_events
        where created_at >= now() - interval '14 days'
        group by 1
      ) d
    ),
    'top_pages', (
      select coalesce(jsonb_agg(row_to_json(p)), '[]'::jsonb) from (
        select coalesce(path, '(unknown)') as path,
               count(*) as views,
               count(distinct session_id) as sessions
        from public.app_traffic_events
        where created_at >= v_since and event_type = 'page_view'
        group by 1 order by views desc limit 12
      ) p
    ),
    'ad_positions', (
      select coalesce(jsonb_agg(row_to_json(a)), '[]'::jsonb) from (
        select coalesce(meta->>'position', '(unset)') as position,
               count(*) as clicks
        from public.app_traffic_events
        where created_at >= v_since and event_type = 'ad_click'
        group by 1 order by clicks desc limit 12
      ) a
    ),
    'campaigns', (
      select coalesce(jsonb_agg(row_to_json(c)), '[]'::jsonb) from (
        select coalesce(campaign, '(none)') as campaign,
               coalesce(medium, '') as medium,
               count(*) filter (where event_type = 'page_view') as views,
               count(*) filter (where event_type = 'signup') as signups
        from public.app_traffic_events
        where created_at >= v_since and campaign is not null
        group by 1, 2 order by views desc limit 12
      ) c
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.staff_traffic_summary(integer) to authenticated;

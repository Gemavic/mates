-- Make user_profiles.is_online mean what every screen assumes it means.
--
-- Presence has two readers. The call screens derive "online" from
-- last_active (stamped once a minute by the heartbeat while the app is open;
-- online = seen in the last three minutes). The chat list, discovery and the
-- profile page read the is_online flag - which is set true when a member
-- opens the app and only set false by a best-effort "page is closing" hook
-- that mobile browsers rarely fire. Result on the live site tonight: ten
-- members flagged online, nine of them gone for hours, one actually here.
-- The chat list showed six green dots; the call screen, correctly, showed
-- everyone offline.
--
-- Sweep the flag from the server every minute using the same three-minute
-- window the call screens use, so both readers agree to within a minute.
-- The heartbeat keeps setting it true for anyone actually present.

create or replace function public.sweep_presence()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.user_profiles
  set is_online = false
  where is_online
    and (last_active is null or last_active < now() - interval '3 minutes');
  get diagnostics v_n = row_count;

  update public.user_profiles
  set is_online = true
  where not coalesce(is_online, false)
    and last_active >= now() - interval '3 minutes';

  return v_n;
end;
$$;

revoke all on function public.sweep_presence() from public, anon, authenticated;
grant execute on function public.sweep_presence() to service_role;

select cron.schedule('presence-sweep', '* * * * *', 'select public.sweep_presence();');

-- Run it once now so the site is right before the first tick.
select public.sweep_presence();

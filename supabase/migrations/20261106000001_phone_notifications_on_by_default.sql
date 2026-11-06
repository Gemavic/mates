-- Phone notifications for new messages and likes, on by default.
--
-- Members reported that nothing told them about a new message or like once
-- they had left Dates.care. Only calls and Care Blog articles ever sent a
-- push notification. This adds the two missing ones.
--
--  * user_notification_settings gets push_messages and push_likes, both
--    default TRUE: everyone is on unless they switch it off in Settings.
--  * After a message or a like is saved, the database asks
--    https://dates.care/api/notify-event to notify the recipient, using the
--    same Vault key the Care Blog notifier already uses. The website decides
--    whether to send (recipient away, setting on, not a burst, not a "pass").
--  * A failure to notify never blocks the message or like itself.

alter table public.user_notification_settings
  add column if not exists push_messages boolean not null default true,
  add column if not exists push_likes boolean not null default true;

create or replace function public.notify_member_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key  text;
  v_type text;
begin
  if tg_table_name = 'mail_messages' then
    v_type := 'message';
  elsif tg_table_name = 'user_likes' then
    if new.like_type = 'pass' then return new; end if;
    v_type := 'like';
  else
    return new;
  end if;

  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'article_notify_key';
  if v_key is null then return new; end if;

  perform net.http_post(
    url := 'https://dates.care/api/notify-event',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-key', v_key),
    body := jsonb_build_object('type', v_type, 'id', new.id),
    timeout_milliseconds := 15000
  );
  return new;
exception when others then
  raise warning 'notify_member_event failed: %', sqlerrm;
  return new;
end;
$$;

revoke all on function public.notify_member_event() from public, anon, authenticated;

drop trigger if exists notify_member_on_message on public.mail_messages;
create trigger notify_member_on_message
  after insert on public.mail_messages
  for each row execute function public.notify_member_event();

drop trigger if exists notify_member_on_like on public.user_likes;
create trigger notify_member_on_like
  after insert on public.user_likes
  for each row execute function public.notify_member_event();

-- Check: should list both new columns and both triggers.
select
  (select string_agg(column_name, ', ') from information_schema.columns
    where table_schema = 'public' and table_name = 'user_notification_settings'
      and column_name in ('push_messages', 'push_likes')) as new_columns,
  (select string_agg(tgname, ', ') from pg_trigger
    where tgname in ('notify_member_on_message', 'notify_member_on_like')) as new_triggers;

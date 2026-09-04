-- A person's avatar is resolved from user_photos.is_primary in a dozen places,
-- almost all of them with a bare .eq('is_primary', true). That works only for
-- as long as exactly one row per user carries the flag, and nothing was
-- guaranteeing it. Deleting your main photo removed the only flagged row and
-- nothing promoted a replacement, so the account still had photographs but
-- every lookup came back empty and the person vanished behind a placeholder.
-- Applied to production on 2026-09-04.

create or replace function public.ensure_one_primary_photo()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid := coalesce(new.user_id, old.user_id);
  v_primaries integer;
begin
  select count(*) into v_primaries
  from public.user_photos where user_id = v_user and is_primary;

  if v_primaries = 1 then
    return null;
  end if;

  if v_primaries = 0 then
    update public.user_photos set is_primary = true
    where id = (
      select id from public.user_photos where user_id = v_user
      order by display_order asc nulls last, created_at asc limit 1
    );
  else
    update public.user_photos set is_primary = false
    where user_id = v_user and is_primary
      and id <> (
        select id from public.user_photos where user_id = v_user and is_primary
        order by display_order asc nulls last, created_at desc limit 1
      );
  end if;

  return null;
end;
$$;

drop trigger if exists trg_ensure_one_primary_photo on public.user_photos;
create trigger trg_ensure_one_primary_photo
  after insert or update or delete on public.user_photos
  for each row execute function public.ensure_one_primary_photo();

update public.user_photos p set is_primary = true
where p.id = (
  select id from public.user_photos q where q.user_id = p.user_id
  order by display_order asc nulls last, created_at asc limit 1
)
and not exists (
  select 1 from public.user_photos r where r.user_id = p.user_id and r.is_primary
);

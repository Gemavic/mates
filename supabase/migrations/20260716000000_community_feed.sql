create table if not exists public.app_posts (
  id           bigint generated always as identity primary key,
  author_id    uuid not null references auth.users(id) on delete cascade,
  caption      text,
  media        jsonb not null default '[]'::jsonb,
  is_exclusive boolean not null default false,
  unlock_cost  integer not null default 50 check (unlock_cost between 0 and 500),
  created_at   timestamptz not null default now()
);

create index if not exists idx_app_posts_created on public.app_posts (created_at desc);
create index if not exists idx_app_posts_author on public.app_posts (author_id, created_at desc);

create table if not exists public.app_post_unlocks (
  post_id    bigint not null references public.app_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.app_posts enable row level security;
alter table public.app_post_unlocks enable row level security;
revoke select, insert, update, delete on public.app_posts from anon, authenticated;
revoke select, insert, update, delete on public.app_post_unlocks from anon, authenticated;

drop function if exists public.create_post(text, jsonb, boolean, integer);
create or replace function public.create_post(
  p_caption text,
  p_media jsonb,
  p_is_exclusive boolean default false,
  p_unlock_cost integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_id bigint;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_signed_in');
  end if;
  if p_media is null or jsonb_typeof(p_media) <> 'array' then
    return jsonb_build_object('success', false, 'error', 'bad_media');
  end if;
  v_count := jsonb_array_length(p_media);
  if v_count > 6 then
    return jsonb_build_object('success', false, 'error', 'too_many_photos');
  end if;
  if v_count = 0 and (p_caption is null or length(trim(p_caption)) = 0) then
    return jsonb_build_object('success', false, 'error', 'empty_post');
  end if;

  insert into public.app_posts (author_id, caption, media, is_exclusive, unlock_cost)
  values (
    auth.uid(),
    left(p_caption, 1000),
    p_media,
    coalesce(p_is_exclusive, false),
    greatest(0, least(coalesce(p_unlock_cost, 50), 500))
  )
  returning id into v_id;

  return jsonb_build_object('success', true, 'post_id', v_id);
end;
$$;

grant execute on function public.create_post(text, jsonb, boolean, integer) to authenticated;

drop function if exists public.unlock_post(bigint);
create or replace function public.unlock_post(p_post_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.app_posts%rowtype;
  v_spend jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_signed_in');
  end if;

  select * into v_post from public.app_posts where id = p_post_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'not_found');
  end if;

  if not v_post.is_exclusive
     or v_post.author_id = auth.uid()
     or exists (select 1 from public.app_post_unlocks where post_id = p_post_id and user_id = auth.uid())
  then
    return jsonb_build_object('success', true, 'charged', 0, 'media', v_post.media);
  end if;

  v_spend := public.spend_credits(v_post.unlock_cost, 'post_unlock', p_post_id::text);
  if coalesce((v_spend->>'success')::boolean, false) is not true then
    return v_spend;
  end if;

  insert into public.app_post_unlocks (post_id, user_id)
  values (p_post_id, auth.uid())
  on conflict do nothing;

  return jsonb_build_object('success', true,
    'charged', v_spend->'charged',
    'total_credits', v_spend->'total_credits',
    'media', v_post.media);
end;
$$;

grant execute on function public.unlock_post(bigint) to authenticated;

drop function if exists public.get_feed(integer, bigint);
create or replace function public.get_feed(
  p_limit integer default 10,
  p_before bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'not_signed_in');
  end if;

  select coalesce(jsonb_agg(row_to_json(f)), '[]'::jsonb) into v_result
  from (
    select
      p.id,
      p.caption,
      p.is_exclusive,
      p.unlock_cost,
      p.created_at,
      p.author_id,
      coalesce(pr.full_name, pr.first_name, 'Member') as author_name,
      coalesce(up.photo_url, pr.photo_url) as author_photo,
      (p.author_id = auth.uid()) as is_own,
      (p.author_id = auth.uid()
        or not p.is_exclusive
        or exists (select 1 from public.app_post_unlocks u
                   where u.post_id = p.id and u.user_id = auth.uid())
      ) as unlocked,
      jsonb_array_length(p.media) as media_count,
      case
        when p.author_id = auth.uid()
          or not p.is_exclusive
          or exists (select 1 from public.app_post_unlocks u
                     where u.post_id = p.id and u.user_id = auth.uid())
        then p.media
        else '[]'::jsonb
      end as media
    from public.app_posts p
    left join public.user_profiles pr on pr.user_id = p.author_id
    left join public.user_photos up on up.user_id = p.author_id and up.is_primary = true
    where (p_before is null or p.id < p_before)
    order by p.id desc
    limit greatest(1, least(coalesce(p_limit, 10), 30))
  ) f;

  return jsonb_build_object('posts', v_result);
end;
$$;

grant execute on function public.get_feed(integer, bigint) to authenticated;

insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

drop policy if exists "post media upload own folder" on storage.objects;
create policy "post media upload own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "post media public read" on storage.objects;
create policy "post media public read"
  on storage.objects for select to public
  using (bucket_id = 'post-media');

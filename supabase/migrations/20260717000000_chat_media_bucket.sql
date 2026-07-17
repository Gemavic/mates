insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

drop policy if exists "chat media upload own folder" on storage.objects;
create policy "chat media upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "chat media read" on storage.objects;
create policy "chat media read" on storage.objects for select to public
  using (bucket_id = 'chat-media');

drop policy if exists "chat media delete own" on storage.objects;
create policy "chat media delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'chat-media' and (storage.foldername(name))[1] = auth.uid()::text);

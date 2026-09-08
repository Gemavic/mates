-- Trigger functions and PostGIS internals are not an API. Nothing calls them
-- over /rest/v1/rpc, so nothing should be able to. (Supabase security
-- advisor: anon/authenticated could execute SECURITY DEFINER functions.)
revoke execute on function public.block_self_granted_profile_badge() from public, anon, authenticated;
revoke execute on function public.block_self_granted_verification() from public, anon, authenticated;
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'st_estimatedextent'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

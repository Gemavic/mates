-- The blog is reachable without signing in, but published articles were
-- readable only by authenticated members, so a visitor saw an error state.
drop policy if exists "Anyone can view published articles" on public.blog_articles;
create policy "Anyone can view published articles" on public.blog_articles
  for select to anon, authenticated using (published = true);

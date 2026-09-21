-- SEYEON KIM portfolio admin setup
-- Run once in Supabase SQL Editor.
insert into storage.buckets (id,name,public) values ('portfolio','portfolio',true) on conflict (id) do update set public=true;
alter table public.works add column if not exists detail_images jsonb default '[]'::jsonb;
alter table public.works add column if not exists meta jsonb default '{}'::jsonb;
alter table public.works enable row level security;
drop policy if exists "works public read" on public.works;create policy "works public read" on public.works for select to anon,authenticated using (true);
drop policy if exists "works admin insert" on public.works;create policy "works admin insert" on public.works for insert to authenticated with check (true);
drop policy if exists "works admin update" on public.works;create policy "works admin update" on public.works for update to authenticated using (true) with check (true);
drop policy if exists "works admin delete" on public.works;create policy "works admin delete" on public.works for delete to authenticated using (true);
drop policy if exists "portfolio public read" on storage.objects;create policy "portfolio public read" on storage.objects for select to public using (bucket_id='portfolio');
drop policy if exists "portfolio admin upload" on storage.objects;create policy "portfolio admin upload" on storage.objects for insert to authenticated with check (bucket_id='portfolio');
drop policy if exists "portfolio admin update" on storage.objects;create policy "portfolio admin update" on storage.objects for update to authenticated using (bucket_id='portfolio') with check (bucket_id='portfolio');
drop policy if exists "portfolio admin delete" on storage.objects;create policy "portfolio admin delete" on storage.objects for delete to authenticated using (bucket_id='portfolio');
-- Expand the work category constraint to include photography / retouching.
do $
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid='public.works'::regclass
      and contype='c'
      and pg_get_constraintdef(oid) ilike '%category%'
  loop
    execute format('alter table public.works drop constraint if exists %I', r.conname);
  end loop;
end $;
alter table public.works
  add constraint works_category_check
  check (category in ('banner','detail','blog','social','video','ai','photo','web'));

-- After running this SQL, create the admin login in Supabase Dashboard > Authentication > Users > Add user.
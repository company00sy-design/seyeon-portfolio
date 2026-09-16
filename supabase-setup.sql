-- SEYEON KIM portfolio admin setup
-- Run once in Supabase SQL Editor.

-- Storage bucket for portfolio images.
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do update set public = true;

-- Detail image URLs live with each work.
alter table public.works
  add column if not exists detail_images jsonb default '[]'::jsonb;

-- Works: authenticated admin users can manage rows; public visitors can read.
alter table public.works enable row level security;

drop policy if exists "works public read" on public.works;
create policy "works public read"
on public.works for select
to anon, authenticated
using (true);

drop policy if exists "works admin insert" on public.works;
create policy "works admin insert"
on public.works for insert
to authenticated
with check (true);

drop policy if exists "works admin update" on public.works;
create policy "works admin update"
on public.works for update
to authenticated
using (true)
with check (true);

drop policy if exists "works admin delete" on public.works;
create policy "works admin delete"
on public.works for delete
to authenticated
using (true);

-- Storage: public can view portfolio images; signed-in admin can upload/update/delete.
drop policy if exists "portfolio public read" on storage.objects;
create policy "portfolio public read"
on storage.objects for select
to public
using (bucket_id = 'portfolio');

drop policy if exists "portfolio admin upload" on storage.objects;
create policy "portfolio admin upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'portfolio');

drop policy if exists "portfolio admin update" on storage.objects;
create policy "portfolio admin update"
on storage.objects for update
to authenticated
using (bucket_id = 'portfolio')
with check (bucket_id = 'portfolio');

drop policy if exists "portfolio admin delete" on storage.objects;
create policy "portfolio admin delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'portfolio');

-- After running this SQL, create the admin login in:
-- Supabase Dashboard > Authentication > Users > Add user.

-- AUREN account favourites
-- Stores a small snapshot so saved cards remain available even if listing data changes.
-- Apply this migration to the intended Supabase environment before enabling cloud sync.

create table if not exists public.property_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null,
  property_data jsonb not null check (jsonb_typeof(property_data) = 'object'),
  created_at timestamptz not null default now(),
  constraint property_favorites_user_property_unique unique (user_id, property_id)
);

create index if not exists property_favorites_user_created_idx
  on public.property_favorites (user_id, created_at desc);

alter table public.property_favorites enable row level security;

revoke all on public.property_favorites from anon, authenticated;
grant select, insert, delete on public.property_favorites to authenticated;
grant all on public.property_favorites to service_role;

drop policy if exists "Users view own property favourites" on public.property_favorites;
create policy "Users view own property favourites"
  on public.property_favorites
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users add own property favourites" on public.property_favorites;
create policy "Users add own property favourites"
  on public.property_favorites
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users remove own property favourites" on public.property_favorites;
create policy "Users remove own property favourites"
  on public.property_favorites
  for delete to authenticated
  using ((select auth.uid()) = user_id);

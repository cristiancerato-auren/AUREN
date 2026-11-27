-- AUREN visual site editor settings. Public can read published design config; only admins may write.
create table if not exists public.site_settings (
  setting_key text primary key,
  setting_value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.site_settings enable row level security;

revoke all on table public.site_settings from public, anon, authenticated;
grant select on table public.site_settings to anon, authenticated;
grant insert, update on table public.site_settings to authenticated;

drop policy if exists "Public can read site design settings" on public.site_settings;
create policy "Public can read site design settings"
on public.site_settings for select
to anon, authenticated
using (setting_key = 'homepage');

drop policy if exists "Admins can insert site design settings" on public.site_settings;
create policy "Admins can insert site design settings"
on public.site_settings for insert
to authenticated
with check (
  setting_key = 'homepage'
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.account_type = 'admin')
  and jsonb_typeof(setting_value) = 'object'
);

drop policy if exists "Admins can update site design settings" on public.site_settings;
create policy "Admins can update site design settings"
on public.site_settings for update
to authenticated
using (
  setting_key = 'homepage'
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.account_type = 'admin')
)
with check (
  setting_key = 'homepage'
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.account_type = 'admin')
  and jsonb_typeof(setting_value) = 'object'
);

create index if not exists site_settings_updated_at_idx on public.site_settings (updated_at desc);

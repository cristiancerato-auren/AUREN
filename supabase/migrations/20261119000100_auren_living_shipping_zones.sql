-- AUREN Living: editable fixed shipping tariffs by geographic area.
-- Rates intentionally start unset and disabled; configure real carrier prices in admin before enabling checkout.
create table if not exists public.living_shipping_zones (
  zone_key text primary key check (zone_key in (
    'italia','europa','regno_unito_svizzera','america','asia_oceania','resto_mondo'
  )),
  zone_name text not null,
  rate_eur numeric(10,2) check (rate_eur is null or (rate_eur >= 0 and rate_eur <= 1000)),
  active boolean not null default false,
  sort_order integer not null,
  updated_at timestamptz not null default now()
);

insert into public.living_shipping_zones(zone_key,zone_name,rate_eur,active,sort_order)
values
 ('italia','Italia',null,false,1),
 ('europa','Europa',null,false,2),
 ('regno_unito_svizzera','Regno Unito e Svizzera',null,false,3),
 ('america','America',null,false,4),
 ('asia_oceania','Asia e Oceania',null,false,5),
 ('resto_mondo','Resto del mondo',null,false,6)
on conflict (zone_key) do nothing;

alter table public.living_shipping_zones enable row level security;
revoke all on public.living_shipping_zones from anon, authenticated;
grant select, update on public.living_shipping_zones to authenticated;
grant all on public.living_shipping_zones to service_role;

drop policy if exists "Admins manage AUREN shipping zones" on public.living_shipping_zones;
create policy "Admins manage AUREN shipping zones"
on public.living_shipping_zones for all to authenticated
using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'admin'
))
with check (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'admin'
));

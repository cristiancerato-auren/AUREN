-- AUREN Supabase security foundation
-- Apply in Supabase SQL Editor after reviewing. Safe to re-run for policies/triggers.
create extension if not exists pgcrypto;

alter table public.properties
  add column if not exists image_url text;

-- Public listing access is limited to approved listings.
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.services enable row level security;
alter table public.service_requests enable row level security;

-- Remove earlier policies so this migration can be reapplied consistently.
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can update own profile fields" on public.profiles;
drop policy if exists "Public can view published properties" on public.properties;
drop policy if exists "Users can create own properties" on public.properties;
drop policy if exists "Users can create pending own properties" on public.properties;
drop policy if exists "Owners can update pending properties" on public.properties;
drop policy if exists "Owners can update pending property details" on public.properties;
drop policy if exists "Public can view active services" on public.services;
drop policy if exists "Users can view own service requests" on public.service_requests;
drop policy if exists "Visitors can submit service requests" on public.service_requests;
drop policy if exists "Authenticated users can submit service requests" on public.service_requests;

-- A profile is created automatically for each new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'private'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Prevent a signed-in user from granting themselves elevated roles.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and new.account_type is distinct from old.account_type then
    raise exception 'Account type changes require administrator approval';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger
  before update on public.profiles
  for each row execute procedure public.protect_profile_role();

-- Profiles: each user can read/update their own profile, but cannot self-promote.
create policy "Users can view own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "Users can update own profile fields"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Limit profile edits to the display name; role/identity columns remain server-controlled.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Listings: public can only read published listings.
create policy "Public can view published properties"
on public.properties for select to anon, authenticated
using (status = 'published');

create policy "Users can create pending own properties"
on public.properties for insert to authenticated
with check (
  (select auth.uid()) = owner_id
  and status = 'pending'
);

create policy "Owners can update pending property details"
on public.properties for update to authenticated
using (
  (select auth.uid()) = owner_id
  and status = 'pending'
)
with check (
  (select auth.uid()) = owner_id
  and status = 'pending'
);

-- Services are public-read only when active; clients cannot edit pricing.
create policy "Public can view active services"
on public.services for select to anon, authenticated
using (active = true);

revoke insert, update, delete on public.services from anon, authenticated;
revoke insert, update, delete on public.profiles from anon;
revoke insert, update, delete on public.properties from anon;

-- Service requests: public visitors may submit contact requests, never read them.
create policy "Visitors can submit service requests"
on public.service_requests for insert to anon, authenticated
with check (
  (nullif(trim(contact_email), '') is not null
   or nullif(trim(contact_phone), '') is not null)
  and (
    user_id is null
    or user_id = (select auth.uid())
  )
);

create policy "Users can view own service requests"
on public.service_requests for select to authenticated
using ((select auth.uid()) = user_id);

revoke select, update, delete on public.service_requests from anon;
revoke update, delete on public.service_requests from authenticated;
grant insert on public.service_requests to anon, authenticated;

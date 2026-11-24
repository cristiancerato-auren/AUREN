-- Security hardening for the existing AUREN portal tables.
-- Apply only in an isolated Supabase staging project after review.

-- Prevent users from promoting themselves to admin through their own profile.
drop policy if exists "Users can update own profile fields" on public.profiles;
create policy "Users can update own profile fields"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- Visitors may submit a new request, but cannot choose its workflow state
-- or reference an inactive/nonexistent Studio service.
drop policy if exists "Visitors can submit service requests" on public.service_requests;
create policy "Visitors can submit service requests"
on public.service_requests for insert to anon, authenticated
with check (
  status = 'pending'
  and ((user_id is null) or user_id = (select auth.uid()))
  and (
    nullif(trim(contact_email), '') is not null
    or nullif(trim(contact_phone), '') is not null
  )
  and length(coalesce(notes, '')) <= 5000
  and (
    service_id is null
    or exists (
      select 1 from public.services s
      where s.id = service_id and s.active = true
    )
  )
);

-- Avoid collecting the same newsletter address repeatedly with case variants.
create unique index if not exists newsletter_subscribers_email_lower_uidx
on public.newsletter_subscribers (lower(trim(email)));

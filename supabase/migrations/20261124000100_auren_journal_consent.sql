-- AUREN Journal: record explicit newsletter consent without retroactively
-- pretending that existing subscribers supplied consent through the new form.
alter table public.newsletter_subscribers
  add column if not exists consent_at timestamptz,
  add column if not exists consent_version text;

create or replace function public.stamp_newsletter_consent()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if new.consent_version is null or new.consent_version <> '2026-11-24' then
    raise exception 'Consenso newsletter non valido';
  end if;
  new.consent_at := now();
  return new;
end;
$$;

drop trigger if exists newsletter_subscribers_stamp_consent on public.newsletter_subscribers;
create trigger newsletter_subscribers_stamp_consent
before insert on public.newsletter_subscribers
for each row execute function public.stamp_newsletter_consent();

drop policy if exists "Anyone can subscribe to newsletter" on public.newsletter_subscribers;
create policy "Anyone can subscribe to newsletter"
on public.newsletter_subscribers
for insert to anon, authenticated
with check (
  length(trim(email)) between 5 and 254
  and position('@' in email) > 1
  and consent_version = '2026-11-24'
  and consent_at is not null
);

revoke all on function public.stamp_newsletter_consent() from public, anon, authenticated;

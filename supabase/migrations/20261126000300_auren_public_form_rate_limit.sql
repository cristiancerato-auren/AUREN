-- AUREN: basic database-side throttling for public Studio contact requests.
-- This is additive and is NOT applied to the live database until the release is approved.
-- Three requests sharing an email, phone number, or authenticated user are allowed per rolling 10-minute window.

create or replace function public.enforce_service_request_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_email text := lower(nullif(trim(new.contact_email), ''));
  v_phone text := nullif(regexp_replace(coalesce(new.contact_phone, ''), '[^0-9]', '', 'g'), '');
  v_recent_count integer;
begin
  if v_email is not null then
    perform pg_advisory_xact_lock(hashtext('auren:email:' || v_email)::bigint);
  end if;
  if v_phone is not null then
    perform pg_advisory_xact_lock(hashtext('auren:phone:' || v_phone)::bigint);
  end if;
  if new.user_id is not null then
    perform pg_advisory_xact_lock(hashtext('auren:user:' || new.user_id::text)::bigint);
  end if;

  select count(*)
    into v_recent_count
  from public.service_requests sr
  where sr.created_at >= now() - interval '10 minutes'
    and (
      (v_email is not null and lower(nullif(trim(sr.contact_email), '')) = v_email)
      or (v_phone is not null and nullif(regexp_replace(coalesce(sr.contact_phone, ''), '[^0-9]', '', 'g'), '') = v_phone)
      or (new.user_id is not null and sr.user_id = new.user_id)
    );

  if v_recent_count >= 3 then
    raise exception 'Too many service requests. Please wait before trying again.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_service_request_rate_limit() from public, anon, authenticated;

drop trigger if exists enforce_service_request_rate_limit on public.service_requests;
create trigger enforce_service_request_rate_limit
before insert on public.service_requests
for each row
execute function public.enforce_service_request_rate_limit();

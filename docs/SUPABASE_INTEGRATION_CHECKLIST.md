# AUREN — Supabase integration checklist

This repository is a static GitHub Pages site. The account screen is an initial authentication interface; it is not yet a complete customer dashboard. Do not treat the current website as production-ready for listings, customer data, service orders, or payments.

## Before applying the migration

The migration at `supabase/migrations/20261023000100_auren_security.sql` assumes the following existing schema. Check these in the Supabase Table Editor first; stop and adapt the migration if any name or type differs.

- `public.profiles`: `id`, `full_name`, `account_type`
- `public.properties`: `owner_id`, `status`; the migration adds `image_url`
- `public.services`: `active`
- `public.service_requests`: `contact_email`, `contact_phone`, `user_id`

The policies also assume listing status values `pending` and `published`. Do not execute the migration against a live database until the schema and existing policies have been reviewed and a backup/rollback plan exists.

## Configure authentication

1. In Supabase Authentication settings, set the production Site URL to `https://aurenliving.it`.
2. Add `https://aurenliving.it/account.html` to the allowed redirect URLs. Add any separate GitHub Pages preview URL only if it is needed.
3. Decide whether email confirmation is required and configure SMTP/deliverability before inviting real customers.
4. Keep only the public publishable/anon key in browser code. Never place a `service_role` key, database password, or other secret in this repository or any HTML/JavaScript asset.

## Required acceptance tests

- Register with a test email; confirm the email if required; sign in and sign out.
- Confirm a user can read only their own profile and can update only `full_name`, not `account_type` or any future role/admin fields.
- Confirm anonymous users can read only published properties and active services.
- Confirm a signed-in user can create a pending listing only for their own `owner_id`, and cannot publish it by changing `status`.
- Confirm an anonymous visitor can submit a service request only with an email or phone, and cannot read, update, or delete service requests.
- Repeat the migration in a disposable test project to verify it is rerunnable before considering a production application.

## Still not implemented

- Homepage listings are illustrative browser-side data; the listing form does not persist to Supabase.
- The service request form does not submit to the database or notify the AUREN team.
- No admin review/publishing screen exists yet. A pending listing cannot be approved through the site.
- Prices are demo values; admin price management, checkout, payment processing, file uploads, and production email notifications are not connected.

The repository static checks verify JavaScript syntax and selected SQL safety invariants only. They do not execute SQL against PostgreSQL, test Supabase Auth end-to-end, or verify payment flows.

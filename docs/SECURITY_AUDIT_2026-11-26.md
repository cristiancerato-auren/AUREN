# AUREN — security audit snapshot
Date: 26 November 2026

## Verified on the live Supabase project
- Project status: ACTIVE_HEALTHY; PostgreSQL 17.
- RLS is enabled on all six exposed portal tables: profiles, properties, property_images, service_requests, services and newsletter_subscribers.
- Public profile reads are revoked; authenticated users can read their own profile and update only full_name/phone.
- Property submissions are owner-scoped and start as pending; public reads are restricted to published properties.
- Property image metadata reads are owner-scoped or tied to published properties.
- Public Studio requests must be pending, include an email or phone, keep notes within 5,000 characters, and reference only an active service.
- The live database hardening migration `20261126000100_auren_live_security_least_privilege.sql` was applied separately and is versioned in this repository.
- No property rows, newsletter subscribers, or Storage objects existed at the time of the audit.

## Prepared, not yet live
- `20261126000200_auren_private_property_storage.sql` makes the image bucket private, restricts uploads to JPG/PNG/WebP up to 5 MB, and permits signed image access only to published listings or the owner/admin.
- `20261126000300_auren_public_form_rate_limit.sql` adds database-side throttling of three Studio requests per email, phone, or authenticated user in a rolling 10-minute window, with transaction advisory locks to avoid concurrent bypass.
- Frontend pages now create expiring signed URLs for stored images.
- Netlify static-hosting configuration and security headers are prepared in `netlify.toml` and `_headers`.
- The frontend Supabase SDK is pinned to `2.119.2`.
- Account UI requires 12-character passwords for signup and password recovery. This is a client-side validation until the server-side Auth policy is verified in the Supabase Dashboard.

## Current warnings and limitations
- Supabase Security Advisor reports one warning: leaked-password protection is disabled. Supabase currently gates that control behind a paid plan; do not upgrade solely for this warning if the goal is zero cost.
- Performance Advisor reports multiple permissive RLS policies and five unused indexes. These are performance observations, not confirmed security vulnerabilities; do not remove indexes or consolidate policies without regression tests.
- The live Storage bucket remains public until the private-storage migration is coordinated with the new frontend deployment. Do not apply that migration while the current production frontend still expects public URLs.
- Auth email-confirmation and MFA settings were not readable through the connected tools; verify them in the Supabase Dashboard.
- This is a code/database review, not a penetration test or independent certification.

## Not enabled
- No Supabase Pro, Netlify paid plan, Resend paid plan, or new hosting subscription.
- No real Stripe checkout, commerce schema, or commerce Edge Functions deployed.
- No DNS change, merge into `main`, or production cutover.

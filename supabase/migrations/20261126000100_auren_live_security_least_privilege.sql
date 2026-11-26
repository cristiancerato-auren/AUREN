-- AUREN live security hardening applied on 2026-11-26.
-- Least-privilege grants and constrained public service requests.
-- Idempotent DDL; no application rows are changed.

REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
ON TABLE public.profiles, public.properties, public.property_images,
         public.service_requests, public.newsletter_subscribers
FROM PUBLIC, anon, authenticated;

REVOKE SELECT ON TABLE public.profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name, phone) ON TABLE public.profiles TO authenticated;

REVOKE INSERT ON TABLE public.property_images FROM anon;

DROP POLICY IF EXISTS "Visitors can submit service requests" ON public.service_requests;
CREATE POLICY "Visitors can submit service requests"
ON public.service_requests
FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND (user_id IS NULL OR user_id = (SELECT auth.uid()))
  AND (
    NULLIF(TRIM(contact_email), '') IS NOT NULL
    OR NULLIF(TRIM(contact_phone), '') IS NOT NULL
  )
  AND length(coalesce(notes, '')) <= 5000
  AND (
    service_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_id AND s.active = true
    )
  )
);

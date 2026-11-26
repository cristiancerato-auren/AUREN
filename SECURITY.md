# Security policy — AUREN

## Current deployment status

The published GitHub Pages site on `main` is a static website. The separate `auren-living-development` branch contains Supabase-backed account, property, service-request and newsletter integrations, plus prepared Living commerce code. That branch is still a draft and is not the production deployment.

The Supabase portal schema is active, but the Living commerce migrations and the prepared Edge Functions have not been deployed to the live project. Stripe checkout and transactional email are not active. Do not accept real payments or treat the development checkout as operational.

**Do not enter payment-card details or confidential information into any development or demo form.** Do not publish real customer data until the deployment, privacy, access-control and operational checks are complete.

## Reporting a security issue

Please report suspected vulnerabilities privately to **hello@aurenliving.it** with the affected URL, steps to reproduce, and a brief impact description. Avoid including real personal data or exploiting the issue beyond what is needed to demonstrate it. Please allow time for review before publicly disclosing a suspected vulnerability.

## Scope and limitations

The development branch now includes Netlify security headers and a prepared private-storage migration. These headers and storage policies are not active on the current GitHub Pages production site until the branch is deployed and the owner approves the cutover. Automated static checks and database access policies are not an independent penetration test, security audit, legal review, or certification. Before production use, AUREN still needs end-to-end tests with distinct account roles, review of Supabase RLS and Storage policies, verified email delivery, payment-provider testing, backup and rollback validation, and completed privacy, cookie, seller and sales documentation.

Never commit service-role keys, Stripe secrets, Resend API keys, webhook secrets, passwords, or other credentials to the repository or browser code. Store server credentials only in the relevant hosting or Supabase secret manager.

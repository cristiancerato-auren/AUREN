import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const files = {
  index: read("../index.html"),
  properties: read("../properties.html"),
  account: read("../account.html"),
  admin: read("../admin.html"),
  living: read("../living.html"),
  adminLiving: read("../admin-living.html"),
  studio: read("../studio.html"),
  journal: read("../journal.html"),
  privacy: read("../privacy.html"),
  terms: read("../terms.html"),
  live: read("../assets/js/auren-live.js")
};

function checkHtmlScripts(html, filename) {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  let count = 0;
  for (const [, attrs, source] of scripts) {
    if (/\bsrc\s*=/.test(attrs) || !source.trim()) continue;
    new vm.Script(source, {filename: filename + ":inline-" + (++count)});
  }
  assert.ok(count, "No inline scripts checked for " + filename);
  console.log("✓ Inline JavaScript syntax: " + filename);
}
checkHtmlScripts(files.index, "index.html");
checkHtmlScripts(files.properties, "properties.html");
checkHtmlScripts(files.account, "account.html");
checkHtmlScripts(files.admin, "admin.html");
checkHtmlScripts(files.living, "living.html");
checkHtmlScripts(files.adminLiving, "admin-living.html");
checkHtmlScripts(files.studio, "studio.html");
checkHtmlScripts(files.journal, "journal.html");
new vm.Script(files.live, {filename:"assets/js/auren-live.js"});
console.log("✓ Live Supabase integration JavaScript syntax");

assert.match(files.index, /href=["']account\.html["']/i);
assert.match(files.index, /assets\/js\/auren-live\.js/);
assert.match(files.index, /properties\.html/, "Homepage must link to the standalone Properties portal");
assert.match(files.index, /href="properties\.html"[^>]*data-i18n="postBtn"/, "Homepage publish CTA must lead to the real Properties portal");
assert.doesNotMatch(files.index, /id="listingForm"/, "Homepage must not present the browser-only demo listing form");
assert.match(files.live, /priceEl\.replaceChildren/, "Service prices must be rendered without an HTML injection sink");
assert.match(files.properties, /from\(\x27properties\x27\)/, "Properties portal must load live listings");
assert.match(files.properties, /from\(\x27service_requests\x27\)/, "Property inquiries must be stored as service requests");
assert.match(files.properties, /status:\x27pending\x27/, "New property listings must enter moderation as pending");
assert.match(files.properties, /safeImage/, "Property image URLs must be HTTPS validated");
assert.match(files.live, /from\('properties'\)/);
assert.match(files.live, /from\('service_requests'\)/);
assert.match(files.live, /from\('newsletter_subscribers'\)/);
assert.match(files.index, /id="newsletterConsent"[^>]*required/, "Homepage newsletter must require explicit consent");
assert.match(files.live, /consent_version:\s*'2026-11-24'/, "Homepage newsletter must persist the consent version required by the database");
assert.match(files.account, /signInWithPassword/);
assert.match(files.account, /signUp/);
assert.match(files.account, /from\('living_orders'\)/, "Account must load customer orders through Supabase RLS");
assert.match(files.account, /from\('living_order_items'\)/, "Account must load order line items through Supabase RLS");
assert.match(files.account, /ordersPanel/, "Account must render the order history panel");
assert.match(files.admin, /account_type/);
const portalSecurityMigration = read("../supabase/migrations/20261124000200_auren_portal_security_hardening.sql");
const liveSecurityMigration = read("../supabase/migrations/20261126000100_auren_live_security_least_privilege.sql");
assert.match(liveSecurityMigration, /revoke truncate, references, trigger, maintain/i, "Public roles must not retain destructive or trigger-level table privileges");
assert.match(liveSecurityMigration, /grant update \(full_name, phone\) on table public\.profiles to authenticated/i, "Profile edits must be limited to non-privileged fields");
assert.match(liveSecurityMigration, /status = 'pending'/, "Public service requests must enter moderation");
assert.match(liveSecurityMigration, /s\.active = true/, "Public requests may only reference active Studio services");
assert.match(portalSecurityMigration, /revoke update on public\.profiles from public, anon, authenticated/i, "Users must not be able to update their own admin role");
assert.match(portalSecurityMigration, /grant update \(full_name, phone\) on public\.profiles to authenticated/i, "Profile updates must be limited to safe contact fields");
assert.match(portalSecurityMigration, /status = 'pending'/, "Public service requests must enter moderation as pending");
assert.match(portalSecurityMigration, /s\.active = true/, "Public service requests must reference active services only");
assert.match(portalSecurityMigration, /newsletter_subscribers_email_lower_uidx/, "Newsletter subscriptions must reject duplicate case-insensitive emails");
assert.match(files.admin, /newServiceForm/, "Admin must allow creating service catalog entries");
assert.match(files.admin, /from\('services'\).insert/, "Admin service creation must persist to Supabase");
assert.match(files.studio, /from\('service_requests'\).insert/, "Studio requests must be stored in the service request table");
assert.match(files.studio, /from\('services'\).select\('id,name,description,price,active'\)/, "Studio must render the admin-managed service catalogue");
assert.match(files.studio, /eq\('id',\$\('serviceId'\)\.value\)\.eq\('active',true\)/, "Studio requests must reference a currently active service");
assert.match(files.studio, /if\(!email&&!phone\)/, "Studio requests must require at least one contact method");
assert.match(files.studio, /from\('services'\).select/, "Studio must load admin-managed service prices");
assert.match(files.journal, /from\('newsletter_subscribers'\).insert/, "Journal newsletter must store subscriptions in Supabase");
assert.match(files.journal, /journalConsent/, "Journal newsletter must collect explicit consent");
const newsletterConsentMigration = read("../supabase/migrations/20261124000100_auren_journal_consent.sql");
assert.match(newsletterConsentMigration, /consent_version = '2026-11-24'/, "Newsletter inserts must identify the consent text version");
assert.match(newsletterConsentMigration, /new\.consent_at := now\(\)/, "Newsletter consent timestamp must be assigned by the database");
assert.match(newsletterConsentMigration, /with check \([\s\S]*consent_at is not null/i, "Newsletter inserts must be rejected without a recorded consent timestamp");
assert.match(files.journal, /consent_version:'2026-11-24'/, "Journal must send the version of the consent text");
assert.match(files.journal, /href="properties.html"/, "Journal real-estate articles must link to Properties");
assert.match(files.journal, /href="studio.html"/, "Journal design articles must link to Studio");
assert.match(files.adminLiving, /account_type/);
assert.match(files.living, /living_products/);
assert.match(files.living, /Varianti momentaneamente esaurite/, "Storefront must not offer variant products with no available variants");
assert.match(files.living, /hasVariants\?variants\.length===0/, "Variant stock must determine product availability when variants exist");
assert.match(files.living, /href="privacy\.html"/, "Checkout must link to the privacy notice");
assert.match(files.living, /href="terms\.html"/, "Storefront must link to sale terms");
assert.match(files.privacy, /BOZZA DA COMPLETARE E VALIDARE/, "Privacy draft must remain clearly marked until completed");
assert.match(files.terms, /BOZZA NON VALIDA PER LA VENDITA/, "Sale terms draft must remain clearly marked until completed");
assert.match(files.adminLiving, /living_orders/);
assert.match(files.adminLiving, /customer_email/);
assert.match(files.adminLiving, /orderSearch/, "Admin orders must be searchable");
assert.match(files.adminLiving, /orderFilter/, "Admin orders must be filterable by fulfillment status");
assert.match(files.adminLiving, /paymentFilter/, "Admin orders must be filterable by payment status");
assert.match(files.adminLiving, /living_order_items/, "Admin must load order line items");
assert.match(files.adminLiving, /shipping_address/, "Admin must show shipping details");
assert.match(files.adminLiving, /customer_note/, "Admin must show delivery notes");
assert.match(files.adminLiving, /tracking_url/, "Admin must support shipment tracking links");
assert.match(files.adminLiving, /fulfillment_status==='shipped'&&order\?\.payment_status!=='paid'/, "Admin must block shipment of unpaid orders");
assert.match(files.adminLiving, /images=safeImageUrls\(val\('images'\)\)/, "Admin must validate product image URLs before saving");
const commerceMigration = read("../supabase/migrations/20261110000100_auren_living_commerce.sql");
assert.match(commerceMigration, /p_items is null/, "Reservation SQL must reject a null cart");
assert.match(commerceMigration, /is distinct from 'array'/, "Reservation SQL must reject non-array carts safely");
assert.ok(commerceMigration.trimEnd().endsWith("revoke all on function public.enforce_living_order_paid_before_shipment() from public, anon, authenticated;"), "Commerce migration must not contain a dangling duplicated SQL fragment");
assert.match(commerceMigration, /paid_email_sent_at/);
assert.match(commerceMigration, /shipped_email_sent_at/);
const emailSource = read("../supabase/functions/_shared/living-order-email.ts");
const webhookSource = read("../supabase/functions/stripe-living-webhook/index.ts");
const shipmentSource = read("../supabase/functions/send-living-order-email/index.ts");
assert.match(emailSource, /Idempotency-Key/, "Order emails must use provider idempotency keys");
assert.match(emailSource, /parsed.protocol === "https:"/, "Email tracking links must be HTTPS-only");
assert.match(emailSource, /paid_email_sent_at/);
assert.match(emailSource, /shipped_email_sent_at/);
assert.match(emailSource, /kind === "paid" && order\.payment_status !== "paid"/, "Paid confirmation must only be sent for paid orders");
assert.match(emailSource, /kind === "shipped" && order\.payment_status !== "paid"/, "Shipment notice must only be sent for paid orders");
assert.match(commerceMigration, /variant_id uuid references public\.living_product_variants\(id\) on delete restrict/, "Historical order variants must not be deleted and corrupt stock restoration");
assert.match(commerceMigration, /set search_path = pg_catalog, public, pg_temp/, "Privileged SQL functions must pin a safe search path");
assert.match(commerceMigration, /enforce_living_order_paid_before_shipment/, "Database must reject shipment of unpaid orders");
assert.match(commerceMigration, /before update of fulfillment_status on public\.living_orders/, "Shipment guard must be enforced by a database trigger");
assert.match(commerceMigration, /revoke all on function public\.enforce_living_order_paid_before_shipment\(\) from public, anon, authenticated/i, "Trigger helper must not be exposed as a callable RPC");
assert.match(commerceMigration, /revoke all on function public\.create_living_order_reservation\(text,text,text,jsonb,jsonb,text,numeric,uuid,jsonb,uuid,text\)\s+from public, anon, authenticated/i, "Order reservation SECURITY DEFINER function must not be callable by browser roles");
assert.match(commerceMigration, /grant execute on function public\.create_living_order_reservation\(text,text,text,jsonb,jsonb,text,numeric,uuid,jsonb,uuid,text\)\s+to service_role/i, "Only the trusted service role may create stock reservations");
assert.match(commerceMigration, /revoke all on function public\.release_living_order_reservation\(uuid\)\s+from public, anon, authenticated/i, "Stock release SECURITY DEFINER function must not be callable by browser roles");
assert.match(commerceMigration, /grant execute on function public\.release_living_order_reservation\(uuid\)\s+to service_role/i, "Only the trusted service role may release stock reservations");
assert.match(webhookSource, /session\.mode !== "payment"/, "Webhook must reject non-payment Checkout sessions");
assert.match(webhookSource, /session\.currency !== "eur"/, "Webhook must reject non-EUR payments");
assert.match(webhookSource, /Number\(session\.amount_total\) !== Math\.round\(Number\(pendingOrder\.total\) \* 100\)/, "Webhook must verify the exact paid amount against the order");
assert.match(webhookSource, /\.eq\("payment_status", "pending"\)/, "Webhook must only transition pending orders to paid");
assert.match(webhookSource, /order\.payment_status === "pending"/, "Expired Checkout sessions must only release still-pending orders");
assert.match(webhookSource, /sendLivingOrderEmail\(supabase, orderId, "paid"\)/, "Paid webhook must send order confirmation");
assert.match(webhookSource, /rawBody\.length > 256_000/, "Stripe webhook payload must be size-limited");
assert.match(webhookSource, /handledEvents\.has\(event\.type\)/, "Unrelated Stripe events must be acknowledged without order metadata");
assert.match(webhookSource, /startsWith\("cs_"\)/, "Webhook must validate Stripe Checkout session IDs");
assert.match(shipmentSource, /account_type/);
assert.match(shipmentSource, /account_type !== "admin"/, "Shipment emails must be admin-only");
assert.match(shipmentSource, /Access-Control-Allow-Origin/, "Shipment email function must support the storefront origin");
assert.match(shipmentSource, /req.method === "OPTIONS"/, "Shipment email function must answer browser preflight requests");
assert.match(shipmentSource, /raw\.length > 4_000/, "Shipment email endpoint must cap request payload size");
assert.match(files.adminLiving, /functions\.invoke\('send-living-order-email'/, "Admin shipment update must trigger the email function");
const checkoutSource = read("../supabase/functions/create-living-checkout/index.ts");
assert.match(checkoutSource, /requiredAddressFields = \["line1", "postal_code", "city", "province", "country"\]/, "Checkout address validation must match the storefront payload");
assert.match(checkoutSource, /living_shipping_zones/, "Checkout must load shipping rates from the database");
assert.match(checkoutSource, /countryZones\[countryName\]/, "Checkout must map the submitted country to a server-side shipping zone");
assert.match(checkoutSource, /countryZones: Record<string, string> = Object\.create\(null\)/, "Country-zone lookup must not inherit unsafe object prototype keys");
assert.match(checkoutSource, /if \(!countryZones\[key\]\) countryZones\[key\] = zone/, "Specific shipping zones must not be overwritten by later geographic aliases");
assert.match(checkoutSource, /addCountries\("italia", \["Italia","Italy"\]\)/, "Italy must have its own shipping zone");
assert.match(checkoutSource, /addCountries\("regno_unito_svizzera", \[[^\]]*"Switzerland"\]/, "Switzerland must use its dedicated shipping zone");
assert.doesNotMatch(checkoutSource.match(/addCountries\("europa", \["Belgium"[\s\S]*?\);/)?.[0] || "", /"Italy"|"Switzerland"/, "Dedicated shipping countries must not be reassigned to Europe");
assert.match(checkoutSource, /addCountries\("regno_unito_svizzera", \["Regno Unito","United Kingdom"/, "United Kingdom and Switzerland must retain their dedicated shipping zone");



assert.match(checkoutSource, /addCountries\("america", \["Puerto Rico"/, "International territories in the Americas must map to the America zone");
assert.match(checkoutSource, /addCountries\("asia_oceania", \["Palestina"/, "Palestine and Asian territories must map to Asia and Oceania");
assert.match(checkoutSource, /addCountries\("resto_mondo", \["Côte d'Ivoire"/, "International country aliases must cover common French and English country names");
assert.match(checkoutSource, /if \(!shippingZone\) return json\(\{ error:/, "Unknown countries must fail closed instead of receiving an incorrect shipping tariff");

assert.doesNotMatch(checkoutSource, /SHIPPING_FLAT_RATE_CENTS/, "Checkout must not use a single global shipping rate");
assert.match(checkoutSource, /shippingConfig\?\.active/, "Checkout must fail closed for inactive shipping zones");
assert.match(files.adminLiving, /loadShippingZones/, "Admin must expose editable shipping tariffs");
assert.match(files.adminLiving, /living_shipping_zones/, "Admin must persist shipping tariff changes in the database");
assert.match(read("../supabase/migrations/20261119000100_auren_living_shipping_zones.sql"), /create table if not exists public\.living_shipping_zones/i, "Shipping zone migration must create its configuration table");

assert.match(commerceMigration, /grant select on public\.living_products, public\.living_product_variants to anon/i, "Public catalogue tables must have explicit Data API grants");
assert.match(commerceMigration, /grant all on public\.living_products, public\.living_product_variants,[\s\S]*?to service_role/i, "Commerce tables must grant trusted server access explicitly");
assert.match(commerceMigration, /alter table public\.living_orders enable row level security/i, "Customer order data must have RLS enabled");
assert.match(read("../supabase/migrations/20261119000100_auren_living_shipping_zones.sql"), /grant select, update on public\.living_shipping_zones to authenticated/i, "Shipping configuration must have explicit admin Data API grants");
assert.match(read("../supabase/migrations/20261119000100_auren_living_shipping_zones.sql"), /grant all on public\.living_shipping_zones to service_role/i, "Checkout service role must have explicit shipping configuration access");


assert.match(checkoutSource, /new URL\(requestOrigin\)\.origin !== new URL\(allowedOrigin\)\.origin/, "Checkout must reject cross-origin browser requests");
assert.match(checkoutSource, /raw\.length > 64_000/, "Checkout request body must be size-limited");
assert.match(commerceMigration, /add column if not exists checkout_attempt_id uuid/i, "Checkout attempt IDs must be stored on orders");
assert.match(commerceMigration, /living_orders_checkout_attempt_uidx[\s\S]*?on public\.living_orders\(checkout_attempt_id\)/i, "Checkout attempt IDs must have a unique database constraint");
assert.match(commerceMigration, /pg_advisory_xact_lock\(hashtextextended\(p_checkout_attempt_id::text, 0\)\)/, "Concurrent retries must serialize on the same checkout attempt");
assert.match(commerceMigration, /checkout_request_hash is distinct from p_request_hash/i, "A retry key must not be reusable with changed order details");
assert.match(commerceMigration, /create_living_order_reservation\(text,text,text,jsonb,jsonb,text,numeric,uuid,jsonb,uuid,text\)/i, "Reservation RPC must accept a stable checkout attempt ID and request fingerprint");
assert.match(checkoutSource, /Idempotency-Key": "auren-living-checkout-" \+ checkoutAttemptId/, "Stripe requests must reuse the same idempotency key across retries");
assert.match(checkoutSource, /p_checkout_attempt_id: checkoutAttemptId/, "Database reservation must use the browser checkout attempt ID");
assert.match(checkoutSource, /p_request_hash: requestHash/, "Database reservation must bind retries to the same request payload");
assert.match(checkoutSource, /outcome is unknown; reservation retained for safe retry/, "Ambiguous Stripe network outcomes must not release stock");
assert.match(files.living, /aurenLivingCheckoutAttempt/, "Storefront must persist the checkout attempt ID across retry attempts");
assert.match(files.living, /id="checkoutSubmit"[^>]*disabled/, "Living checkout must remain disabled until payment, shipping and server functions are configured");
assert.match(files.living, /const CHECKOUT_ENABLED = false/, "Checkout must be hard-disabled in its submit handler until launch checks pass");
assert.match(files.living, /if\(!CHECKOUT_ENABLED\)[\s\S]*?Nessun dato è stato inviato/, "Programmatic form submission must fail closed while checkout is disabled");
assert.match(files.living, /Il checkout non è ancora attivo/, "Living must clearly disclose that online orders are not yet active");
assert.match(files.living, /name="country"[^>]*list="countryOptions"/, "Worldwide checkout must offer country suggestions");
assert.match(files.living, /<datalist id="countryOptions">/, "Checkout country suggestions must be available to customers");

assert.match(checkoutSource, /checkoutUrl\.hostname !== "checkout\.stripe\.com"/, "Checkout must redirect only to Stripe's HTTPS checkout host");
assert.match(checkoutSource, /session\.id\.startsWith\("cs_"\)/, "Checkout must validate Stripe Checkout session identifiers");
assert.match(checkoutSource, /Never log the full provider payload/, "Checkout must not log full Stripe payloads that may contain customer data");
assert.match(checkoutSource, /!linkedOrder/, "Checkout must fail closed if the Stripe session cannot be linked to its pending order");
assert.match(checkoutSource, /Never release reserved stock unless Stripe confirms that the Checkout/, "Checkout must not release stock while a Stripe session may still be payable");
assert.match(checkoutSource, /Stripe session request outcome is unknown/, "Checkout must handle provider/network failures");
assert.match(checkoutSource, /release_living_order_reservation.*reservation\.order_id/, "Checkout must release reserved stock when Stripe cannot create a session");
assert.doesNotMatch(files.living, /from\(['"]living_orders['"]\)\.insert/i, "Client must not create unpaid orders");
for (const [name, content] of Object.entries(files)) {
  assert.doesNotMatch(content, /service_role|SUPABASE_SECRET_KEY|sb_secret_/i, "Secret key detected in " + name);
}
console.log("✓ Production routes, database integrations, authentication, and public-key safety checks");
console.log("Static checks passed. Live signup, email delivery, and browser/database acceptance tests still need to be performed.");

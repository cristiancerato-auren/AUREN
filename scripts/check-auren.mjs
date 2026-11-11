import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const files = {
  index: read("../index.html"),
  account: read("../account.html"),
  admin: read("../admin.html"),
  living: read("../living.html"),
  adminLiving: read("../admin-living.html"),
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
checkHtmlScripts(files.account, "account.html");
checkHtmlScripts(files.admin, "admin.html");
checkHtmlScripts(files.living, "living.html");
checkHtmlScripts(files.adminLiving, "admin-living.html");
new vm.Script(files.live, {filename:"assets/js/auren-live.js"});
console.log("✓ Live Supabase integration JavaScript syntax");

assert.match(files.index, /href=["']account\.html["']/i);
assert.match(files.index, /assets\/js\/auren-live\.js/);
assert.match(files.live, /from\('properties'\)/);
assert.match(files.live, /from\('service_requests'\)/);
assert.match(files.live, /from\('newsletter_subscribers'\)/);
assert.match(files.account, /signInWithPassword/);
assert.match(files.account, /signUp/);
assert.match(files.account, /from\('living_orders'\)/, "Account must load customer orders through Supabase RLS");
assert.match(files.account, /from\('living_order_items'\)/, "Account must load order line items through Supabase RLS");
assert.match(files.account, /ordersPanel/, "Account must render the order history panel");
assert.match(files.admin, /account_type/);
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
assert.match(commerceMigration, /revoke all on function public\.create_living_order_reservation\(text,text,text,jsonb,jsonb,text,numeric,uuid,jsonb\)\s+from public, anon, authenticated/i, "Order reservation SECURITY DEFINER function must not be callable by browser roles");
assert.match(commerceMigration, /grant execute on function public\.create_living_order_reservation\(text,text,text,jsonb,jsonb,text,numeric,uuid,jsonb\)\s+to service_role/i, "Only the trusted service role may create stock reservations");
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
assert.match(checkoutSource, /new URL\(requestOrigin\)\.origin !== new URL\(allowedOrigin\)\.origin/, "Checkout must reject cross-origin browser requests");
assert.match(checkoutSource, /raw\.length > 64_000/, "Checkout request body must be size-limited");
assert.match(commerceMigration, /checkout_attempt_id uuid unique/i, "Checkout attempt IDs must be unique per order");
assert.match(commerceMigration, /pg_advisory_xact_lock\(hashtextextended\(p_checkout_attempt_id::text, 0\)\)/, "Concurrent retries must serialize on the same checkout attempt");
assert.match(commerceMigration, /checkout_request_hash is distinct from p_request_hash/i, "A retry key must not be reusable with changed order details");
assert.match(commerceMigration, /create_living_order_reservation\(text,text,text,jsonb,jsonb,text,numeric,uuid,jsonb,uuid,text\)/i, "Reservation RPC must accept a stable checkout attempt ID and request fingerprint");
assert.match(checkoutSource, /Idempotency-Key": "auren-living-checkout-" \+ checkoutAttemptId/, "Stripe requests must reuse the same idempotency key across retries");
assert.match(checkoutSource, /p_checkout_attempt_id: checkoutAttemptId/, "Database reservation must use the browser checkout attempt ID");
assert.match(checkoutSource, /p_request_hash: requestHash/, "Database reservation must bind retries to the same request payload");
assert.match(checkoutSource, /outcome is unknown; reservation retained for safe retry/, "Ambiguous Stripe network outcomes must not release stock");
assert.match(files.living, /aurenLivingCheckoutAttempt/, "Storefront must persist the checkout attempt ID across retry attempts");
assert.match(checkoutSource, /checkoutUrl\.hostname !== "checkout\.stripe\.com"/, "Checkout must redirect only to Stripe's HTTPS checkout host");
assert.match(checkoutSource, /session\.id\.startsWith\("cs_"\)/, "Checkout must validate Stripe Checkout session identifiers");
assert.match(checkoutSource, /Never log the full provider payload/, "Checkout must not log full Stripe payloads that may contain customer data");
assert.match(checkoutSource, /!linkedOrder/, "Checkout must fail closed if the Stripe session cannot be linked to its pending order");
assert.match(checkoutSource, /Never release reserved stock unless Stripe confirms that the Checkout/, "Checkout must not release stock while a Stripe session may still be payable");
assert.match(checkoutSource, /Stripe session request failed/, "Checkout must handle provider/network failures");
assert.match(checkoutSource, /release_living_order_reservation.*reservation\.order_id/, "Checkout must release reserved stock when Stripe cannot create a session");
assert.doesNotMatch(files.living, /from\(['"]living_orders['"]\)\.insert/i, "Client must not create unpaid orders");
for (const [name, content] of Object.entries(files)) {
  assert.doesNotMatch(content, /service_role|SUPABASE_SECRET_KEY|sb_secret_/i, "Secret key detected in " + name);
}
console.log("✓ Production routes, database integrations, authentication, and public-key safety checks");
console.log("Static checks passed. Live signup, email delivery, and browser/database acceptance tests still need to be performed.");

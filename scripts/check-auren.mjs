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
assert.match(checkoutSource, /checkoutUrl\.hostname !== "checkout\.stripe\.com"/, "Checkout must redirect only to Stripe's HTTPS checkout host");
assert.match(checkoutSource, /!linkedOrder/, "Checkout must fail closed if the Stripe session cannot be linked to its pending order");
assert.match(checkoutSource, /Stripe session request failed/, "Checkout must handle provider/network failures");
assert.match(checkoutSource, /release_living_order_reservation.*reservation\.order_id/, "Checkout must release reserved stock when Stripe cannot create a session");
assert.doesNotMatch(files.living, /from\(['"]living_orders['"]\)\.insert/i, "Client must not create unpaid orders");
for (const [name, content] of Object.entries(files)) {
  assert.doesNotMatch(content, /service_role|SUPABASE_SECRET_KEY|sb_secret_/i, "Secret key detected in " + name);
}
console.log("✓ Production routes, database integrations, authentication, and public-key safety checks");
console.log("Static checks passed. Live signup, email delivery, and browser/database acceptance tests still need to be performed.");

import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const manifest = JSON.parse(read("../manifest.webmanifest"));
const serviceWorker = read("../service-worker.js");
new vm.Script(serviceWorker, {filename:"service-worker.js"});
assert.equal(manifest.start_url, "/");
assert.equal(manifest.scope, "/");
assert.equal(manifest.display, "standalone");
assert.deepEqual(manifest.shortcuts.map((item) => item.short_name), ["Properties", "Living", "Studio", "Journal"]);
for (const shortcut of manifest.shortcuts) assert.ok(shortcut.url.startsWith("/"), "App shortcuts must stay within AUREN");
assert.match(serviceWorker, /OFFLINE_URL/);
console.log("PWA manifest and service worker checks passed");
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
for (const page of [files.index, files.living, files.account, read('../journal.html')]) {
  assert.ok(page.includes('auren-app-nav'), 'Every main AUREN page must include mobile navigation');
  assert.ok(page.includes('data-app-dest="journal"'), 'Every main AUREN page must link to Journal');
}
assert.ok(files.index.includes('installAuren'), 'Homepage must provide an app installation entry point');
assert.ok(files.index.includes('beforeinstallprompt'), 'Install flow must support native PWA installation');
console.log('AUREN mobile navigation and install entry point checks passed');

assert.match(files.index, /assets\/js\/auren-live\.js/);
assert.ok(files.index.includes("rel=\"manifest\""));
assert.ok(files.index.includes("serviceWorker.register"));
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
assert.match(files.living, /href="privacy\.html"/, "Checkout must link to the privacy notice");
assert.match(files.living, /href="terms\.html"/, "Storefront must link to sale terms");
assert.match(files.privacy, /BOZZA DA COMPLETARE E VALIDARE/, "Privacy draft must remain clearly marked until completed");
assert.match(files.terms, /BOZZA NON VALIDA PER LA VENDITA/, "Sale terms draft must remain clearly marked until completed");
assert.match(files.adminLiving, /living_orders/);
assert.match(files.adminLiving, /customer_email/);
const checkoutSource = read("../supabase/functions/create-living-checkout/index.ts");
assert.match(checkoutSource, /requiredAddressFields = \["line1", "postal_code", "city", "province", "country"\]/, "Checkout address validation must match the storefront payload");
assert.match(checkoutSource, /raw\.length > 64_000/, "Checkout request body must be size-limited");
assert.doesNotMatch(files.living, /from\(['"]living_orders['"]\)\.insert/i, "Client must not create unpaid orders");
for (const [name, content] of Object.entries(files)) {
  assert.doesNotMatch(content, /service_role|SUPABASE_SECRET_KEY|sb_secret_/i, "Secret key detected in " + name);
}
console.log("✓ Production routes, database integrations, authentication, and public-key safety checks");
console.log("Static checks passed. Live signup, email delivery, and browser/database acceptance tests still need to be performed.");

import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const index = read("../index.html");
const account = read("../account.html");
const sql = read("../supabase/migrations/20261023000100_auren_security.sql");

function checkInlineJavaScript(html, filename) {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  let checked = 0;
  for (const [, attributes, source] of scripts) {
    if (/\bsrc\s*=/.test(attributes) || !source.trim()) continue;
    checked += 1;
    new vm.Script(source, { filename: `${filename}:inline-script-${checked}` });
  }
  assert.ok(checked > 0, `No inline JavaScript found in ${filename}`);
  console.log(`✓ JavaScript syntax: ${filename} (${checked} inline script(s))`);
}

checkInlineJavaScript(index, "index.html");
checkInlineJavaScript(account, "account.html");

assert.match(index, /href=["']account\.html["']/i, "Homepage should link to the account page");
assert.match(index, /demoListings/, "Homepage demo listing data should remain explicit");
assert.match(index, /non viene ancora inviata a un sistema aziendale/i, "Service form must not imply real delivery before backend integration");
assert.match(account, /signInWithPassword/, "Account page should implement sign-in");
assert.match(account, /signUp/, "Account page should implement registration");
assert.doesNotMatch(account, /service_role|SUPABASE_SECRET_KEY/i, "Never ship a Supabase service-role/secret key in browser code");
console.log("✓ Account link, auth actions, and demo-state disclosures");

const createdPolicies = [...sql.matchAll(/create\s+policy\s+"([^"]+)"\s+on\s+public\.([a-z_]+)/gi)]
  .map(([, name, table]) => `${table}::${name}`);
const droppedPolicies = new Set([...sql.matchAll(/drop\s+policy\s+if\s+exists\s+"([^"]+)"\s+on\s+public\.([a-z_]+)/gi)]
  .map(([, name, table]) => `${table}::${name}`));
const missingDrops = createdPolicies.filter((policy) => !droppedPolicies.has(policy));
assert.deepEqual(missingDrops, [], "Every created policy must be dropped first so the migration can be rerun");
for (const table of ["profiles", "properties", "services", "service_requests"]) {
  assert.match(sql, new RegExp(`alter\s+table\s+public\.${table}\s+enable\s+row\s+level\s+security`, "i"),
    `RLS must be enabled for public.${table}`);
}
assert.match(sql, /revoke\s+update\s+on\s+public\.profiles\s+from\s+authenticated/i);
assert.match(sql, /grant\s+update\s*\(full_name\)\s+on\s+public\.profiles\s+to\s+authenticated/i);
assert.match(sql, /security\s+definer[\s\S]*?set\s+search_path\s*=\s*''/i);
console.log(`✓ SQL safety invariants: ${createdPolicies.length} policies are rerunnable; RLS and profile column grants checked`);
console.log("AUREN static checks passed. These checks do not replace a live Supabase/database test.");

import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const files = {
  index: read("../index.html"),
  account: read("../account.html"),
  admin: read("../admin.html"),
  live: read("../assets/js/auren-live.js")
};

function checkHtmlScripts(html, filename) {
  const scripts = [...html.matchAll(/<script\\b([^>]*)>([\\s\\S]*?)<\\/script>/gi)];
  let count = 0;
  for (const [, attrs, source] of scripts) {
    if (/\\bsrc\\s*=/.test(attrs) || !source.trim()) continue;
    new vm.Script(source, {filename: filename + ":inline-" + (++count)});
  }
  assert.ok(count, "No inline scripts checked for " + filename);
  console.log("✓ Inline JavaScript syntax: " + filename);
}
checkHtmlScripts(files.index, "index.html");
checkHtmlScripts(files.account, "account.html");
checkHtmlScripts(files.admin, "admin.html");
new vm.Script(files.live, {filename:"assets/js/auren-live.js"});
console.log("✓ Live Supabase integration JavaScript syntax");

assert.match(files.index, /href=["']account\\.html["']/i);
assert.match(files.index, /assets\\/js\\/auren-live\\.js/);
assert.match(files.live, /from\\('properties'\\)/);
assert.match(files.live, /from\\('service_requests'\\)/);
assert.match(files.live, /from\\('newsletter_subscribers'\\)/);
assert.match(files.account, /signInWithPassword/);
assert.match(files.account, /signUp/);
assert.match(files.admin, /account_type/);
for (const [name, content] of Object.entries(files)) {
  assert.doesNotMatch(content, /service_role|SUPABASE_SECRET_KEY|sb_secret_/i, "Secret key detected in " + name);
}
console.log("✓ Production routes, database integrations, authentication, and public-key safety checks");
console.log("Static checks passed. Live signup, email delivery, and browser/database acceptance tests still need to be performed.");

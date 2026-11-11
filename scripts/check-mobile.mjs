import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.join(process.cwd(), "www");
const required = [
  "index.html", "living.html", "studio.html", "journal.html",
  "account.html", "privacy.html", "terms.html", "offline.html",
  "manifest.webmanifest", "service-worker.js", "assets/js/auren-storage.js",
  "assets/js/auren-live.js", "assets/icons/auren-app.svg",
  "assets/icons/auren-app-maskable.svg"
];

for (const file of required) {
  assert.ok(fs.existsSync(path.join(root, file)), "Missing mobile bundle file: " + file);
}

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert.match(index, /<head[\s>]/i, "Capacitor entry page must contain a head element");
for (const page of ["index.html", "living.html", "studio.html", "journal.html", "account.html"]) {
  const html = fs.readFileSync(path.join(root, page), "utf8");
  assert.match(html, /auren-app-nav/, page + " must include AUREN app navigation");
}
const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), "capacitor.config.json"), "utf8"));
assert.equal(config.appId, "it.aurenliving.app");
assert.equal(config.appName, "AUREN");
assert.equal(config.webDir, "www");
console.log("AUREN native bundle checks passed");

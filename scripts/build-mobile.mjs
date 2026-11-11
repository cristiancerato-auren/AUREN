import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "www");
const pages = [
  "index.html",
  "living.html",
  "studio.html",
  "journal.html",
  "account.html",
  "privacy.html",
  "terms.html",
  "offline.html",
  "manifest.webmanifest",
  "service-worker.js"
];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const file of pages) {
  const source = path.join(root, file);
  if (!fs.existsSync(source)) throw new Error("Required mobile page is missing: " + file);
  fs.copyFileSync(source, path.join(output, file));
}

for (const directory of ["assets"]) {
  const source = path.join(root, directory);
  if (!fs.existsSync(source)) throw new Error("Required mobile asset directory is missing: " + directory);
  fs.cpSync(source, path.join(output, directory), { recursive: true });
}

console.log("AUREN mobile web bundle created in ./www");

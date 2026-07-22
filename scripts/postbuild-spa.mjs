#!/usr/bin/env node
// Post-process the TanStack Start build so Capacitor Android can serve it as
// a plain static bundle:
//   dist/client/  →  dist/spa/
//   dist/client/_shell.html  →  dist/spa/index.html
//
// Critical for Play/AAB parity with sideloaded APK:
// rewrite root-absolute /assets/... → ./assets/... in HTML AND JS/CSS chunks.
// Absolute paths work on some local WebViews and break on Play AssetLoader.
import {
  existsSync,
  cpSync,
  renameSync,
  rmSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { join } from "node:path";

const clientDir = join(process.cwd(), "dist", "client");
const spaDir = join(process.cwd(), "dist", "spa");

if (!existsSync(clientDir)) {
  console.error(`[postbuild-spa] Missing ${clientDir}. Did you run BUILD_MODE=spa vite build?`);
  process.exit(1);
}

rmSync(spaDir, { recursive: true, force: true });
cpSync(clientDir, spaDir, { recursive: true });

const shellCandidates = [
  join(spaDir, "_shell.html"),
  join(spaDir, "_shell", "index.html"),
];
const shell = shellCandidates.find((p) => existsSync(p));
const indexHtml = join(spaDir, "index.html");
if (shell) {
  if (existsSync(indexHtml)) rmSync(indexHtml, { force: true });
  renameSync(shell, indexHtml);
} else if (!existsSync(indexHtml)) {
  console.error(`[postbuild-spa] No shell HTML found under ${spaDir}`);
  console.error("Contents:", readdirSync(spaDir));
  process.exit(1);
}

/** Rewrite absolute local asset URLs to relative (Capacitor-safe). */
function rewriteAssetUrls(text) {
  let out = text;
  // Vite quirk with some bases: "/./assets/..." → "./assets/..."
  out = out.replace(/(["'`(=])\/\.\/assets\//g, "$1./assets/");
  out = out.replace(/url\(\s*\/\.\/assets\//g, "url(./assets/");
  // "/assets/...", '/assets/...', `/assets/...`, ("/assets/...), ="/assets/...
  out = out.replace(/(["'`(=])\/assets\//g, "$1./assets/");
  // CSS url(/assets/...)
  out = out.replace(/url\(\s*\/assets\//g, "url(./assets/");
  // Root-relative public icons in HTML
  out = out.replace(
    /(href|src)=(["'])\/(manifest\.webmanifest|apple-touch-icon\.png|icon-192\.png|icon-512\.png|favicon\.ico)\2/g,
    "$1=$2./$3$2",
  );
  return out;
}

function walkFiles(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkFiles(p, exts, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

let html = readFileSync(indexHtml, "utf8");

// Never ship the capacitor-www Lovable redirect wrapper by mistake.
if (/oxidatii\.lovable\.app|location\.replace\s*\(/i.test(html) && !/assets\//i.test(html)) {
  console.error("[postbuild-spa] Refusing to ship Lovable redirect stub as index.html");
  process.exit(1);
}

const beforeHtml = html;
html = rewriteAssetUrls(html);

// Ensure a relative base so nested hash routes still resolve assets from the SPA root.
if (!/<base\s/i.test(html)) {
  html = html.replace(/<head([^>]*)>/i, '<head$1><base href="./"/>');
}

if (beforeHtml === html && !html.includes("./assets/")) {
  console.warn("[postbuild-spa] Warning: no /assets/ URLs rewritten in index.html");
}

writeFileSync(indexHtml, html, "utf8");

// Rewrite JS/CSS chunks — Vite often emits `"/assets/logo-....png"` for imported images.
const chunkFiles = walkFiles(spaDir, [".js", ".css", ".html", ".json"]);
let chunkRewrites = 0;
const leftover = [];
for (const file of chunkFiles) {
  if (file === indexHtml) continue;
  const raw = readFileSync(file, "utf8");
  const next = rewriteAssetUrls(raw);
  if (next !== raw) {
    writeFileSync(file, next, "utf8");
    chunkRewrites++;
  }
  // Flag remaining absolute local asset refs
  if (/(["'`(=])\/assets\//.test(next) || /url\(\s*\/assets\//.test(next)) {
    leftover.push(file.replace(spaDir + "\\", "").replace(spaDir + "/", ""));
  }
}

if (leftover.length) {
  console.error("[postbuild-spa] Absolute /assets/ still present after rewrite:");
  for (const f of leftover.slice(0, 20)) console.error(`  - ${f}`);
  process.exit(1);
}

// Validate every ./assets/<file> referenced in index.html exists on disk.
const assetRefs = new Set();
for (const m of html.matchAll(/\.\/assets\/([A-Za-z0-9._-]+)/g)) {
  assetRefs.add(m[1]);
}
const missing = [];
for (const file of assetRefs) {
  if (!existsSync(join(spaDir, "assets", file))) missing.push(file);
}
if (missing.length) {
  console.error("[postbuild-spa] index.html references missing assets:");
  for (const f of missing) console.error(`  - assets/${f}`);
  process.exit(1);
}

const entryMatch =
  html.match(/import\(\s*["']\.\/assets\/([^"']+)["']\s*\)/) ||
  html.match(/import\(\s*["']\/\.\/assets\/([^"']+)["']\s*\)/);
if (!entryMatch) {
  console.error("[postbuild-spa] Could not find module entry import('./assets/...') in index.html");
  console.error("Snippet:", html.slice(html.indexOf("import("), html.indexOf("import(") + 80));
  process.exit(1);
}

console.log(
  `[postbuild-spa] Wrote ${spaDir}/index.html (relative assets, ${assetRefs.size} files checked, ${chunkRewrites} chunks rewritten)`,
);
console.log(`[postbuild-spa] Entry chunk: assets/${entryMatch[1]}`);

#!/usr/bin/env node
// Post-process the TanStack Start build so Capacitor Android can serve it as
// a plain static bundle:
//   dist/client/  →  dist/spa/
//   dist/client/_shell.html  →  dist/spa/index.html
// The shell is TanStack Router's client-only entry: React hydrates and takes
// over routing entirely. All createServerFn calls hit the absolute
// SERVER_FN_BASE_URL configured at build time.
import { existsSync, cpSync, renameSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";

const clientDir = join(process.cwd(), "dist", "client");
const spaDir = join(process.cwd(), "dist", "spa");

if (!existsSync(clientDir)) {
  console.error(`[postbuild-spa] Missing ${clientDir}. Did you run BUILD_MODE=spa vite build?`);
  process.exit(1);
}

rmSync(spaDir, { recursive: true, force: true });
cpSync(clientDir, spaDir, { recursive: true });

const shell = join(spaDir, "_shell.html");
const indexHtml = join(spaDir, "index.html");
if (existsSync(shell)) {
  if (existsSync(indexHtml)) rmSync(indexHtml, { force: true });
  renameSync(shell, indexHtml);
} else if (!existsSync(indexHtml)) {
  console.error(`[postbuild-spa] Neither _shell.html nor index.html found under ${spaDir}`);
  console.error("Contents:", readdirSync(spaDir));
  process.exit(1);
}

console.log(`[postbuild-spa] Wrote ${spaDir}/index.html`);

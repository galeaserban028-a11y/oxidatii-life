// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load server-side env vars (SUPABASE_SERVICE_ROLE_KEY, LOVABLE_API_KEY, etc.)
// into process.env for server routes. Client code still uses VITE_ vars via envDefine.
const serverEnv = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

// SPA build mode: `BUILD_MODE=spa` enables TanStack Start SPA shell generation
// for the Android APK bundle. All `createServerFn` calls point to the absolute
// SERVER_FN_BASE_URL (default https://oxidatii.life/_serverFn) so the offline
// app still reaches production backend.
const isSpaBuild = process.env.BUILD_MODE === "spa";
const serverFnBase =
  process.env.SERVER_FN_BASE_URL ?? (isSpaBuild ? "https://oxidatii.life/_serverFn" : "/_serverFn");

export default defineConfig({
  // For SPA build we disable nitro entirely so TanStack Start emits its own
  // `dist/server/server.js` bundle (matching the entry name in
  // `tanstackStart.server.entry`). Nitro's cloudflare preset emits
  // `dist/server/index.mjs`, which the TanStack prerender step can't find
  // when it boots a local preview server to render `_shell.html`.
  // This override only applies outside a Lovable Cloud build (see wrapper docs).
  ...(isSpaBuild ? { nitro: false as const } : {}),

  tanstackStart: {
    server: { entry: "server" },
    serverFns: { base: serverFnBase },
    ...(isSpaBuild
      ? {
          // Emits dist/client/_shell.html — postbuild-spa.mjs renames it to
          // dist/spa/index.html for Capacitor.
          spa: { enabled: true, maskPath: "/" },
        }
      : {}),
  },

  vite: {
    resolve: {
      alias: [
        { find: /^maplibre-gl$/, replacement: "maplibre-gl/dist/maplibre-gl-csp.js" },
        // Force entities v4.5.0 (hoisted copy) so React Email's htmlparser2 works.
        {
          find: "entities/lib/decode.js",
          replacement: path.resolve(__dirname, "node_modules/entities/lib/decode.js"),
        },
        {
          find: "entities/lib/encode.js",
          replacement: path.resolve(__dirname, "node_modules/entities/lib/encode.js"),
        },
        { find: /^entities$/, replacement: path.resolve(__dirname, "node_modules/entities") },
      ],
    },
    build: { target: "es2022" },
    optimizeDeps: {
      include: ["maplibre-gl/dist/maplibre-gl-csp.js"],
      esbuildOptions: { target: "es2022" },
    },
  },
});

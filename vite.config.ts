// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: [
        // Use the CSP build at runtime so MapLibre does NOT create a generated
        // blob worker. On mobile/PWA that generated worker was intermittently
        // crashing/minifying into `ReferenceError: g is not defined`, leaving
        // the map black or without neon/vector lines.
        { find: /^maplibre-gl$/, replacement: "maplibre-gl/dist/maplibre-gl-csp.js" },
      ],
    },
    // MapLibre runs part of its code in a Web Worker blob. If Vite/esbuild
    // transpiles that dependency below ES2022, helper functions can be stripped
    // out of the worker scope and the map crashes with errors like
    // "_ is not defined" / missing helper references.
    build: { target: "es2022" },
    optimizeDeps: {
      include: ["maplibre-gl/dist/maplibre-gl-csp.js"],
      esbuildOptions: { target: "es2022" },
    },
  },
});

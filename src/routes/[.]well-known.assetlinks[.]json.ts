import { createFileRoute } from "@tanstack/react-router";

const ASSETLINKS = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.oxidatii.app",
      sha256_cert_fingerprints: ["92:D8:58:F8:21:A6:34:20:7D:B7:47:08:7F:15:3A:C0:AF:1D:0D:CB:8C:4A:98:44:51:DC:53:E1:26:26:A9:7B"],
    },
  },
];

export const Route = createFileRoute("/.well-known/assetlinks.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify(ASSETLINKS), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "cache-control": "public, max-age=3600",
          },
        }),
    },
  },
});

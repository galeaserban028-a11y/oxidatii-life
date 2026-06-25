import { createFileRoute } from "@tanstack/react-router";

const ASSETLINKS = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.oxidatii.app",
      sha256_cert_fingerprints: ["REPLACE_WITH_RELEASE_SHA256_FINGERPRINT"],
    },
  },
];

export const Route = createFileRoute("/[.]well-known/assetlinks[.]json")({
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

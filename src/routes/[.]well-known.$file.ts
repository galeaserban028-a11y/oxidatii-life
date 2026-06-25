import { createFileRoute } from "@tanstack/react-router";

// Apple Universal Links cere /.well-known/apple-app-site-association
// servit ca application/json, fără redirect, fără extensie.
// Google Digital Asset Links cere /.well-known/assetlinks.json (Android App Links).

const AASA = {
  applinks: {
    apps: [],
    details: [
      {
        appIDs: ["TEAMID.com.oxidatii.app"],
        components: [
          { "/": "/app/*", comment: "Tot ce e după /app deschide în native" },
          { "/": "/auth/callback*", comment: "OAuth callback" },
          { "/": "/", exclude: true },
        ],
      },
    ],
  },
  webcredentials: { apps: ["TEAMID.com.oxidatii.app"] },
};

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

export const Route = createFileRoute("/.well-known/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const file = params.file;
        if (file === "apple-app-site-association") {
          return new Response(JSON.stringify(AASA), {
            status: 200,
            headers: {
              "content-type": "application/json",
              "cache-control": "public, max-age=3600",
            },
          });
        }
        if (file === "assetlinks.json") {
          return new Response(JSON.stringify(ASSETLINKS), {
            status: 200,
            headers: {
              "content-type": "application/json",
              "cache-control": "public, max-age=3600",
            },
          });
        }
        return new Response("Not found", { status: 404 });
      },
    },
  },
});

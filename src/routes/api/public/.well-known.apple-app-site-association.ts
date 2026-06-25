import { createFileRoute } from "@tanstack/react-router";

// Apple Universal Links — Apple cere application/json, fără extensie, fără redirect.
const AASA = {
  applinks: {
    apps: [],
    details: [
      {
        appIDs: ["TEAMID.com.oxidatii.app"],
        components: [
          { "/": "/app/*", comment: "Tot ce e după /app se deschide în native" },
          { "/": "/auth/callback*", comment: "OAuth callback" },
          { "/": "/", exclude: true },
        ],
      },
    ],
  },
  webcredentials: {
    apps: ["TEAMID.com.oxidatii.app"],
  },
};

export const Route = createFileRoute(
  "/api/public/.well-known/apple-app-site-association",
)({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify(AASA), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "cache-control": "public, max-age=3600",
          },
        }),
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

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

export const Route = createFileRoute(
  "/[.]well-known/apple-app-site-association",
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

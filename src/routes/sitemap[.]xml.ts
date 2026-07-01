import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://oxidatii.life";

const STATIC_PATHS = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/login", changefreq: "monthly", priority: "0.4" },
  { path: "/signup", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
  { path: "/drop", changefreq: "hourly", priority: "0.9" },
  { path: "/hall-of-fame", changefreq: "daily", priority: "0.7" },
  { path: "/app/feed", changefreq: "hourly", priority: "0.9" },
  { path: "/app/map", changefreq: "hourly", priority: "0.9" },
  { path: "/app/parties", changefreq: "hourly", priority: "0.8" },
  { path: "/app/top", changefreq: "hourly", priority: "0.7" },
  { path: "/app/premium", changefreq: "monthly", priority: "0.6" },
  { path: "/app/biz", changefreq: "weekly", priority: "0.5" },
];

function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: {
          path: string;
          lastmod?: string;
          changefreq?: string;
          priority?: string;
        }[] = [...STATIC_PATHS];

        try {
          const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
          const key =
            process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          if (url && key) {
            const sb = createClient(url, key);
            const [{ data: cities }, { data: venues }, { data: streets }, { data: handles }] =
              await Promise.all([
                sb.from("cities").select("slug,updated_at").limit(500),
                sb.from("venues").select("id,updated_at").limit(1000),
                sb.from("streets").select("id,updated_at").limit(1000),
                sb
                  .from("profiles_public")
                  .select("handle,updated_at")
                  .not("handle", "is", null)
                  .limit(5000),
              ]);
            for (const p of handles ?? []) {
              if (p.handle)
                entries.push({
                  path: `/u/${p.handle}`,
                  lastmod: p.updated_at ?? undefined,
                  changefreq: "weekly",
                  priority: "0.6",
                });
            }
            for (const c of cities ?? []) {
              if (c.slug)
                entries.push({
                  path: `/app/city/${c.slug}`,
                  lastmod: c.updated_at ?? undefined,
                  changefreq: "weekly",
                  priority: "0.7",
                });
            }
            for (const s of streets ?? []) {
              if (s.id)
                entries.push({
                  path: `/app/street/${s.id}`,
                  lastmod: s.updated_at ?? undefined,
                  changefreq: "weekly",
                  priority: "0.6",
                });
            }
            for (const v of venues ?? []) {
              if (v.id)
                entries.push({
                  path: `/app/venue/${v.id}`,
                  lastmod: v.updated_at ?? undefined,
                  changefreq: "weekly",
                  priority: "0.8",
                });
            }
          }
        } catch (e) {
          console.error("sitemap dynamic fetch failed", e);
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${xmlEscape(e.path)}</loc>`,
            e.lastmod ? `    <lastmod>${new Date(e.lastmod).toISOString()}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});

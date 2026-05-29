// Scrape Romanian clubs/bars per city via Firecrawl + Lovable AI, geocode via Nominatim, insert to Supabase.
// Run with: bun /tmp/scrape_clubs.ts
import Firecrawl from "@mendable/firecrawl-js";
import { createClient } from "@supabase/supabase-js";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY!;
const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!FIRECRAWL_API_KEY || !LOVABLE_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing env");
}

const fc = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

type Extracted = {
  name: string;
  address?: string;
  type?: "club" | "bar" | "pub" | "terasa" | "restaurant";
  description?: string;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ș/g, "s").replace(/ț/g, "t").replace(/ă/g, "a").replace(/â/g, "a").replace(/î/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function aiExtract(cityName: string, markdown: string): Promise<Extracted[]> {
  const trimmed = markdown.slice(0, 60_000);
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "Extragi cluburi, baruri, paburi, terase din texte web în Română. Răspunzi DOAR cu JSON valid.",
        },
        {
          role: "user",
          content: `Din textul de mai jos, extrage TOATE cluburile, barurile, paburile, terasele și restaurantele de noapte din orașul ${cityName}, România. Returnează un JSON cu cheia "venues" — array de obiecte {name, address, type, description}. type ∈ {"club","bar","pub","terasa","restaurant"}. Adresă completă dacă există. Maxim 40 de locuri, fără duplicate. Doar locuri REALE menționate explicit. NU inventa.\n\nTEXT:\n${trimmed}`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    console.error("AI fail", res.status, await res.text());
    return [];
  }
  const data: any = await res.json();
  try {
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const venues = parsed.venues ?? parsed.data ?? [];
    return Array.isArray(venues) ? venues.filter((v: any) => v?.name) : [];
  } catch (e) {
    console.error("parse fail", e);
    return [];
  }
}

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ro&q=${encodeURIComponent(query)}`;
    const r = await fetch(url, { headers: { "User-Agent": "OxidatiiBot/1.0 (oxidatii.ro)" } });
    if (!r.ok) return null;
    const j: any = await r.json();
    if (!j?.[0]) return null;
    return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) };
  } catch { return null; }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function processCity(city: { id: string; name: string; slug: string; lat: number; lng: number }) {
  console.log(`\n=== ${city.name} ===`);
  const queries = [
    `cele mai bune cluburi din ${city.name}`,
    `baruri și terase ${city.name}`,
  ];

  const allMarkdown: string[] = [];
  for (const q of queries) {
    try {
      const res: any = await fc.search(q, {
        limit: 4,
        lang: "ro",
        country: "ro",
        scrapeOptions: { formats: ["markdown"] },
      });
      const items = res?.web ?? res?.data ?? [];
      for (const it of items) {
        const md = it?.markdown ?? it?.content ?? "";
        if (md) allMarkdown.push(`# ${it.title ?? ""}\n${md}`);
      }
    } catch (e: any) {
      console.warn(`search fail (${q}):`, e?.message ?? e);
    }
    await sleep(300);
  }

  if (!allMarkdown.length) { console.log("no markdown"); return 0; }

  const combined = allMarkdown.join("\n\n---\n\n");
  const venues = await aiExtract(city.name, combined);
  console.log(`AI extracted: ${venues.length}`);
  if (!venues.length) return 0;

  // dedupe by name
  const seen = new Set<string>();
  const uniq = venues.filter(v => {
    const k = slugify(v.name);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // check existing in DB to avoid dup
  const { data: existing } = await sb.from("venues").select("slug").eq("city_id", city.id);
  const existingSlugs = new Set((existing ?? []).map((v: any) => v.slug));

  let inserted = 0;
  for (const v of uniq) {
    const baseSlug = slugify(v.name);
    let slug = `${baseSlug}-${city.slug}`;
    if (existingSlugs.has(slug)) continue;

    // geocode
    const q = v.address
      ? `${v.name}, ${v.address}, ${city.name}, Romania`
      : `${v.name}, ${city.name}, Romania`;
    const coords = await geocode(q);
    await sleep(1100); // nominatim 1 req/sec

    const lat = coords?.lat ?? city.lat + (Math.random() - 0.5) * 0.03;
    const lng = coords?.lng ?? city.lng + (Math.random() - 0.5) * 0.03;

    const type = ["club", "bar", "pub", "terasa", "restaurant"].includes(v.type ?? "")
      ? v.type
      : "bar";

    const { error } = await sb.from("venues").insert({
      city_id: city.id,
      slug,
      name: v.name.slice(0, 120),
      type,
      description: v.description?.slice(0, 500) ?? null,
      address: v.address?.slice(0, 300) ?? null,
      lat, lng,
      verified: !!coords,
    });
    if (error) {
      console.warn(`insert fail (${v.name}):`, error.message);
    } else {
      inserted++;
      existingSlugs.add(slug);
    }
  }
  console.log(`inserted ${inserted}`);
  return inserted;
}

async function main() {
  const { data: cities } = await sb.from("cities").select("id, name, slug, lat, lng").order("chaos_level", { ascending: false });
  if (!cities) throw new Error("no cities");
  let total = 0;
  for (const c of cities) {
    total += await processCity({ ...c, lat: Number(c.lat), lng: Number(c.lng) });
  }
  console.log(`\nDONE — inserted ${total} venues total`);
}

main().catch(e => { console.error(e); process.exit(1); });

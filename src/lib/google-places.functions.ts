import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  primaryType?: string;
  types?: string[];
};

export type NightlifePlace = {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  address: string | null;
};

const NIGHTLIFE_TYPES = ["bar", "night_club", "pub"] as const;

function mapType(primary?: string, types?: string[]): string {
  const all = [primary, ...(types ?? [])].filter(Boolean) as string[];
  if (all.includes("night_club")) return "club";
  if (all.includes("pub")) return "pub";
  if (all.includes("bar")) return "bar";
  if (all.includes("restaurant")) return "bar";
  return "bar";
}

export const searchNightlifeNearby = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { lat: number; lng: number; radiusM?: number }): {
      lat: number;
      lng: number;
      radiusM: number;
    } => {
      const lat = Number(input.lat);
      const lng = Number(input.lng);
      if (!isFinite(lat) || !isFinite(lng)) throw new Error("Coordonate invalide");
      const radiusM = Math.min(50_000, Math.max(500, Number(input.radiusM ?? 5000)));
      return { lat, lng, radiusM };
    },
  )
  .handler(async ({ data }): Promise<NightlifePlace[]> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gmKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !gmKey) throw new Error("Google Maps connector nu e configurat");

    const res = await fetch(
      "https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchNearby",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": gmKey,
          "Content-Type": "application/json",
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.types",
        },
        body: JSON.stringify({
          includedTypes: NIGHTLIFE_TYPES,
          maxResultCount: 20,
          rankPreference: "POPULARITY",
          locationRestriction: {
            circle: {
              center: { latitude: data.lat, longitude: data.lng },
              radius: data.radiusM,
            },
          },
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`Google Places searchNearby failed [${res.status}]: ${body}`);
      throw new Error(`Google Places [${res.status}]: ${body.slice(0, 200)}`);
    }

    const payload = (await res.json()) as { places?: GooglePlace[] };
    const places = payload.places ?? [];

    const out: NightlifePlace[] = [];
    for (const p of places) {
      const name = p.displayName?.text?.trim();
      const lat = p.location?.latitude;
      const lng = p.location?.longitude;
      if (!name || typeof lat !== "number" || typeof lng !== "number") continue;
      out.push({
        id: `gp:${p.id}`,
        name,
        type: mapType(p.primaryType, p.types),
        lat,
        lng,
        address: p.formattedAddress?.trim() || null,
      });
    }
    return out;
  });

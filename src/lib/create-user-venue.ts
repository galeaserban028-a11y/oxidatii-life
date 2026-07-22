import { supabase } from "@/integrations/supabase/client";
import { createUserVenueFn } from "@/lib/venue.functions";

export type VenueType = "club" | "bar" | "terasa" | "after" | "pub";

export type CreatedVenue = {
  id: string;
  name: string;
  city?: { name: string } | null;
};

function distKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestCityId(
  lat: number,
  lng: number,
  cities: Array<{ id: string; lat: number | null; lng: number | null }>,
): string | null {
  const withCoords = cities.filter(
    (c): c is { id: string; lat: number; lng: number } =>
      typeof c.lat === "number" && typeof c.lng === "number",
  );
  if (!withCoords.length) return cities[0]?.id ?? null;
  return [...withCoords].sort(
    (a, b) => distKm(lat, lng, a.lat, a.lng) - distKm(lat, lng, b.lat, b.lng),
  )[0].id;
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "loc"
  );
}

/** Create a venue with GPS — server (service role) → RPC → direct insert. */
export async function createUserVenue(input: {
  name: string;
  type: VenueType;
  cityId: string;
  lat: number;
  lng: number;
  address?: string | null;
}): Promise<CreatedVenue> {
  const name = input.name.trim();
  const payload = {
    name,
    type: input.type,
    cityId: input.cityId,
    lat: input.lat,
    lng: input.lng,
    address: input.address?.trim() || null,
  };

  // 1) ServerFn with service role — works without SQL migration (Lovable Cloud).
  try {
    const row = await createUserVenueFn({ data: payload });
    if (row?.id) return row as CreatedVenue;
  } catch (e) {
    console.warn("createUserVenueFn failed, trying RPC/insert", e);
  }

  // 2) Optional RPC if applied later
  const { data: rpcData, error: rpcErr } = await supabase.rpc("create_user_venue", {
    _name: name,
    _type: input.type,
    _city_id: input.cityId,
    _lat: input.lat,
    _lng: input.lng,
    _address: payload.address,
  });

  if (!rpcErr && rpcData) {
    const id = typeof rpcData === "string" ? rpcData : (rpcData as { id?: string }).id;
    if (id) {
      const { data: venue, error: fetchErr } = await supabase
        .from("venues")
        .select("id, name, city:cities(name)")
        .eq("id", id)
        .single();
      if (!fetchErr && venue) return venue as unknown as CreatedVenue;
    }
  }

  // 3) Direct insert (works only if RLS allows)
  const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 8)}`;
  const { data, error } = await supabase
    .from("venues")
    .insert({
      name,
      slug,
      type: input.type,
      city_id: input.cityId,
      lat: input.lat,
      lng: input.lng,
      address: payload.address,
    })
    .select("id, name, city:cities(name)")
    .single();
  if (error) throw error;
  return data as unknown as CreatedVenue;
}

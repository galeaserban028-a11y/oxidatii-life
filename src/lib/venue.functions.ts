import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type VenueType = "club" | "bar" | "terasa" | "after" | "pub";

const TYPES = new Set<string>(["club", "bar", "terasa", "after", "pub"]);

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

/**
 * Create venue via service role (bypasses RLS).
 * Used because Lovable Cloud DB isn't reachable from the user's Supabase dashboard.
 * Native SPA calls https://oxidatii.life/_serverFn after deploy.
 */
export const createUserVenueFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      name: string;
      type: VenueType;
      cityId: string;
      lat: number;
      lng: number;
      address?: string | null;
    }) => {
      const name = (data.name ?? "").trim();
      if (name.length < 2) throw new Error("Pune un nume.");
      if (!TYPES.has(data.type)) throw new Error("Tip invalid.");
      if (!data.cityId) throw new Error("Oraș lipsă.");
      if (
        typeof data.lat !== "number" ||
        typeof data.lng !== "number" ||
        data.lat < -90 ||
        data.lat > 90 ||
        data.lng < -180 ||
        data.lng > 180
      ) {
        throw new Error("Coordonate GPS invalide.");
      }
      return {
        name,
        type: data.type,
        cityId: data.cityId,
        lat: data.lat,
        lng: data.lng,
        address: data.address?.trim() || null,
      };
    },
  )
  .handler(async ({ data, context }) => {
    void context.userId; // auth required; insert is trusted via service role
    const slug = `${slugify(data.name)}-${Math.random().toString(36).slice(2, 8)}`;

    const { data: row, error } = await supabaseAdmin
      .from("venues")
      .insert({
        name: data.name,
        slug,
        type: data.type,
        city_id: data.cityId,
        lat: data.lat,
        lng: data.lng,
        address: data.address,
      })
      .select("id, name, city:cities(name)")
      .single();

    if (error || !row) throw new Error(error?.message ?? "Nu s-a putut adăuga locația.");
    return row as { id: string; name: string; city: { name: string } | null };
  });

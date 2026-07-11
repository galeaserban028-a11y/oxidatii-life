import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/app/admin/places")({
  component: AdminPlaces,
});

type Tab = "venues" | "cities" | "streets";

function AdminPlaces() {
  const [tab, setTab] = useState<Tab>("venues");
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["admin-places", tab],
    queryFn: async () => {
      if (tab === "venues") {
        const { data } = await supabase
          .from("venues")
          .select("id, name, type, address, slug, verified, cities:city_id(name)")
          .order("name")
          .limit(200);
        return data ?? [];
      }
      if (tab === "cities") {
        const { data } = await supabase
          .from("cities")
          .select("id, name, slug, country, region, chaos_level")
          .order("name")
          .limit(200);
        return data ?? [];
      }
      const { data } = await supabase
        .from("streets")
        .select("id, name, slug, cities:city_id(name)")
        .order("name")
        .limit(200);
      return data ?? [];
    },
  });

  const del = async (table: "venues" | "cities" | "streets", id: string) => {
    if (!confirm("Șterg?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Șters");
    qc.invalidateQueries({ queryKey: ["admin-places"] });
  };

  const addCity = async () => {
    const name = prompt("Nume oraș:");
    if (!name) return;
    const slug = prompt("Slug (ex: bucuresti):", name.toLowerCase().replace(/\s+/g, "-"));
    if (!slug) return;
    const lat = parseFloat(prompt("Lat:", "44.43") ?? "");
    const lng = parseFloat(prompt("Lng:", "26.10") ?? "");
    const { error } = await supabase.from("cities").insert({ name, slug, lat, lng });
    if (error) return toast.error(error.message);
    toast.success("Adăugat");
    qc.invalidateQueries({ queryKey: ["admin-places"] });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {(["venues", "cities", "streets"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-widest border ${
              tab === k
                ? "bg-foreground text-background border-foreground"
                : "border-foreground/15 hover:bg-foreground/10"
            }`}
          >
            {k}
          </button>
        ))}
        {tab === "cities" && (
          <button
            onClick={addCity}
            className="ml-auto px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-widest border border-neon-mint/30 text-neon-mint hover:bg-neon-mint/10 flex items-center gap-1"
          >
            <Plus size={11} /> Oraș
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {(
          data as
            | Array<
                Record<string, unknown> & {
                  id: string;
                  name: string;
                  type?: string;
                  address?: string;
                  slug?: string;
                  verified?: boolean;
                  country?: string;
                  region?: string;
                  chaos_level?: number;
                  cities?: { name?: string } | null;
                }
              >
            | undefined
        )?.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3 flex items-center gap-3"
          >
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm truncate">{row.name}</div>
              <div className="font-mono text-[10px] text-muted-foreground truncate">
                {tab === "venues" &&
                  `${row.type} · ${row.cities?.name ?? "—"} · ${row.address ?? "—"}${row.verified ? " · ✓" : ""}`}
                {tab === "cities" &&
                  `${row.slug} · ${row.country}${row.region ? " · " + row.region : ""} · chaos ${row.chaos_level}`}
                {tab === "streets" && `${row.slug} · ${row.cities?.name ?? "—"}`}
              </div>
            </div>
            <button
              onClick={() => del(tab, row.id)}
              className="p-2 rounded-lg border border-neon-crimson/30 text-neon-crimson hover:bg-neon-crimson/10"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

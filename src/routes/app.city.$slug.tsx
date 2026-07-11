import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/app/city/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("cities")
      .select("id,name,slug,region")
      .eq("slug", params.slug)
      .maybeSingle();
    return { city: data };
  },
  head: ({ params, loaderData }) => {
    const c = loaderData?.city as { name?: string; region?: string | null } | null | undefined;
    const name = c?.name ?? "Oraș";
    const title = `${name} — Nightlife live · OXIDAȚII`;
    const desc = `Vezi cluburile, străzile și șprițurile live din ${name}${c?.region ? `, ${c.region}` : ""} pe OXIDAȚII. Cine, unde și când — în timp real.`;
    const url = `https://oxidatii.lovable.app/app/city/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc.slice(0, 158) },
        { property: "og:title", content: title },
        { property: "og:description", content: desc.slice(0, 158) },
        { property: "og:url", content: url },
        { property: "og:type", content: "place" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CityPage,
});

function CityPage() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["city", slug],
    queryFn: async () => {
      const { data: city, error } = await supabase
        .from("cities")
        .select("id,name,slug,region,chaos_level")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      const { data: streets } = await supabase
        .from("streets")
        .select("id,name,slug,venues:venues(count)")
        .eq("city_id", city.id)
        .order("name");
      return { city, streets: streets ?? [] };
    },
  });

  if (isLoading || !data)
    return <div className="p-6 text-sm text-muted-foreground">Se încarcă...</div>;

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <Link
        to="/app/map"
        className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-muted-foreground"
      >
        <ArrowLeft size={14} /> înapoi
      </Link>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon-green">
          {data.city.region}
        </div>
        <h1 className="font-display font-black text-4xl">{data.city.name}</h1>
        <div className="font-mono text-xs text-muted-foreground mt-1">
          chaos {Number(data.city.chaos_level).toFixed(1)} · {data.streets.length} străzi active
        </div>
      </div>

      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
          // străzi
        </div>
        <div className="space-y-2">
          {(data.streets as Array<{ id: string; name: string; slug: string; venues?: Array<{ count: number }> }>).map((s) => {
            const count = s.venues?.[0]?.count ?? 0;
            return (
              <Link
                key={s.id}
                to="/app/street/$id"
                params={{ id: s.id }}
                className="block rounded-xl bg-foreground/5 border border-foreground/10 p-3 active:scale-[0.98] transition"
              >
                <div className="flex items-center justify-between">
                  <div className="font-display font-bold text-sm">{s.name}</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-neon-purple">
                    {count} venue{count !== 1 ? "s" : ""}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const archivo = { fontFamily: '"Archivo Black", system-ui, sans-serif', letterSpacing: "-0.01em" } as const;

export type AdCard = {
  id: string;
  title: string | null;
  body: string | null;
  brand: string | null;
  logo: string | null;
  cover: string | null;
  theme: string;
};

// Shared loader used by /app/faze and /app/feed so paying clubs get
// surfaced in both feeds for one campaign cost.
export function usePromoCards() {
  return useQuery({
    queryKey: ["faze-promo-cards"],
    queryFn: async (): Promise<AdCard[]> => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("campaigns")
        .select("id, title, body, theme_color, image_urls, business_accounts!inner(logo_url, cover_url, brand_name), venues(name)")
        .eq("status", "active")
        .lte("starts_at", nowIso)
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
        .limit(10);
      return ((data ?? []) as any[]).map((c) => ({
        id: c.id as string,
        title: (c.title as string | null) ?? null,
        body: (c.body as string | null) ?? null,
        brand: (c.venues?.name ?? c.business_accounts?.brand_name ?? null) as string | null,
        logo: (c.business_accounts?.logo_url ?? null) as string | null,
        cover: ((c.image_urls?.[0] as string | undefined) ?? c.business_accounts?.cover_url ?? null) as string | null,
        theme: (c.theme_color ?? "#ff8c31") as string,
      }));
    },
    refetchInterval: 120_000,
  });
}

export function SponsoredFazaCard({ ad }: { ad: AdCard }) {
  const navigate = useNavigate();
  const handle = ad.brand ?? "promovat";
  return (
    <article
      className="rounded-3xl border overflow-hidden shadow-[0_4px_24px_-12px_rgba(0,0,0,0.6)] animate-fade-in"
      style={{ borderColor: `${ad.theme}55`, background: `linear-gradient(180deg, ${ad.theme}10, transparent 60%)` }}
    >
      <button
        onClick={() => navigate({ to: "/app/promo/$id", params: { id: ad.id } })}
        className="w-full text-left"
      >
        <div className="flex items-center gap-3 px-3.5 py-3">
          <div className="p-[2px] rounded-full" style={{ background: `linear-gradient(135deg, #ffd166, ${ad.theme})` }}>
            <div className="p-[2px] rounded-full bg-background">
              {ad.logo ? (
                <img src={ad.logo} alt={handle} className="size-9 rounded-full object-cover" />
              ) : (
                <div className="size-9 rounded-full flex items-center justify-center text-xs font-black" style={{ color: ad.theme, background: "rgba(255,255,255,0.05)" }}>
                  {handle[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-[14px] font-semibold truncate">{handle}</div>
            <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
              <span style={{ color: ad.theme }}>●</span> sponsorizat
            </div>
          </div>
          <span
            className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-[0.16em] uppercase"
            style={{ background: ad.theme, color: "#06070a" }}
          >
            AD
          </span>
        </div>

        {ad.cover && (
          <div className="relative bg-black">
            <img src={ad.cover} alt={ad.title ?? handle} className="w-full aspect-square object-cover" loading="lazy" />
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/85 to-transparent">
              {ad.title && <div className="text-white text-lg font-black leading-tight" style={archivo}>{ad.title}</div>}
              {ad.body && <div className="text-white/85 text-[12px] mt-1 line-clamp-2">{ad.body}</div>}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[12px] text-foreground/80">Vezi oferta →</span>
          <span
            className="text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full"
            style={{ background: `${ad.theme}22`, color: ad.theme }}
          >
            Deschide
          </span>
        </div>
      </button>
    </article>
  );
}

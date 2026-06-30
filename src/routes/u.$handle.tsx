import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Sparkles, Trophy, MapPin } from "lucide-react";

type PublicProfile = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  rank: string | null;
  aura: number | null;
  lifetime_sprits: number | null;
  current_streak: number | null;
  active_frame_id: string | null;
  city_name: string | null;
  city_slug: string | null;
};

const SITE = "https://oxidatii.life";

export const Route = createFileRoute("/u/$handle")({
  loader: async ({ params }) => {
    const { data, error } = await supabase.rpc("get_public_profile", {
      _handle: params.handle.toLowerCase(),
    });
    if (error) {
      console.error("[public profile] rpc error", error);
    }
    const profile = (data && Array.isArray(data) && data[0]) || null;
    if (!profile) throw notFound();
    return { profile: profile as PublicProfile };
  },
  head: ({ params, loaderData }) => {
    const p = loaderData?.profile;
    const handle = p?.handle ? `@${p.handle}` : params.handle;
    const display = p?.display_name ?? handle;
    const title = `${display} (${handle}) — OXIDAȚII`;
    const desc = p?.bio
      ? String(p.bio).slice(0, 155)
      : `Profilul ${handle} pe OXIDAȚII — sprițuri, check-in-uri și momente din nightlife.`;
    const url = `${SITE}/u/${params.handle.toLowerCase()}`;
    const image = p?.avatar_url ?? undefined;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "profile" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
              { name: "twitter:card", content: "summary_large_image" },
            ]
          : [{ name: "twitter:card", content: "summary" }]),
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: p
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ProfilePage",
                mainEntity: {
                  "@type": "Person",
                  name: display,
                  alternateName: handle,
                  description: desc,
                  image: image,
                  url,
                },
              }),
            },
          ]
        : [],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-background text-foreground">
      <div className="text-center space-y-3 max-w-sm">
        <h1 className="text-2xl font-display font-black">Profil indisponibil</h1>
        <p className="text-sm text-muted-foreground">
          Profilul nu există sau e privat.
        </p>
        <Link to="/" className="inline-block mt-4 px-5 py-2 rounded-full bg-foreground text-background text-sm font-bold">
          Descoperă OXIDAȚII
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-background text-foreground">
      <div className="text-center space-y-3 max-w-sm">
        <h1 className="text-2xl font-display font-black">Ceva n-a mers</h1>
        <p className="text-sm text-muted-foreground">{String(error?.message ?? error)}</p>
      </div>
    </div>
  ),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { profile: p } = Route.useLoaderData();
  const handle = p.handle ? `@${p.handle}` : "anonim";
  const display = p.display_name ?? handle;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="px-5 py-4 flex items-center justify-between max-w-2xl mx-auto">
        <Link to="/" className="font-display font-black tracking-tight text-lg">
          OXIDAȚII
        </Link>
        <Link
          to="/login"
          className="text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full bg-foreground text-background"
        >
          Intră în app
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-5 pb-20 pt-6">
        <section className="relative overflow-hidden rounded-3xl border border-foreground/10 bg-gradient-to-br from-neon-purple/15 via-neon-crimson/10 to-transparent p-6">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              {p.avatar_url ? (
                <img
                  src={p.avatar_url}
                  alt={display}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-foreground/10"
                  loading="eager"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-neon-purple to-neon-crimson" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-display font-black leading-tight truncate">
                {display}
              </h1>
              <div className="text-sm text-muted-foreground truncate">{handle}</div>
              {p.city_name && (
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {p.city_name}
                </div>
              )}
            </div>
          </div>

          {p.bio && (
            <p className="mt-5 text-[15px] leading-relaxed text-foreground/90">{p.bio}</p>
          )}

          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat icon={<Sparkles className="h-4 w-4" />} label="Aură" value={p.aura ?? 0} />
            <Stat icon={<Flame className="h-4 w-4" />} label="Sprițuri" value={p.lifetime_sprits ?? 0} />
            <Stat icon={<Trophy className="h-4 w-4" />} label="Streak" value={p.current_streak ?? 0} />
          </div>
        </section>

        <section className="mt-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Vrei să dai follow lui {handle}, să trimiți spriț sau să vezi harta live?
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 rounded-full bg-gradient-to-r from-neon-purple to-neon-crimson text-white font-display font-black uppercase tracking-widest text-sm shadow-[0_10px_40px_-10px_rgba(198,107,255,0.6)]"
          >
            Intră în OXIDAȚII
          </Link>
        </section>
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-foreground/[0.06] border border-foreground/10 px-3 py-3 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display font-black text-xl">{value.toLocaleString("ro-RO")}</div>
    </div>
  );
}

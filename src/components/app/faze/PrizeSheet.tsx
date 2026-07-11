import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { archivo, hind, lastWeekendRange, SHEET_BOTTOM } from "./shared";

export function PrizeSheet({ onClose }: { onClose: () => void }) {
  const { data: winner, isLoading } = useQuery({
    queryKey: ["faze-winner"],
    queryFn: async () => {
      const { from, to } = lastWeekendRange();
      const { data: photos } = await supabase
        .from("venue_photos")
        .select("id, photo_url, caption, taken_at, user_id, venue_id")
        .gte("taken_at", from)
        .lte("taken_at", to);
      if (!photos || photos.length === 0) return null;
      const ids = photos.map((p) => p.id);
      const [{ data: likes }, { data: comments }, { data: reposts }] = await Promise.all([
        supabase.from("photo_likes").select("photo_id").in("photo_id", ids),
        supabase.from("photo_comments").select("photo_id").in("photo_id", ids),
        supabase.from("photo_reposts").select("photo_id").in("photo_id", ids),
      ]);
      const tally = (rows: Array<{ photo_id: string }> | null) => {
        const m = new Map<string, number>();
        (rows ?? []).forEach((r) => m.set(r.photo_id, (m.get(r.photo_id) ?? 0) + 1));
        return m;
      };
      const lm = tally(likes),
        cm = tally(comments),
        rm = tally(reposts);
      const scored = photos.map((p) => ({
        ...p,
        likes: lm.get(p.id) ?? 0,
        comments: cm.get(p.id) ?? 0,
        reposts: rm.get(p.id) ?? 0,
        score: (lm.get(p.id) ?? 0) + (cm.get(p.id) ?? 0),
      }));
      scored.sort((a, b) => b.score - a.score || b.reposts - a.reposts);
      const top = scored[0];
      if (!top || top.score === 0) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url")
        .eq("id", top.user_id)
        .maybeSingle();
      const { data: venue } = await supabase
        .from("venues")
        .select("id, name")
        .eq("id", top.venue_id)
        .maybeSingle();
      return { ...top, profile, venue };
    },
  });

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end"
      onClick={onClose}
      style={hind}
    >
      <div
        className="w-full bg-background border-t border-foreground/10 rounded-t-3xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: `calc(90dvh - ${SHEET_BOTTOM})`, marginBottom: SHEET_BOTTOM }}
      >
        <div className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute -top-16 -right-16 size-56 rounded-full bg-sunset-amber/30 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-20 -left-16 size-56 rounded-full bg-sunset-magenta/30 blur-3xl"
          />
          <div className="relative px-5 pt-5 pb-4 flex items-start justify-between">
            <div>
              <div
                className="text-[10px] uppercase tracking-[0.22em] text-sunset-amber"
                style={archivo}
              >
                Premiul săptămânii
              </div>
              <div className="mt-2 text-4xl leading-none" style={archivo}>
                <span className="text-gradient-sunset">100 lei</span>
              </div>
              <div className="text-[12px] text-muted-foreground mt-1.5">
                pe Revolut · plătit luni dimineața
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Închide"
              className="text-muted-foreground text-2xl leading-none w-9 h-9 grid place-items-center rounded-full hover:bg-foreground/10"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
          <section className="rounded-2xl border border-sunset-amber/30 bg-gradient-to-br from-sunset-amber/10 to-sunset-orange/5 overflow-hidden">
            <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
              <div
                className="text-[10px] uppercase tracking-[0.18em] text-sunset-amber flex items-center gap-1.5"
                style={archivo}
              >
                <span>🏆</span> Câștigător săptămâna trecută
              </div>
            </div>

            {isLoading ? (
              <div className="px-4 pb-4">
                <div className="h-16 rounded-xl bg-foreground/[0.04] animate-pulse" />
              </div>
            ) : !winner ? (
              <div className="px-4 pb-4 flex items-center gap-3">
                <div className="size-12 rounded-full bg-foreground/10 grid place-items-center text-lg">
                  🤷
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold">Niciun câștigător încă</div>
                  <div className="text-[12px] text-muted-foreground">
                    Nu s-au postat faze cu interacțiuni weekend-ul trecut.
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 pb-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Link
                    to="/app/user/$id"
                    params={{ id: winner.user_id }}
                    onClick={onClose}
                    className="shrink-0"
                  >
                    <div
                      className="p-[2px] rounded-full"
                      style={{ background: "var(--gradient-sunset)" }}
                    >
                      <div className="p-[2px] rounded-full bg-background">
                        {winner.profile?.avatar_url ? (
                          <img
                            src={winner.profile.avatar_url}
                            alt=""
                            className="size-14 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="size-14 rounded-full bg-foreground/10 grid place-items-center text-lg uppercase"
                            style={archivo}
                          >
                            {(winner.profile?.display_name ??
                              winner.profile?.handle ??
                              "?")[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      to="/app/user/$id"
                      params={{ id: winner.user_id }}
                      onClick={onClose}
                      className="text-[16px] font-semibold truncate block"
                    >
                      {winner.profile?.display_name ?? winner.profile?.handle ?? "Anonim"}
                    </Link>
                    {winner.profile?.handle && (
                      <div className="text-[12px] text-muted-foreground truncate">
                        @{winner.profile.handle}
                      </div>
                    )}
                    {winner.venue?.name && (
                      <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                        📍 {winner.venue.name}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sunset-amber text-base leading-none" style={archivo}>
                      100 lei
                    </div>
                    <div
                      className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1"
                      style={archivo}
                    >
                      câștig
                    </div>
                  </div>
                </div>

                {winner.photo_url && (
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                    <img
                      src={winner.photo_url}
                      alt={winner.caption ?? ""}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 to-transparent">
                      <div
                        className="flex items-center gap-3 text-[11px] text-white/95"
                        style={archivo}
                      >
                        <span className="uppercase tracking-widest">❤ {winner.likes}</span>
                        <span className="uppercase tracking-widest">💬 {winner.comments}</span>
                        <span className="uppercase tracking-widest">↻ {winner.reposts}</span>
                      </div>
                    </div>
                  </div>
                )}
                {winner.caption && (
                  <div className="text-[13px] text-foreground/90 leading-snug">
                    "{winner.caption}"
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div
              className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
              style={archivo}
            >
              Cum câștigi
            </div>
            <ol className="space-y-2.5">
              {[
                "Trebuie neapărat să ai abonament PRO activ ca să intri în concurs. Fără PRO, faza nu se califică.",
                "Postează o fază reală dintr-un local între vineri 18:00 și duminică 23:59 (ora României).",
                "Faza trebuie să aibă locația selectată și să respecte regulile comunității (fără violență, fără minori, fără conținut sexual).",
                "Câștigă faza cu cele mai multe aprecieri + comentarii combinate. La egalitate, decide repostările.",
                "Trebuie să ai cel puțin 18 ani și un cont OXIDAȚII verificat (handle + avatar).",
                "Premiul se trimite pe Revolut luni până la ora 12:00, pe numărul confirmat prin DM.",
              ].map((t, i) => (
                <li key={i} className="flex gap-3 text-[13px] leading-relaxed">
                  <span
                    className="shrink-0 size-6 rounded-full bg-gradient-to-br from-sunset-amber to-sunset-orange text-black text-[11px] grid place-items-center"
                    style={archivo}
                  >
                    {i + 1}
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>

            <Link
              to="/app/premium"
              onClick={onClose}
              className="flex items-center gap-3 rounded-2xl border border-sunset-amber/40 bg-gradient-to-r from-sunset-amber/15 via-sunset-orange/10 to-sunset-magenta/15 p-3.5 active:scale-[0.99] transition"
            >
              <div
                className="shrink-0 size-10 rounded-xl bg-gradient-to-br from-sunset-amber to-sunset-orange text-black grid place-items-center text-base"
                style={archivo}
              >
                ★
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-[9px] uppercase tracking-[0.22em] text-sunset-amber"
                  style={archivo}
                >
                  Necesită PRO
                </div>
                <div className="text-[13px] leading-tight mt-0.5">
                  Doar utilizatorii cu abonament <span className="font-semibold">PRO</span> pot
                  câștiga cei 100 lei.
                </div>
              </div>
              <span className="shrink-0 text-sunset-amber text-lg" aria-hidden>
                →
              </span>
            </Link>
          </section>

          <section className="rounded-2xl border border-sunset-orange/25 bg-sunset-orange/5 p-4 space-y-2">
            <div
              className="text-[10px] uppercase tracking-[0.18em] text-sunset-orange"
              style={archivo}
            >
              Te descalifică
            </div>
            <ul className="text-[12.5px] leading-relaxed space-y-1 text-foreground/85">
              <li>· Aprecieri/comentarii cumpărate sau conturi false</li>
              <li>· Conținut reupload care nu îți aparține</li>
              <li>· Reclamații verificate de la local sau persoane</li>
            </ul>
          </section>

          <div
            className="text-[10px] uppercase tracking-widest text-muted-foreground text-center pt-2"
            style={archivo}
          >
            OXIDAȚII · concurs săptămânal · fără înscriere
          </div>
        </div>
      </div>
    </div>
  );
}

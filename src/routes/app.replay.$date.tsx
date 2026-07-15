import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Camera, Wine, Users, Sparkles, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/replay/$date")({
  head: () => ({ meta: [{ title: "Replay · OXIDAȚII" }] }),
  component: ReplayDetailPage,
});

function formatDateRo(s: string): string {
  return new Date(s).toLocaleDateString("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function ReplayDetailPage() {
  const { date } = Route.useParams();

  type ReplayData = {
    ok?: boolean;
    error?: string;
    top_venue?: string | null;
    venues_count: number;
    sprit_proofs: number;
    photos: Array<{ id: string; photo_url: string }>;
    parties: Array<{ id: string; title?: string | null }>;
    checkins: Array<{ id: string; venue_name?: string | null; created_at: string }>;
  };
  const replayQuery = useQuery({
    queryKey: ["replay-data", date],
    queryFn: async (): Promise<ReplayData> => {
      const { data, error } = await supabase.rpc("get_replay_data", { _date: date });
      if (error) throw error;
      return data as unknown as ReplayData;
    },
  });

  const data = replayQuery.data;
  const unlocked = data?.ok && data.error !== "not_unlocked";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-background/95 border-b border-foreground/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/app/replay" className="p-2 -ml-2 hover:bg-foreground/5 rounded-lg">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="font-display uppercase tracking-widest text-sm">Replay</div>
            <div className="text-xs text-muted-foreground">{formatDateRo(date)}</div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {replayQuery.isLoading ? (
          <div className="text-center text-sm text-muted-foreground py-12">Se încarcă…</div>
        ) : !unlocked ? (
          <div className="text-center text-sm text-muted-foreground py-12">
            Această noapte nu e deblocată încă.{" "}
            <Link to="/app/replay" className="text-neon-violet underline">
              Întoarce-te
            </Link>
          </div>
        ) : (
          <>
            {/* Wrap card — shareable on stories */}
            <div
              id="replay-card"
              className="relative aspect-[9/16] rounded-3xl overflow-hidden border border-neon-violet/30 bg-gradient-to-br from-neon-violet/30 via-background to-neon-cyan/20 p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={14} className="text-neon-violet" />
                  <span className="text-[10px] uppercase tracking-[0.3em] font-display text-neon-violet">
                    Oxidații · Replay
                  </span>
                </div>
                <h2 className="font-display font-black text-3xl leading-tight">
                  {formatDateRo(date)}
                </h2>
              </div>

              <div className="space-y-4">
                {data.top_venue && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                      Centrul gravitațional
                    </div>
                    <div className="font-display font-black text-2xl">{data.top_venue}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Stat icon={<MapPin size={14} />} label="Venue-uri" value={data.venues_count} />
                  <Stat icon={<Camera size={14} />} label="Poze" value={data.photos.length} />
                  <Stat icon={<Wine size={14} />} label="Spritz" value={data.sprit_proofs} />
                  <Stat icon={<Users size={14} />} label="Petreceri" value={data.parties.length} />
                </div>
              </div>

              <div className="text-[10px] uppercase tracking-[0.3em] font-display text-muted-foreground text-center">
                oxidatii.life
              </div>
            </div>

            {/* Detail lists */}
            {data.checkins.length > 0 && (
              <Section title="Traseu">
                <div className="space-y-2">
                  {data.checkins.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 px-3 py-2 bg-card border border-foreground/10 rounded-lg"
                    >
                      <MapPin size={14} className="text-neon-violet shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-bold text-sm truncate">
                          {c.venue_name ?? "Venue necunoscut"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(c.created_at).toLocaleTimeString("ro-RO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {data.photos.length > 0 && (
              <Section title="Poze">
                <div className="grid grid-cols-3 gap-2">
                  {data.photos.map((p) => (
                    <img
                      key={p.id}
                      src={p.photo_url}
                      alt=""
                      className="aspect-square object-cover rounded-lg border border-foreground/10"
                      loading="lazy"
                    />
                  ))}
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="px-3 py-2 bg-background/40 border border-foreground/10 rounded-lg">
      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-widest">
        {icon} {label}
      </div>
      <div className="font-display font-black text-xl">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-display uppercase tracking-widest text-xs text-muted-foreground mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

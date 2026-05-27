import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateChaosEvents } from "@/lib/chaos.functions";

type Vibe = "chaos" | "stealth" | "legendary" | "blackout" | "duel";
type ChaosEvent = {
  tag: string;
  title: string;
  text: string;
  reward: string;
  risk: "low" | "medium" | "high" | "legendary";
};

const districts = ["CENTRU", "VICTORIEI", "FLOREASCA", "UNIRII", "COTROCENI", "PIPERA", "OBOR"];
const vibes: { key: Vibe; label: string; color: string }[] = [
  { key: "chaos", label: "CHAOS", color: "var(--neon-purple)" },
  { key: "stealth", label: "STEALTH", color: "var(--neon-chrome)" },
  { key: "legendary", label: "LEGENDARY", color: "var(--neon-green)" },
  { key: "blackout", label: "BLACKOUT", color: "var(--neon-crimson)" },
  { key: "duel", label: "DUEL", color: "var(--neon-blue)" },
];

const tagColor: Record<string, string> = {
  EVENT: "var(--neon-purple)",
  DUEL: "var(--neon-crimson)",
  DROP: "var(--neon-green)",
  CHAOS: "var(--neon-purple)",
  MISSION: "var(--neon-blue)",
  HUNT: "var(--neon-crimson)",
};

const riskColor: Record<string, string> = {
  low: "var(--neon-blue)",
  medium: "var(--neon-green)",
  high: "var(--neon-crimson)",
  legendary: "var(--neon-purple)",
};

export function LiveChaos() {
  const fetchEvents = useServerFn(generateChaosEvents);
  const [district, setDistrict] = useState("CENTRU");
  const [vibe, setVibe] = useState<Vibe>("chaos");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<ChaosEvent[]>([]);
  const [cinematic, setCinematic] = useState<string>("");
  const [chaosLvl, setChaosLvl] = useState<number>(0);

  async function summon() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchEvents({ data: { district, vibe } });
      setEvents(res.events);
      setCinematic(res.cinematic_line);
      setChaosLvl(res.chaos_level);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI core offline");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="live" className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="relative max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-neon-purple mb-3 flicker">
            // LIVE · OXID-CORE AI · BROADCASTING NOW
          </div>
          <h2 className="font-display font-black text-5xl md:text-7xl leading-none">
            Cheamă <span className="text-gradient-chaos">haosul.</span>
          </h2>
          <p className="mt-6 text-muted-foreground max-w-xl mx-auto">
            AI-ul scrie noaptea în timp real. Alege un cartier, alege un vibe, lasă OXID-CORE să spawneze evenimente live.
          </p>
        </div>

        {/* Controls */}
        <div className="glass rounded-2xl p-5 mb-6">
          <div className="mb-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">District</div>
            <div className="flex flex-wrap gap-2">
              {districts.map((d) => (
                <button key={d} onClick={() => setDistrict(d)}
                  className={`font-display font-bold text-xs tracking-widest px-3 py-1.5 rounded-full border transition ${
                    district === d
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Vibe</div>
            <div className="flex flex-wrap gap-2">
              {vibes.map((v) => (
                <button key={v.key} onClick={() => setVibe(v.key)}
                  className="font-display font-bold text-xs tracking-widest px-3 py-1.5 rounded-full border transition flex items-center gap-2"
                  style={{
                    borderColor: vibe === v.key ? v.color : "var(--border)",
                    color: vibe === v.key ? v.color : "var(--muted-foreground)",
                    boxShadow: vibe === v.key ? `0 0 18px ${v.color}66` : "none",
                    background: vibe === v.key ? `${v.color}11` : "transparent",
                  }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: v.color, boxShadow: `0 0 8px ${v.color}` }} />
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={summon} disabled={loading}
            className="mt-5 w-full font-display font-bold text-sm uppercase tracking-[0.25em] px-6 py-4 rounded-full text-primary-foreground glow-purple relative overflow-hidden disabled:opacity-60"
            style={{ background: "var(--gradient-chaos)" }}>
            <span className="relative z-10">
              {loading ? "OXID-CORE PROCESSING..." : "▶ Spawn live events"}
            </span>
            {loading && <span className="absolute inset-0 shimmer" />}
          </button>

          {error && (
            <div className="mt-4 font-mono text-xs text-neon-crimson border border-neon-crimson/40 rounded-lg px-3 py-2">
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Output */}
        {(loading || events.length > 0) && (
          <div className="space-y-4">
            {/* Cinematic + chaos meter */}
            <div className="glass rounded-2xl p-5 scanline relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-neon-crimson animate-pulse" />
                  <span className="font-display font-bold text-sm tracking-widest">AI BROADCAST · {district}</span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  chaos {chaosLvl}%
                </span>
              </div>
              <p className="font-display text-lg md:text-2xl leading-snug text-gradient-toxic min-h-[2.5rem]">
                {loading ? "Reading the city pulse..." : `"${cinematic}"`}
              </p>
              <div className="mt-4 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${loading ? 30 : chaosLvl}%`, background: "var(--gradient-chaos)" }} />
              </div>
            </div>

            {/* Event cards */}
            <div className="grid md:grid-cols-2 gap-3">
              {(loading ? Array.from({ length: 4 }) : events).map((ev, i) => {
                if (loading || !ev) {
                  return (
                    <div key={i} className="glass rounded-2xl p-5 h-44 relative overflow-hidden">
                      <div className="absolute inset-0 shimmer opacity-40" />
                    </div>
                  );
                }
                const e = ev as ChaosEvent;
                return (
                  <div key={i} className="glass rounded-2xl p-5 group hover:-translate-y-1 transition relative overflow-hidden"
                    style={{ borderColor: `${tagColor[e.tag] ?? "var(--border)"}44` }}>
                    <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full opacity-30 group-hover:opacity-60 transition"
                      style={{ background: `radial-gradient(circle, ${tagColor[e.tag]}, transparent 70%)` }} />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-display text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded"
                          style={{
                            background: `${tagColor[e.tag]}22`,
                            color: tagColor[e.tag],
                            border: `1px solid ${tagColor[e.tag]}55`,
                          }}>
                          {e.tag}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: riskColor[e.risk] }}>
                          ◆ {e.risk}
                        </span>
                      </div>
                      <h3 className="font-display font-black text-lg leading-tight mb-2">{e.title}</h3>
                      <p className="text-sm text-muted-foreground leading-snug">{e.text}</p>
                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-neon-green">
                          ⌬ {e.reward}
                        </span>
                        <button className="font-mono text-[10px] uppercase tracking-widest text-foreground hover:text-neon-purple transition">
                          join →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

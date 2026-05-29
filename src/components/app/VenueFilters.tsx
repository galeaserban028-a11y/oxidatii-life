import { Search, X, MapPin } from "lucide-react";

export type VenueTypeFilter = "all" | "club" | "bar" | "terasa" | "after" | "pub";

const TYPES: { id: VenueTypeFilter; label: string }[] = [
  { id: "all", label: "toate" },
  { id: "club", label: "club" },
  { id: "bar", label: "bar" },
  { id: "pub", label: "pub" },
  { id: "terasa", label: "terasă" },
  { id: "after", label: "after" },
];

const DISTANCES = [
  { id: 0, label: "oriunde" },
  { id: 1, label: "<1 km" },
  { id: 3, label: "<3 km" },
  { id: 10, label: "<10 km" },
  { id: 50, label: "<50 km" },
];

interface Props {
  query: string;
  setQuery: (v: string) => void;
  type: VenueTypeFilter;
  setType: (v: VenueTypeFilter) => void;
  cityId: string | "all";
  setCityId: (v: string | "all") => void;
  cities: { id: string; name: string }[];
  maxKm: number;
  setMaxKm: (v: number) => void;
  hasGeo: boolean;
  requestGeo: () => void;
  count: number;
}

export function VenueFilters(p: Props) {
  const reset = () => {
    p.setQuery(""); p.setType("all"); p.setCityId("all"); p.setMaxKm(0);
  };
  const isFiltered = p.query || p.type !== "all" || p.cityId !== "all" || p.maxKm > 0;

  return (
    <div className="space-y-2.5">
      {/* search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={p.query}
          onChange={(e) => p.setQuery(e.target.value)}
          placeholder="caută club, bar, oraș..."
          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-foreground/5 border border-foreground/10 text-sm font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:border-neon-green/60"
        />
        {p.query && (
          <button onClick={() => p.setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground active:scale-90">
            <X size={14} />
          </button>
        )}
      </div>

      {/* type chips */}
      <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-0.5 no-scrollbar">
        {TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => p.setType(t.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-widest border transition ${
              p.type === t.id
                ? "bg-neon-green text-background border-neon-green"
                : "bg-foreground/5 border-foreground/10 text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* distance chips */}
      <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-0.5 no-scrollbar items-center">
        <button
          onClick={p.requestGeo}
          className={`shrink-0 px-2.5 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-widest border flex items-center gap-1 ${
            p.hasGeo ? "border-neon-green/40 text-neon-green" : "border-foreground/10 text-muted-foreground"
          }`}
          title="folosește locația mea"
        >
          <MapPin size={11} /> {p.hasGeo ? "GPS on" : "GPS"}
        </button>
        {DISTANCES.map(d => (
          <button
            key={d.id}
            disabled={d.id > 0 && !p.hasGeo}
            onClick={() => p.setMaxKm(d.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-widest border transition disabled:opacity-30 ${
              p.maxKm === d.id
                ? "bg-neon-purple text-background border-neon-purple"
                : "bg-foreground/5 border-foreground/10 text-muted-foreground"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* city select */}
      <div className="flex items-center gap-2">
        <select
          value={p.cityId}
          onChange={(e) => p.setCityId(e.target.value as any)}
          className="flex-1 py-2 px-3 rounded-xl bg-foreground/5 border border-foreground/10 text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-neon-green/60"
        >
          <option value="all">// toate orașele</option>
          {p.cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="font-mono text-[10px] uppercase tracking-widest text-neon-green whitespace-nowrap">
          {p.count} loc
        </div>
      </div>

      {isFiltered && (
        <button
          onClick={reset}
          className="w-full py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest text-neon-crimson border border-neon-crimson/30 active:scale-[0.98]"
        >
          × reset filtre
        </button>
      )}
    </div>
  );
}

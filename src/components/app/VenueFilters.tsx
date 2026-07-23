import { Search, X, MapPin, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
  cities: { id: string; name: string; country?: string }[];
  country: string | "all";
  setCountry: (v: string | "all") => void;
  countries: { code: string; label: string; count: number }[];
  maxKm?: number;
  setMaxKm?: (v: number) => void;
  hasGeo?: boolean;
  requestGeo?: () => void;
  count: number;
}

export function VenueFilters(p: Props) {
  const [open, setOpen] = useState(false);
  const reset = () => {
    p.setQuery("");
    p.setType("all");
    p.setCityId("all");
    p.setMaxKm(0);
    p.setCountry("all");
  };
  const activeCount =
    (p.type !== "all" ? 1 : 0) +
    (p.cityId !== "all" ? 1 : 0) +
    (p.country !== "all" ? 1 : 0) +
    (p.maxKm > 0 ? 1 : 0);
  const isFiltered = !!p.query || activeCount > 0;

  const typeLabel = TYPES.find((t) => t.id === p.type)?.label ?? "toate";
  const citiesScoped =
    p.country === "all" ? p.cities : p.cities.filter((c) => c.country === p.country);
  const cityLabel =
    p.cityId === "all" ? "toate orașele" : (p.cities.find((c) => c.id === p.cityId)?.name ?? "");
  const distLabel = DISTANCES.find((d) => d.id === p.maxKm)?.label ?? "oriunde";
  const countryLabel =
    p.country === "all"
      ? "toate țările"
      : (p.countries.find((c) => c.code === p.country)?.label ?? p.country);

  return (
    <div className="flex items-center gap-2">
      {/* Search input — always visible */}
      <div className="relative flex-1">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={p.query}
          onChange={(e) => p.setQuery(e.target.value)}
          placeholder="caută club, bar, oraș..."
          className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-foreground/5 border border-foreground/10 text-sm font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:border-neon-green/60"
        />
        {p.query && (
          <button
            onClick={() => p.setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground active:scale-90"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter trigger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className={`relative shrink-0 h-[42px] px-3 rounded-xl border flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest transition active:scale-95 ${
              activeCount > 0
                ? "bg-neon-green text-background border-neon-green"
                : "bg-foreground/5 border-foreground/10 text-foreground"
            }`}
          >
            <SlidersHorizontal size={14} />
            filtre
            {activeCount > 0 && (
              <span className="ml-1 h-4 min-w-4 px-1 rounded-full bg-background text-neon-green text-[9px] flex items-center justify-center font-mono">
                {activeCount}
              </span>
            )}
          </button>
        </SheetTrigger>

        <SheetContent
          side="bottom"
          className="rounded-t-2xl border-t border-foreground/10 max-h-[85vh] overflow-y-auto"
        >
          <SheetHeader className="text-left">
            <SheetTitle className="font-display uppercase text-lg">Filtre</SheetTitle>
            <div className="font-mono text-[10px] uppercase tracking-widest text-neon-green">
              {p.count} loc găsite
            </div>
          </SheetHeader>

          <div className="space-y-5 mt-4 pb-6">
            {/* Type */}
            <section>
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                Tip local
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => p.setType(t.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-widest border transition ${
                      p.type === t.id
                        ? "bg-neon-green text-background border-neon-green"
                        : "bg-foreground/5 border-foreground/10 text-muted-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Distance */}
            <section>
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                Distanță
              </h3>
              <div className="flex flex-wrap gap-1.5 items-center">
                <button
                  onClick={p.requestGeo}
                  className={`px-2.5 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-widest border flex items-center gap-1 ${
                    p.hasGeo
                      ? "border-neon-green/40 text-neon-green"
                      : "border-foreground/10 text-muted-foreground"
                  }`}
                >
                  <MapPin size={11} /> {p.hasGeo ? "GPS on" : "GPS"}
                </button>
                {DISTANCES.map((d) => (
                  <button
                    key={d.id}
                    disabled={d.id > 0 && !p.hasGeo}
                    onClick={() => p.setMaxKm(d.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-widest border transition disabled:opacity-30 ${
                      p.maxKm === d.id
                        ? "bg-neon-purple text-background border-neon-purple"
                        : "bg-foreground/5 border-foreground/10 text-muted-foreground"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Country */}
            <section>
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                Țară
              </h3>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => {
                    p.setCountry("all");
                    p.setCityId("all");
                  }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-widest border transition ${
                    p.country === "all"
                      ? "bg-neon-crimson text-background border-neon-crimson"
                      : "bg-foreground/5 border-foreground/10 text-muted-foreground"
                  }`}
                >
                  🌍 toate
                </button>
                {p.countries.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      p.setCountry(c.code);
                      p.setCityId("all");
                    }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-widest border transition ${
                      p.country === c.code
                        ? "bg-neon-crimson text-background border-neon-crimson"
                        : "bg-foreground/5 border-foreground/10 text-muted-foreground"
                    }`}
                  >
                    {c.label} <span className="opacity-60">· {c.count}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* City */}
            <section>
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                Oraș
              </h3>
              <select
                value={p.cityId}
                onChange={(e) => p.setCityId(e.target.value as any)}
                className="w-full py-2.5 px-3 rounded-xl bg-foreground/5 border border-foreground/10 text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-neon-green/60"
              >
                <option value="all">
                  // toate orașele{p.country !== "all" ? ` (${countryLabel})` : ""}
                </option>
                {citiesScoped.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </section>

            {/* Summary + actions */}
            <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3 space-y-1">
              <Row k="țară" v={countryLabel} />
              <Row k="tip" v={typeLabel} />
              <Row k="distanță" v={distLabel} />
              <Row k="oraș" v={cityLabel} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={reset}
                disabled={!isFiltered}
                className="py-2.5 rounded-xl text-[11px] font-mono uppercase tracking-widest text-neon-crimson border border-neon-crimson/30 active:scale-[0.98] disabled:opacity-40"
              >
                × reset
              </button>
              <button
                onClick={() => setOpen(false)}
                className="py-2.5 rounded-xl text-[11px] font-mono uppercase tracking-widest bg-neon-green text-background active:scale-[0.98]"
              >
                arată {p.count} loc
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-foreground truncate ml-2">{v}</span>
    </div>
  );
}

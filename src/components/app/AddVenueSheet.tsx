import { useState } from "react";
import { Plus, MapPin, X, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DAYS, type DayKey, type OpeningHours } from "@/lib/openingHours";
import { toast } from "sonner";

type City = { id: string; name: string; lat: number; lng: number };

interface Props {
  cities: City[];
  onAdded?: () => void;
}

const TYPES = [
  { id: "club", label: "club" },
  { id: "bar", label: "bar" },
  { id: "pub", label: "pub" },
  { id: "terasa", label: "terasă" },
  { id: "after", label: "after" },
] as const;

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "loc"
  );
}

function distKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371,
    dLat = ((bLat - aLat) * Math.PI) / 180,
    dLng = ((bLng - aLng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function AddVenueSheet({ cities, onAdded }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"loc" | "info">("loc");
  const [geoState, setGeoState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]["id"]>("bar");
  const [address, setAddress] = useState("");
  const [cityId, setCityId] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState<OpeningHours>(() => {
    const o: OpeningHours = {};
    DAYS.forEach((d) => {
      o[d.key] = { open: "18:00", close: "02:00" };
    });
    return o;
  });
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setOpen(false);
    setStep("loc");
    setGeoState("idle");
    setCoords(null);
    setName("");
    setAddress("");
    setPhone("");
    setCityId("");
  };

  const requestLoc = () => {
    if (!navigator.geolocation) {
      setGeoState("err");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = p.coords.latitude,
          lng = p.coords.longitude;
        setCoords({ lat, lng });
        setGeoState("ok");
        // auto-pick closest city
        if (cities.length) {
          const closest = [...cities].sort(
            (a, b) => distKm(lat, lng, a.lat, a.lng) - distKm(lat, lng, b.lat, b.lng),
          )[0];
          setCityId(closest.id);
        }
      },
      () => setGeoState("err"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const toggleDay = (k: DayKey) => {
    setHours((h) => ({ ...h, [k]: h[k] ? null : { open: "18:00", close: "02:00" } }));
  };
  const setTime = (k: DayKey, field: "open" | "close", v: string) => {
    setHours((h) => ({
      ...h,
      [k]: { ...(h[k] ?? { open: "18:00", close: "02:00" }), [field]: v },
    }));
  };

  const save = async () => {
    if (!user) {
      toast.error("Trebuie să fii logat");
      return;
    }
    if (!name.trim() || !cityId || !coords) {
      toast.error("Completează numele, orașul și locația");
      return;
    }
    setSaving(true);
    const slug = `${slugify(name)}-${Date.now().toString(36).slice(-4)}`;
    const { error } = await supabase.from("venues").insert({
      name: name.trim(),
      slug,
      type,
      city_id: cityId,
      lat: coords.lat,
      lng: coords.lng,
      address: address.trim() || null,
      phone: phone.trim() || null,
      opening_hours: hours as any,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Local adăugat pe hartă 🔥");
    onAdded?.();
    reset();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-neon-purple/20 to-neon-crimson/20 border border-neon-purple/40 active:scale-[0.98] transition"
      >
        <div className="h-10 w-10 rounded-xl bg-neon-purple/20 border border-neon-purple/50 flex items-center justify-center">
          <Plus className="text-neon-purple" size={20} strokeWidth={2.8} />
        </div>
        <div className="flex-1 text-left">
          <div className="font-display font-black uppercase text-sm tracking-tight">
            adaugă local pe hartă
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-neon-purple mt-0.5">
            folosește locația ta gps
          </div>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-foreground/10">
            <div>
              <div className="font-display font-black text-xl">
                {step === "loc" ? "locație" : "detalii"}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                pas {step === "loc" ? "1" : "2"}/2
              </div>
            </div>
            <button
              onClick={reset}
              className="h-10 w-10 rounded-full bg-foreground/10 flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {step === "loc" ? (
              <>
                <p className="text-sm text-foreground/80">
                  Stai în fața localului? Apasă mai jos ca să prindem coordonatele exacte.
                </p>
                <button
                  onClick={requestLoc}
                  disabled={geoState === "loading"}
                  className="w-full p-6 rounded-2xl border-2 border-dashed border-neon-green/50 bg-neon-green/5 flex flex-col items-center gap-3 active:scale-[0.98] transition"
                >
                  {geoState === "loading" ? (
                    <Loader2 className="animate-spin text-neon-green" size={32} />
                  ) : geoState === "ok" ? (
                    <Check className="text-neon-green" size={32} />
                  ) : (
                    <MapPin className="text-neon-green" size={32} />
                  )}
                  <div className="font-display font-black uppercase">
                    {geoState === "loading"
                      ? "caut locația..."
                      : geoState === "ok"
                        ? "locație prinsă"
                        : geoState === "err"
                          ? "reîncearcă"
                          : "permite locația"}
                  </div>
                  {coords && (
                    <div className="font-mono text-[10px] uppercase tracking-widest text-neon-green">
                      {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </div>
                  )}
                  {geoState === "err" && (
                    <div className="text-xs text-neon-crimson">
                      Refuzat. Activează GPS în setări.
                    </div>
                  )}
                </button>
                <button
                  onClick={() => setStep("info")}
                  disabled={!coords}
                  className="w-full py-4 rounded-xl bg-neon-green text-background font-display font-black uppercase disabled:opacity-40"
                >
                  continuă →
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    nume *
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Berăria H"
                    className="w-full mt-1 px-3 py-3 rounded-xl bg-foreground/5 border border-foreground/15 font-display"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    tip
                  </label>
                  <div className="grid grid-cols-5 gap-1.5 mt-1">
                    {TYPES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setType(t.id)}
                        className={`py-2 rounded-lg font-mono text-[10px] uppercase tracking-wider border ${
                          type === t.id
                            ? "bg-neon-green/20 border-neon-green text-neon-green"
                            : "bg-foreground/5 border-foreground/15"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    oraș *
                  </label>
                  <select
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                    className="w-full mt-1 px-3 py-3 rounded-xl bg-foreground/5 border border-foreground/15 font-display"
                  >
                    <option value="">— alege —</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    adresă
                  </label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="opțional"
                    className="w-full mt-1 px-3 py-3 rounded-xl bg-foreground/5 border border-foreground/15 font-display"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    telefon
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="opțional"
                    inputMode="tel"
                    className="w-full mt-1 px-3 py-3 rounded-xl bg-foreground/5 border border-foreground/15 font-display"
                  />
                </div>

                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                    program
                  </div>
                  <div className="space-y-1.5">
                    {DAYS.map((d) => {
                      const s = hours[d.key];
                      return (
                        <div
                          key={d.key}
                          className="flex items-center gap-2 p-2 rounded-lg bg-foreground/5 border border-foreground/10"
                        >
                          <button
                            onClick={() => toggleDay(d.key)}
                            className={`w-10 py-1.5 rounded font-mono text-[11px] font-bold ${s ? "bg-neon-green/20 text-neon-green" : "bg-foreground/10 text-muted-foreground"}`}
                          >
                            {d.label}
                          </button>
                          {s ? (
                            <>
                              <input
                                type="time"
                                value={s.open}
                                onChange={(e) => setTime(d.key, "open", e.target.value)}
                                className="flex-1 px-2 py-1.5 rounded bg-background border border-foreground/15 font-mono text-xs"
                              />
                              <span className="text-muted-foreground">→</span>
                              <input
                                type="time"
                                value={s.close}
                                onChange={(e) => setTime(d.key, "close", e.target.value)}
                                className="flex-1 px-2 py-1.5 rounded bg-background border border-foreground/15 font-mono text-xs"
                              />
                            </>
                          ) : (
                            <span className="flex-1 text-center font-mono text-[10px] uppercase text-muted-foreground">
                              închis
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {step === "info" && (
            <div className="p-4 border-t border-foreground/10 flex gap-2">
              <button
                onClick={() => setStep("loc")}
                className="px-4 py-3 rounded-xl bg-foreground/10 font-mono text-xs uppercase"
              >
                ← înapoi
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-neon-green text-background font-display font-black uppercase disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="animate-spin" size={16} />}
                salvează local
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

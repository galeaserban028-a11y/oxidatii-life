import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Camera, Lock, Globe2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/me")({
  head: () => ({ meta: [{ title: "Profil · OXIDAȚII" }] }),
  component: MePage,
});


const RANK_LABELS: Record<string, string> = {
  ZEU_BALCANIC: "ZEU' BALCANIC 👑",
  REGELE_CENTRULUI: "REGELE CENTRULUI",
  BOIERUL_NOPTII: "BOIERUL NOPȚII",
  CAMATARU_DE_PAHAR: "CĂMĂTARU' DE PAHAR",
  SPRITARUL: "ȘPRIȚARUL",
  CRAI_DE_CARTIER: "CRAI DE CARTIER",
  MDS: "MDS",
};

function MePage() {
  const nav = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  async function uploadAvatar(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: profErr } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", user.id);
      if (profErr) throw profErr;
      await refreshProfile();
      toast.success("Poză actualizată");
    } catch (e: any) {
      toast.error(e.message ?? "Nu s-a putut încărca");
    } finally {
      setUploading(false);
    }
  }

  async function togglePrivacy() {
    if (!user || !profile) return;
    setSavingPrivacy(true);
    try {
      const next = !profile.is_public;
      const { error } = await supabase.from("profiles").update({ is_public: next } as any).eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success(next ? "Cont public" : "Cont privat");
    } catch (e: any) {
      toast.error(e.message ?? "Eroare");
    } finally {
      setSavingPrivacy(false);
    }
  }



  const { data: moments } = useQuery({
    queryKey: ["my-moments", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return { photos: [], proofs: [], city: null };
      const [photosRes, proofsRes, cityRes] = await Promise.all([
        supabase
          .from("venue_photos")
          .select("id, photo_url, caption, taken_at, venue:venues(name, id, city:cities(name))")
          .eq("user_id", user.id)
          .order("taken_at", { ascending: false })
          .limit(12),
        supabase
          .from("sprit_proofs")
          .select("id, photo_url, created_at, ai_verified, venue:venues(name, id, city:cities(name))")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(12),
        profile?.city_id
          ? supabase.from("cities").select("name, slug").eq("id", profile.city_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return {
        photos: photosRes.data ?? [],
        proofs: proofsRes.data ?? [],
        city: cityRes.data,
      };
    },
  });

  if (!user || !profile) return null;

  const verifiedProofs = (moments?.proofs ?? []).filter((p: any) => p.ai_verified);
  const allMoments = [
    ...verifiedProofs.map((p: any) => ({ ...p, _kind: "proof" as const, _date: p.created_at })),
    ...(moments?.photos ?? []).map((p: any) => ({ ...p, _kind: "photo" as const, _date: p.taken_at })),
  ].sort((a, b) => +new Date(b._date) - +new Date(a._date));

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* Header card */}
      <div className="relative border border-foreground/10 rounded-2xl p-5 bg-foreground/[0.04] overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full"
          style={{ background: "radial-gradient(circle, oklch(0.62 0.28 305 / 30%), transparent 70%)" }} />
        <div className="relative flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="relative h-20 w-20 rounded-full bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center text-3xl font-display overflow-hidden shrink-0 group"
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              (profile.handle ?? "?")[0].toUpperCase()
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition flex items-center justify-center">
              <Camera size={18} />
            </div>
            {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[9px] font-mono uppercase">…</div>}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ""; }}
          />
          <div className="min-w-0 flex-1">
            <div className="font-display uppercase text-2xl leading-tight truncate">@{profile.handle ?? "—"}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-neon-crimson mt-0.5">
              {RANK_LABELS[profile.rank] ?? profile.rank}
            </div>
            {moments?.city && (
              <div className="text-[11px] text-muted-foreground mt-0.5">
                din <span className="text-foreground">{moments.city.name}</span>
              </div>
            )}
            <button
              onClick={togglePrivacy}
              disabled={savingPrivacy}
              className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border border-foreground/15 hover:border-foreground/30 transition"
            >
              {profile.is_public ? <Globe2 size={11} className="text-neon-green" /> : <Lock size={11} className="text-neon-crimson" />}
              <span className={profile.is_public ? "text-neon-green" : "text-neon-crimson"}>
                {profile.is_public ? "public" : "privat"}
              </span>
              <span className="text-muted-foreground">· schimbă</span>
            </button>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-2 mt-5">
          <Stat label="aură" value={profile.aura} color="var(--neon-purple)" />
          <Stat label="șprițuri" value={profile.lifetime_sprits} color="var(--neon-crimson)" />
          <Stat label="momente" value={allMoments.length} color="var(--neon-green)" />
        </div>
      </div>


      {/* Top Momente */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display uppercase text-lg leading-none">Top Momente</h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            doar real · ce-ai postat tu
          </span>
        </div>

        {allMoments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-foreground/15 p-8 text-center space-y-2">
            <div className="text-4xl">📸</div>
            <div className="font-display uppercase">Niciun moment încă.</div>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Nu inventăm istorii. Când postezi o poză sau scanezi un șpriț, apare aici.
            </p>
            <Link to="/app/scan" className="inline-flex mt-2 font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-md border border-foreground/20 hover:border-neon-purple">
              scanează primul șpriț →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {allMoments.map((m: any) => (
              <div key={`${m._kind}-${m.id}`} className="relative aspect-square overflow-hidden rounded-md bg-background border border-foreground/10">
                <img src={m.photo_url} alt={m.caption ?? ""} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                {m._kind === "proof" && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-sm bg-neon-green/30 border border-neon-green/50 backdrop-blur-sm">
                    <span className="font-mono text-[8px] uppercase text-neon-green">verificat</span>
                  </div>
                )}
                {m.venue?.name && (
                  <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="font-mono text-[9px] uppercase tracking-wider text-white truncate">
                      {m.venue.name}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Logout */}
      <button
        onClick={async () => { await signOut(); nav({ to: "/", replace: true }); }}
        className="w-full px-4 py-3 flex items-center justify-center gap-2 text-sm text-neon-crimson border border-foreground/10 rounded-xl hover:bg-neon-crimson/10 transition"
      >
        <LogOut size={16} /> Logout
      </button>

      <p className="text-[10px] font-mono text-center text-muted-foreground/50 pt-2">
        OXIDAȚII · construit pe oameni reali · made in Balcani
      </p>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl bg-background/60 border border-foreground/10 p-3 text-center">
      <div className="font-display text-2xl" style={{ color, textShadow: `0 0 10px ${color}` }}>{value}</div>
      <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

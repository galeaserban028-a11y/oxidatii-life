import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PROFILE_THEMES } from "@/lib/premium-themes";
import { Music, Image as ImageIcon, Palette, Trash2, Loader2, Check } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

/**
 * Premium customization: profile theme (VIP+), music clip (Pro+), animated bg (Pro+).
 */
export function PremiumExtrasCard({ onClose }: { onClose?: () => void } = {}) {
  const { user, profile, refreshProfile } = useAuth();
  const tier = profile?.premium_tier;
  const isVipPlus = tier === "vip_plus" || tier === "pro" || tier === "elite";
  const isPro = tier === "pro" || tier === "elite";

  const musicRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function setTheme(id: string | null) {
    if (!user) return;
    setBusy("theme");
    const { error } = await supabase.from("profiles").update({ profile_theme_id: id } as any).eq("id", user.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(id ? "Temă aplicată" : "Temă resetată");
    refreshProfile();
  }

  async function upload(file: File, field: "music_clip_url" | "profile_bg_url", maxMB: number, kind: string) {
    if (!user) return;
    if (file.size > maxMB * 1024 * 1024) return toast.error(`Fișier prea mare (max ${maxMB}MB)`);
    setBusy(field);
    try {
      // 15s music clip check
      if (field === "music_clip_url") {
        const dur = await new Promise<number>((res) => {
          const a = document.createElement("audio");
          a.preload = "metadata";
          a.onloadedmetadata = () => res(a.duration);
          a.onerror = () => res(0);
          a.src = URL.createObjectURL(file);
        });
        if (dur > 16) {
          toast.error("Maxim 15 secunde");
          setBusy(null);
          return;
        }
      }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const path = `${user.id}/${field}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("profile-media").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("profile-media").getPublicUrl(path);
      const { error } = await supabase.from("profiles").update({ [field]: pub.publicUrl } as any).eq("id", user.id);
      if (error) throw error;
      toast.success(`${kind} actualizat`);
      refreshProfile();
    } catch (e: any) {
      toast.error(e.message ?? "Eroare");
    } finally {
      setBusy(null);
    }
  }

  async function clearField(field: "music_clip_url" | "profile_bg_url" | "profile_theme_id", kind: string) {
    if (!user) return;
    setBusy(field);
    const { error } = await supabase.from("profiles").update({ [field]: null } as any).eq("id", user.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`${kind} șters`);
    refreshProfile();
  }

  if (!isVipPlus) return null;
  const currentTheme = profile?.profile_theme_id ?? null;

  return (
    <div className="rounded-2xl border border-foreground/15 p-4 bg-foreground/[0.03] space-y-5">
      <div className="font-display uppercase text-sm tracking-wide">Personalizare profil</div>

      {/* Themes */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Palette size={14} className="text-foreground/70" />
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">teme · VIP+</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PROFILE_THEMES.map((t) => {
            const active = currentTheme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(active ? null : t.id)}
                disabled={busy === "theme"}
                className={`h-14 rounded-xl border-2 transition active:scale-[0.97] ${active ? "ring-2 ring-foreground" : ""}`}
                style={{ background: t.cardBg, borderColor: t.cardBorder }}
              >
                <div className="text-[10px] font-mono uppercase tracking-widest text-white drop-shadow">{t.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pro-only: music + bg */}
      {isPro ? (
        <>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Music size={14} className="text-foreground/70" />
              <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">music clip 15s · Pro</div>
            </div>
            <input ref={musicRef} type="file" accept="audio/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "music_clip_url", 5, "Music clip")} />
            <div className="flex items-center gap-2">
              <button onClick={() => musicRef.current?.click()} disabled={busy === "music_clip_url"} className="flex-1 h-10 rounded-full bg-foreground/10 text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98]">
                {busy === "music_clip_url" ? <Loader2 size={14} className="animate-spin" /> : <Music size={14} />}
                {profile?.music_clip_url ? "Schimbă" : "Încarcă"}
              </button>
              {profile?.music_clip_url && (
                <button onClick={() => clearField("music_clip_url", "Music clip")} className="h-10 px-3 rounded-full border border-foreground/15 text-foreground/60 active:scale-95">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon size={14} className="text-foreground/70" />
              <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">background animat · Pro</div>
            </div>
            <input ref={bgRef} type="file" accept="video/mp4,image/gif,image/webp" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "profile_bg_url", 10, "Background")} />
            <div className="flex items-center gap-2">
              <button onClick={() => bgRef.current?.click()} disabled={busy === "profile_bg_url"} className="flex-1 h-10 rounded-full bg-foreground/10 text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98]">
                {busy === "profile_bg_url" ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                {profile?.profile_bg_url ? "Schimbă" : "Încarcă"}
              </button>
              {profile?.profile_bg_url && (
                <button onClick={() => clearField("profile_bg_url", "Background")} className="h-10 px-3 rounded-full border border-foreground/15 text-foreground/60 active:scale-95">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-xs text-muted-foreground italic">Music clip și background animat: doar Pro și Elite.</div>
      )}
    </div>
  );
}

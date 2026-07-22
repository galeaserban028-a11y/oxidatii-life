/**
 * Premium customization: profile theme (VIP+), music clip (Pro+), animated bg (Pro+).
 * Gated by useEntitlements() — expired subscriptions are treated as no tier.
 */
import { useAuth } from "@/lib/auth";
import { useEntitlements } from "@/lib/entitlements";
import { supabase } from "@/integrations/supabase/client";
import { PROFILE_THEMES, isThemeAvailable } from "@/lib/premium-themes";
import { Lock } from "lucide-react";
import { Music, Image as ImageIcon, Palette, Trash2, Loader2, Check } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import { isNative } from "@/lib/native";
import { uriToFile } from "@/lib/native-media";

function guessExt(file: File, field: "music_clip_url" | "profile_bg_url"): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (field === "music_clip_url") {
    if (file.type.includes("mpeg") || file.type.includes("mp3")) return "mp3";
    if (file.type.includes("wav")) return "wav";
    if (file.type.includes("aac")) return "aac";
    if (file.type.includes("ogg")) return "ogg";
    return "mp3";
  }
  if (file.type.includes("mp4")) return "mp4";
  if (file.type.includes("webm")) return "webm";
  if (file.type.includes("quicktime") || file.type.includes("mov")) return "mov";
  if (file.type.includes("gif")) return "gif";
  if (file.type.includes("webp")) return "webp";
  if (file.type.includes("png")) return "png";
  if (file.type.includes("jpeg") || file.type.includes("jpg")) return "jpg";
  return "bin";
}

export function PremiumExtrasCard({ onClose }: { onClose?: () => void } = {}) {
  const { user, profile, refreshProfile } = useAuth();
  const { tier, isVipPlus, isPro } = useEntitlements();

  const musicRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function setTheme(id: string | null) {
    if (!user) return;
    setBusy("theme");
    const { error } = await supabase
      .from("profiles")
      .update({ profile_theme_id: id } as any)
      .eq("id", user.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(id ? "Temă aplicată" : "Temă resetată");
    refreshProfile();
  }

  async function upload(
    file: File,
    field: "music_clip_url" | "profile_bg_url",
    maxMB: number,
    kind: string,
  ) {
    if (!user) return;
    if (file.size > maxMB * 1024 * 1024) return toast.error(`Fișier prea mare (max ${maxMB}MB)`);
    setBusy(field);
    try {
      // 15s music clip check
      if (field === "music_clip_url") {
        const dur = await new Promise<number>((res) => {
          const a = document.createElement("audio");
          const url = URL.createObjectURL(file);
          a.preload = "metadata";
          a.onloadedmetadata = () => {
            const d = a.duration;
            URL.revokeObjectURL(url);
            res(Number.isFinite(d) ? d : 0);
          };
          a.onerror = () => {
            URL.revokeObjectURL(url);
            res(0);
          };
          a.src = url;
        });
        if (dur > 16) {
          toast.error("Maxim 15 secunde");
          setBusy(null);
          return;
        }
      }
      const ext = guessExt(file, field);
      const path = `${user.id}/${field}-${Date.now()}.${ext}`;
      const contentType =
        file.type ||
        (field === "music_clip_url"
          ? "audio/mpeg"
          : ext === "mp4"
            ? "video/mp4"
            : ext === "gif"
              ? "image/gif"
              : ext === "webp"
                ? "image/webp"
                : ext === "png"
                  ? "image/png"
                  : "image/jpeg");
      const { error: upErr } = await supabase.storage
        .from("profile-media")
        .upload(path, file, { upsert: true, contentType });
      if (upErr) throw upErr;
      // Bucket is private — use a long-lived signed URL (10 years)
      const { data: signed, error: signErr } = await supabase.storage
        .from("profile-media")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr) throw signErr;
      if (!signed?.signedUrl) throw new Error("Nu am putut genera URL-ul media");
      const { error } = await supabase
        .from("profiles")
        .update({ [field]: signed.signedUrl } as any)
        .eq("id", user.id);
      if (error) throw error;
      toast.success(`${kind} actualizat`);
      await refreshProfile();
    } catch (e) {
      toast.error(errorMessage(e, "Eroare la încărcare"));
    } finally {
      setBusy(null);
    }
  }

  async function pickBackgroundNative() {
    if (!user || busy) return;
    try {
      const {
        Camera: CapCamera,
        CameraResultType,
        CameraSource,
      } = await import("@capacitor/camera");
      const photo = await CapCamera.getPhoto({
        quality: 92,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        correctOrientation: true,
      });
      let file: File;
      if (photo.dataUrl) {
        const res = await fetch(photo.dataUrl);
        const blob = await res.blob();
        const format = photo.format || "jpeg";
        file = new File([blob], `bg.${format === "png" ? "png" : "jpg"}`, {
          type: blob.type || `image/${format === "png" ? "png" : "jpeg"}`,
        });
      } else {
        const path = photo.webPath || photo.path;
        if (!path) throw new Error("Nimic selectat");
        file = await uriToFile(path, "bg.jpg", "image/jpeg");
      }
      await upload(file, "profile_bg_url", 10, "Background");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e ?? "");
      if (/cancel|user|dismiss|abort|no image/i.test(msg)) return;
      // Fall back to file input (works on web; sometimes on WebView too)
      bgRef.current?.click();
    }
  }

  function onBgButtonClick() {
    if (busy === "profile_bg_url") return;
    if (isNative() || /; wv\)/.test(navigator.userAgent)) {
      void pickBackgroundNative();
      return;
    }
    bgRef.current?.click();
  }

  async function clearField(
    field: "music_clip_url" | "profile_bg_url" | "profile_theme_id",
    kind: string,
  ) {
    if (!user) return;
    setBusy(field);
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: null } as any)
      .eq("id", user.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`${kind} șters`);
    refreshProfile();
  }

  // Theme intensity sliders (live preview + debounced save)
  type Intensity = {
    gradient: number;
    aurora: number;
    sheen: number;
    grain: number;
    vignette: number;
  };
  const defaultIntensity: Intensity = { gradient: 1, aurora: 1, sheen: 1, grain: 1, vignette: 1 };
  const initialIntensity: Intensity = {
    ...defaultIntensity,
    ...((profile as any)?.theme_intensity ?? {}),
  };
  const [intensity, setIntensity] = useState<Intensity>(initialIntensity);
  useEffect(() => {
    setIntensity({ ...defaultIntensity, ...((profile as any)?.theme_intensity ?? {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(profile as any)?.theme_intensity, profile?.id]);

  async function saveIntensity(next: Intensity) {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ theme_intensity: next } as any)
      .eq("id", user.id);
    if (error) return toast.error(error.message);
    refreshProfile();
  }

  function updateIntensity(key: keyof Intensity, value: number) {
    const next = { ...intensity, [key]: value };
    setIntensity(next);
    // Debounce DB write so dragging doesn't spam
    if ((window as any).__intensityTimer) clearTimeout((window as any).__intensityTimer);
    (window as any).__intensityTimer = setTimeout(() => saveIntensity(next), 400);
  }

  if (!isVipPlus) return null;
  const currentTheme = profile?.profile_theme_id ?? null;

  return (
    <div className="rounded-2xl border border-foreground/15 p-4 bg-foreground/[0.03] space-y-5">
      <div className="flex items-center justify-between">
        <div className="font-display uppercase text-sm tracking-wide">Personalizare profil</div>
        {onClose && (
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-full bg-foreground text-background text-[11px] font-mono uppercase tracking-widest flex items-center gap-1.5 active:scale-95"
          >
            <Check size={12} /> Salvează
          </button>
        )}
      </div>

      {/* Themes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette size={14} className="text-foreground/70" />
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            teme premium
          </div>
        </div>
        {(["vip_plus", "pro", "elite"] as const).map((tierGroup) => {
          const list = PROFILE_THEMES.filter((t) => t.tier === tierGroup);
          const label = tierGroup === "vip_plus" ? "VIP+" : tierGroup === "pro" ? "PRO" : "ELITE";
          return (
            <div key={tierGroup} className="space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
                {label}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {list.map((t) => {
                  const active = currentTheme === t.id;
                  const allowed = isThemeAvailable(t, tier);
                  return (
                    <button
                      key={t.id}
                      onClick={() => allowed && setTheme(active ? null : t.id)}
                      disabled={busy === "theme" || !allowed}
                      className={`relative h-16 rounded-xl border-2 transition active:scale-[0.97] overflow-hidden ${active ? "ring-2 ring-foreground" : ""} ${!allowed ? "opacity-50" : ""}`}
                      style={{ background: t.cardBg, borderColor: t.cardBorder }}
                      title={t.description}
                    >
                      <div
                        className="absolute -top-3 -left-3 h-10 w-10 rounded-full blur-md"
                        style={{ background: t.accent, opacity: 0.7 }}
                      />
                      <div
                        className="absolute -bottom-3 -right-3 h-8 w-8 rounded-full blur-md"
                        style={{ background: t.cardBorder, opacity: 0.6 }}
                      />
                      <div className="relative h-full flex items-end p-1.5">
                        <div className="text-[10px] font-mono uppercase tracking-widest text-white drop-shadow">
                          {t.name}
                        </div>
                      </div>
                      {!allowed && (
                        <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center">
                          <Lock size={10} className="text-white/80" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Intensity sliders — only when a theme is active */}
      {currentTheme && (
        <div className="space-y-2.5 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              intensitate
            </div>
            <button
              onClick={() => {
                setIntensity(defaultIntensity);
                saveIntensity(defaultIntensity);
              }}
              className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/80 hover:text-foreground"
            >
              reset
            </button>
          </div>
          {(
            [
              ["gradient", "Gradient"],
              ["aurora", "Auroră"],
              ["sheen", "Sheen"],
              ["grain", "Grain"],
              ["vignette", "Vignette"],
            ] as Array<[keyof Intensity, string]>
          ).map(([key, label]) => (
            <label key={key} className="block">
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <span className="text-foreground/80">{label}</span>
                <span className="font-mono text-foreground/50 tabular-nums">
                  {Math.round(intensity[key] * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.05}
                value={intensity[key]}
                onChange={(e) => updateIntensity(key, parseFloat(e.target.value))}
                className="w-full h-1.5 accent-foreground"
              />
            </label>
          ))}
        </div>
      )}

      {/* Pro-only: music + bg */}
      {isPro ? (
        <>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Music size={14} className="text-foreground/70" />
              <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                music clip 15s · Pro
              </div>
            </div>
            {/* sr-only (not display:none) — Android WebView often blocks click() on hidden inputs */}
            <input
              ref={musicRef}
              type="file"
              accept="audio/*,audio/mpeg,audio/mp4,audio/aac,audio/wav"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void upload(f, "music_clip_url", 5, "Music clip");
              }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => musicRef.current?.click()}
                disabled={busy === "music_clip_url"}
                className="flex-1 h-10 rounded-full bg-foreground/10 text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {busy === "music_clip_url" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Music size={14} />
                )}
                {profile?.music_clip_url ? "Schimbă" : "Încarcă"}
              </button>
              {profile?.music_clip_url && (
                <button
                  type="button"
                  onClick={() => clearField("music_clip_url", "Music clip")}
                  className="h-10 px-3 rounded-full border border-foreground/15 text-foreground/60 active:scale-95"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon size={14} className="text-foreground/70" />
              <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                background / cover · Pro
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              Poză (JPG/PNG/WebP/GIF) sau clip scurt (MP4). Funcționează și dacă ai deja music clip.
            </p>
            <input
              ref={bgRef}
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void upload(f, "profile_bg_url", 10, "Background");
              }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onBgButtonClick}
                disabled={busy === "profile_bg_url"}
                className="flex-1 h-10 rounded-full bg-foreground/10 text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {busy === "profile_bg_url" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ImageIcon size={14} />
                )}
                {profile?.profile_bg_url ? "Schimbă" : "Încarcă"}
              </button>
              {profile?.profile_bg_url && (
                <button
                  type="button"
                  onClick={() => clearField("profile_bg_url", "Background")}
                  className="h-10 px-3 rounded-full border border-foreground/15 text-foreground/60 active:scale-95"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-xs text-muted-foreground italic">
          Music clip și background/cover: doar Pro și Elite (abonament activ).
        </div>
      )}
    </div>
  );
}

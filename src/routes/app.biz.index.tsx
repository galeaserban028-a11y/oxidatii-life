import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Building2,
  X,
  Plus,
  Loader2,
  Trash2,
  Eye,
  MousePointerClick,
  Megaphone,
  Image as ImageIcon,
  BarChart3,
  Film,
} from "lucide-react";
import { toast } from "sonner";
import { PremiumCheckoutDialog } from "@/components/PremiumCheckoutDialog";
import { syncCheckoutToProfile } from "@/lib/premium.functions";
import { getStripeEnvironment } from "@/lib/stripe";


export const Route = createFileRoute("/app/biz/")({
  head: () => ({ meta: [{ title: "Promovare · OXIDAȚII" }] }),
  component: BizPage,
});

// Cele trei pachete simple. Plată one-shot via Stripe pentru fiecare postare.
type TierId = "t500" | "t1000" | "t2500";
const TIERS: {
  id: TierId;
  priceRon: number;
  days: number;
  label: string;
  color: string;
  priceId: "boost_2d" | "boost_5d" | "boost_30d";
}[] = [
  { id: "t500", priceRon: 500, days: 2, label: "2 zile", color: "#00e5ff", priceId: "boost_2d" },
  { id: "t1000", priceRon: 1000, days: 5, label: "5 zile", color: "#ff3d8b", priceId: "boost_5d" },
  { id: "t2500", priceRon: 2500, days: 30, label: "30 zile", color: "#ffea00", priceId: "boost_30d" },
];


async function loadBiz(userId: string) {
  const { data } = await supabase
    .from("business_accounts")
    .select("id, brand_name")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

async function loadCampaigns(businessId: string) {
  const { data } = await supabase
    .from("campaigns")
    .select(
      "id, title, body, status, impressions, clicks, image_urls, starts_at, ends_at, created_at",
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

function BizPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: businesses, isLoading } = useQuery({
    queryKey: ["biz-list", user?.id],
    enabled: !!user,
    queryFn: () => loadBiz(user!.id),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [busy, setBusy] = useState(false);
  const [postOpen, setPostOpen] = useState(false);

  // After Stripe returns via ?boost=success&session_id=..., activate the campaign
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const boost = url.searchParams.get("boost");
    const sessionId = url.searchParams.get("session_id");
    if (boost !== "success" || !sessionId) return;
    // Clean URL immediately to prevent double-sync
    url.searchParams.delete("boost");
    url.searchParams.delete("session_id");
    window.history.replaceState({}, "", url.toString());
    (async () => {
      const res = await syncCheckoutToProfile({
        data: { sessionId, environment: getStripeEnvironment() },
      });
      if ("success" in res && res.success) {
        toast.success(`Promovare activă · ${res.boostDays ?? ""} zile`);
        qc.invalidateQueries({ queryKey: ["biz-campaigns"] });
      } else if ("error" in res) {
        toast.error(res.error);
      }
    })();
  }, [qc]);



  if (!user)
    return (
      <div className="px-4 pt-10 text-center text-sm text-muted-foreground">
        Conectează-te ca să promovezi.
      </div>
    );

  const createBusiness = async () => {
    if (!brand.trim()) return;
    setBusy(true);
    const slug = brand
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const { error } = await supabase.from("business_accounts").insert({
      owner_user_id: user.id,
      brand_name: brand.trim(),
      slug: slug || null,
      type: "promoter",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setBrand("");
    setCreateOpen(false);
    qc.invalidateQueries({ queryKey: ["biz-list"] });
  };

  const list = businesses ?? [];
  const activeBiz = list[0];

  if (!isLoading && list.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 pt-10 pb-24 space-y-6 text-center">
        <div className="text-5xl">📣</div>
        <h1 className="font-display uppercase text-2xl">Promovare</h1>
        <p className="text-sm text-zinc-400">
          Creează-ți brandul ca să postezi reclame pe ecranul principal al aplicației.
        </p>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 font-display uppercase text-[11px] tracking-widest px-5 py-3 rounded-2xl text-white"
          style={{ background: "var(--gradient-chaos)" }}
        >
          <Plus size={12} /> Creează brand
        </button>
        <CreateBusinessSheet
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          brand={brand}
          setBrand={setBrand}
          busy={busy}
          onCreate={createBusiness}
        />
      </div>
    );
  }

  if (isLoading || !activeBiz) {
    return (
      <div className="px-4 pt-10">
        <div className="h-32 rounded-2xl bg-zinc-900/30 border border-white/5 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-24 space-y-6">
      <header className="rounded-2xl bg-zinc-900/40 border border-white/10 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sunset-magenta to-sunset-amber flex items-center justify-center">
            <Building2 size={22} className="text-white" />
          </div>
          <div>
            <div className="font-display uppercase text-lg">{activeBiz.brand_name}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              promovare · plată per postare
            </div>
          </div>
        </div>
        <button
          onClick={() => setPostOpen(true)}
          className="inline-flex items-center gap-1.5 font-display uppercase text-[11px] tracking-widest px-4 py-2.5 rounded-2xl text-white"
          style={{ background: "var(--gradient-chaos)" }}
        >
          <Plus size={12} /> Postare nouă
        </button>
      </header>

      <Link
        to="/app/biz/dashboard"
        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[#ff3d8b]/15 via-[#c724ff]/10 to-[#00e5ff]/10 p-4 hover:border-white/25 transition"
      >
        <div className="size-11 rounded-xl bg-white/10 flex items-center justify-center">
          <BarChart3 size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <div className="font-display uppercase text-sm text-white">Business Dashboard</div>
          <div className="text-[11px] text-white/60">Heatmap clienți · vizitatori unici · sponsored reels · 99 RON/lună</div>
        </div>
        <div className="text-white/50">→</div>
      </Link>


      {/* Pachete */}
      <div className="grid grid-cols-3 gap-2">
        {TIERS.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl border border-white/10 bg-zinc-900/40 p-3 text-center"
          >
            <div className="font-display text-2xl" style={{ color: t.color }}>
              {t.priceRon}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">RON</div>
            <div className="text-[11px] text-zinc-300 mt-1">{t.label}</div>
          </div>
        ))}
      </div>

      <CampaignList businessId={activeBiz.id} />

      {postOpen && (
        <PostModal
          businessId={activeBiz.id}
          onClose={() => setPostOpen(false)}
          onCreated={() => {
            setPostOpen(false);
            qc.invalidateQueries({ queryKey: ["biz-campaigns", activeBiz.id] });
          }}
        />
      )}
    </div>
  );
}

function CampaignList({ businessId }: { businessId: string }) {
  const qc = useQueryClient();
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["biz-campaigns", businessId],
    queryFn: () => loadCampaigns(businessId),
  });

  const del = async (id: string) => {
    if (!confirm("Ștergi postarea? Acțiune ireversibilă.")) return;
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Postare ștearsă");
    qc.invalidateQueries({ queryKey: ["biz-campaigns", businessId] });
  };

  if (isLoading)
    return <div className="h-24 rounded-xl bg-zinc-900/30 border border-white/5 animate-pulse" />;
  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="rounded-2xl bg-zinc-900/30 border border-dashed border-white/10 p-8 text-center space-y-2">
        <Megaphone size={28} className="mx-auto text-zinc-600" />
        <p className="text-sm text-zinc-400">Nicio postare încă.</p>
        <p className="text-xs text-zinc-600">
          Apasă „Postare nouă" ca să apari pe ecranul principal.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {campaigns.map((c: any) => {
        const ms = c.ends_at ? new Date(c.ends_at).getTime() - Date.now() : 0;
        const expired = ms <= 0;
        return (
          <div
            key={c.id}
            className="rounded-2xl border border-white/10 bg-zinc-900/40 p-3 flex items-center gap-3"
          >
            {c.image_urls?.[0] ? (
              <img
                src={c.image_urls[0]}
                alt=""
                className="w-16 h-16 rounded-xl object-cover shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-zinc-600">
                <ImageIcon size={18} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-display text-sm truncate">{c.title}</div>
              <div className="font-mono text-[10px] text-zinc-500 flex items-center gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <Eye size={10} /> {c.impressions ?? 0} afișări
                </span>
                <span className="flex items-center gap-1">
                  <MousePointerClick size={10} /> {c.clicks ?? 0} click-uri
                </span>
                {expired ? (
                  <span className="text-zinc-600">expirat</span>
                ) : (
                  <span className="text-emerald-400">
                    activ ·{" "}
                    {(() => {
                      const h = Math.floor(ms / 3_600_000);
                      return h >= 24 ? `${Math.floor(h / 24)}z ${h % 24}h` : `${h}h`;
                    })()}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => del(c.id)}
              title="Șterge"
              className="p-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function PostModal({
  businessId,
  onClose,
  onCreated,
}: {
  businessId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"feed" | "reel">("feed");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [tier, setTier] = useState<TierId>("t500");
  const [busy, setBusy] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pendingCampaignId, setPendingCampaignId] = useState<string | null>(null);

  const handleFile = async (file: File, target: "image" | "video" = "image") => {
    if (!user?.id) return toast.error("Trebuie să fii autentificat");
    const maxMb = target === "video" ? 60 : 10;
    if (file.size > maxMb * 1024 * 1024) return toast.error(`Fișier prea mare (max ${maxMb}MB)`);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || (target === "video" ? "mp4" : "jpg");
      const path = `${user.id}/campaigns/${businessId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("venue-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("venue-photos").getPublicUrl(path);
      if (target === "video") setVideoUrl(pub.publicUrl);
      else setImageUrl(pub.publicUrl);
      toast.success(target === "video" ? "Video încărcat" : "Imagine încărcată");
    } catch (e: any) {
      toast.error(e?.message || "Eroare la încărcare");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!title.trim()) return toast.error("Adaugă un titlu");
    if (mode === "feed" && !imageUrl.trim()) return toast.error("Adaugă o imagine");
    if (mode === "reel" && !videoUrl.trim() && !imageUrl.trim())
      return toast.error("Adaugă un video sau o imagine pentru reel");
    const cfg = TIERS.find((t) => t.id === tier)!;
    setBusy(true);
    // Insert as DRAFT — activated after Stripe payment via syncCheckoutToProfile
    const { data: inserted, error } = await supabase
      .from("campaigns")
      .insert({
        business_id: businessId,
        title: title.trim(),
        body: body.trim() || null,
        kind: mode === "reel" ? "boost_reel" : "boost_feed",
        status: "draft",
        bid_cents: 0,
        budget_cents: cfg.priceRon * 100,
        image_urls: imageUrl.trim() ? [imageUrl.trim()] : [],
        video_url: mode === "reel" && videoUrl.trim() ? videoUrl.trim() : null,
        cta_url: ctaUrl.trim() || null,
        cta_text: ctaText.trim() || null,
        starts_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    setBusy(false);
    if (error || !inserted) return toast.error(error?.message || "Eroare la salvare");
    setPendingCampaignId(inserted.id as string);
    setCheckoutOpen(true);
  };

  const currentTier = TIERS.find((t) => t.id === tier)!;




  const inputClass =
    "w-full bg-white/5 rounded-xl px-3 py-3 text-sm border border-white/10 focus:border-neon-crimson outline-none";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-full flex items-end sm:items-center justify-center sm:p-4">
        <div
          className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-zinc-950 border border-white/10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-zinc-950 z-10">
            <div>
              <h3 className="font-display uppercase text-base">Postare nouă</h3>
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mt-0.5">
                apare pe ecranul principal când deschizi aplicația
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 -mr-1.5 rounded-lg hover:bg-white/5">
              <X size={18} />
            </button>
          </div>
          <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <Field label="Tip campanie">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("feed")}
                  className={`px-3 py-3 rounded-xl border text-left transition ${
                    mode === "feed"
                      ? "border-[#ff3d8b] bg-[#ff3d8b]/10"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-display uppercase text-white">
                    <ImageIcon size={13} /> Feed
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1">Card pe ecranul principal</div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("reel")}
                  className={`px-3 py-3 rounded-xl border text-left transition ${
                    mode === "reel"
                      ? "border-[#c724ff] bg-[#c724ff]/10"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-display uppercase text-white">
                    <Film size={13} /> Sponsored Reel
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1">Video în feed-ul Reels</div>
                </button>
              </div>
            </Field>

            {mode === "reel" && (
              <Field label="Video (max 60MB, mp4/webm)">
                {videoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/10">
                    <video src={videoUrl} className="w-full max-h-72" controls />
                    <button
                      type="button"
                      onClick={() => setVideoUrl("")}
                      className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label
                    className={`flex flex-col items-center justify-center gap-2 cursor-pointer ${inputClass} py-10 border-dashed text-zinc-400 hover:text-white hover:border-[#c724ff]/50`}
                  >
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <Film size={18} />}
                    <span className="text-[11px] font-mono uppercase tracking-widest">
                      {uploading ? "se încarcă..." : "alege video"}
                    </span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f, "video");
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </Field>
            )}

            <Field label={mode === "reel" ? "Imagine (fallback dacă nu ai video)" : "Imagine"}>
              {imageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-white/10">
                  <img src={imageUrl} alt="preview" className="w-full max-h-72 object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label
                  className={`flex flex-col items-center justify-center gap-2 cursor-pointer ${inputClass} py-10 border-dashed text-zinc-400 hover:text-white hover:border-neon-crimson/50`}
                >
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  <span className="text-[11px] font-mono uppercase tracking-widest">
                    {uploading ? "se încarcă..." : "alege imagine (max 10MB)"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </Field>

            {mode === "reel" && (
              <>
                <Field label="Buton CTA text (opțional)">
                  <input
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="Rezervă masă"
                    className={inputClass}
                    maxLength={15}
                  />
                </Field>
                <Field label="Buton CTA link (opțional)">
                  <input
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </Field>
              </>
            )}


            <Field label="Titlu">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Vineri DJ Set @ Club Form"
                className={inputClass}
                maxLength={80}
              />
            </Field>

            <Field label="Detalii (opțional)">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Linie-up, ora ușilor, ce să porți..."
                className={inputClass + " min-h-[100px] resize-y"}
                maxLength={800}
              />
            </Field>

            <Field label="Pachet">
              <div className="grid grid-cols-3 gap-2">
                {TIERS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTier(t.id)}
                    className={`px-2 py-3 rounded-xl text-center border transition ${
                      tier === t.id
                        ? "border-neon-crimson bg-neon-crimson/10"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div className="font-display text-lg" style={{ color: t.color }}>
                      {t.priceRon}
                    </div>
                    <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">
                      RON
                    </div>
                    <div className="text-[10px] text-zinc-300 mt-0.5">{t.label}</div>
                  </button>
                ))}
              </div>
            </Field>

            <button
              disabled={busy}
              onClick={submit}
              className="w-full mt-2 px-3 py-3.5 rounded-2xl text-white text-xs font-display uppercase tracking-widest disabled:opacity-50"
              style={{ background: "var(--gradient-chaos)" }}
            >
              {busy ? (
                <Loader2 size={14} className="inline animate-spin" />
              ) : (
                `Continuă la plată · ${currentTier.priceRon} RON`
              )}
            </button>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 text-center pt-1">
              plată securizată prin stripe · postarea se activează după confirmare
            </p>
          </div>
        </div>
      </div>
      <PremiumCheckoutDialog
        open={checkoutOpen && !!pendingCampaignId}
        onClose={() => {
          setCheckoutOpen(false);
          // If they close without paying, campaign remains draft — clean up
          if (pendingCampaignId) {
            supabase.from("campaigns").delete().eq("id", pendingCampaignId).then(() => {});
            setPendingCampaignId(null);
          }
        }}
        priceId={currentTier.priceId}
        title={`Promovare · ${currentTier.label}`}
        extra={pendingCampaignId ? { campaign_id: pendingCampaignId } : undefined}
        returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/app/biz?boost=success&session_id={CHECKOUT_SESSION_ID}`}
      />
    </div>
  );
}


function CreateBusinessSheet({
  open,
  onClose,
  brand,
  setBrand,
  busy,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  brand: string;
  setBrand: (v: string) => void;
  busy: boolean;
  onCreate: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-white/10 p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display uppercase text-lg">Brand nou</h3>
          <button onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <input
          autoFocus
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Ex: Club Form"
          className="w-full bg-white/5 rounded-md px-3 py-2.5 text-sm border border-white/10 focus:border-neon-crimson outline-none"
        />
        <button
          disabled={busy || !brand.trim()}
          onClick={onCreate}
          className="w-full px-3 py-2.5 rounded-md text-white text-xs font-display uppercase tracking-widest disabled:opacity-50"
          style={{ background: "var(--gradient-chaos)" }}
        >
          {busy ? <Loader2 size={14} className="inline animate-spin" /> : "Creează"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Camera, MapPin, Instagram, Upload, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";
import { BusinessReviewCard } from "@/components/biz/BusinessReviewCard";
import { ReportDialog } from "@/components/app/ReportDialog";
import { CheckInShareSheet } from "@/components/app/CheckInShareSheet";
import { toast } from "sonner";
import { evalOpenNow, normalizeHours, formatSlot, DAY_KEYS, DAY_LABELS } from "@/lib/openingHours";


export const Route = createFileRoute("/app/venue/$id")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("venues")
      .select("id,name,type,description,address,cover_url,opening_hours")
      .eq("id", params.id)
      .maybeSingle();
    return { venue: data };
  },
  head: ({ params, loaderData }) => {
    const v: any = loaderData?.venue;
    const name = v?.name ?? "Venue";
    const title = `${name} — OXIDAȚII`;
    const desc = v?.description
      ? String(v.description).slice(0, 155)
      : `${name}${v?.address ? ` · ${v.address}` : ""} — vezi cine e live, șprițuri și momente din ${name} pe OXIDAȚII.`;
    const url = `https://oxidatii.lovable.app/app/venue/${params.id}`;
    const ld: any = {
      "@context": "https://schema.org",
      "@type": v?.type === "club" ? "NightClub" : "BarOrPub",
      name,
      url,
      ...(v?.description && { description: v.description }),
      ...(v?.address && {
        address: { "@type": "PostalAddress", streetAddress: v.address, addressCountry: "RO" },
      }),
      ...(v?.cover_url && { image: v.cover_url }),
    };
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "place" },
        ...(v?.cover_url
          ? [
              { property: "og:image", content: v.cover_url },
              { name: "twitter:image", content: v.cover_url },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(ld) }],
    };
  },
  component: VenuePage,
});

function VenuePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareData, setShareData] = useState<{
    userName: string;
    userAvatar: string | null;
    spritzScore: number | null;
    streak: number | null;
  } | null>(null);


  const { data, isLoading } = useQuery({
    queryKey: ["venue", id],
    queryFn: async () => {
      const { data: venue, error } = await supabase
        .from("venues")
        .select(
          "id,name,type,description,ig_handle,address,cover_url,verified,opening_hours,street:streets(id,name,city:cities(name,slug))",
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      const [{ data: photos }, { count: liveCount }, { data: biz }] = await Promise.all([
        supabase
          .from("venue_photos")
          .select("id,photo_url,media_type,caption,created_at,user_id")
          .eq("venue_id", id)
          .order("created_at", { ascending: false })
          .limit(36),
        supabase
          .from("check_ins")
          .select("id", { count: "exact", head: true })
          .eq("venue_id", id)
          .gt("expires_at", new Date().toISOString()),
        supabase
          .rpc("get_business_account_public_by_venue", { _venue_id: id })
          .maybeSingle(),
      ]);
      return { venue, photos: photos ?? [], liveCount: liveCount ?? 0, biz: biz ?? null };
    },
  });

  // Real profile-view counter (fires once per mount)
  const tracked = useRef(false);
  useEffect(() => {
    if (!data?.biz?.id || tracked.current) return;
    tracked.current = true;
    supabase.rpc("increment_business_visit", { _business_id: data.biz.id }).then(() => {});
  }, [data?.biz?.id]);

  async function uploadPhoto(file: File) {
    if (!user) {
      toast.error("Trebuie să fii logat");
      return;
    }
    setUploading(true);
    try {
      const isVideo = file.type.startsWith("video/");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? (isVideo ? "mp4" : "jpg");
      const path = `${user.id}/${id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("venue-photos")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("venue-photos").getPublicUrl(path);
      const { error: insErr } = await supabase.from("venue_photos").insert({
        venue_id: id,
        user_id: user.id,
        photo_url: pub.publicUrl,
        media_type: isVideo ? "video" : "image",
      });
      if (insErr) throw insErr;
      await qc.invalidateQueries({ queryKey: ["venue", id] });
      toast.success(isVideo ? "Clip adăugat" : "Poză adăugată");
    } catch (e: any) {
      toast.error(e.message ?? "Nu s-a putut încărca");
    } finally {
      setUploading(false);
    }
  }

  if (isLoading || !data)
    return <div className="p-6 text-sm text-muted-foreground">Se încarcă...</div>;
  const v = data.venue as any;
  const heroCover = data.photos[0]?.photo_url || v.cover_url;
  const status = evalOpenNow(v.opening_hours);
  const hoursNorm = normalizeHours(v.opening_hours);
  const hasHours = DAY_KEYS.some((k) => hoursNorm[k]);

  return (
    <div className="pb-8">
      {/* Hero */}
      <div className="relative h-60 bg-muted">
        {heroCover ? (
          <img src={heroCover} alt={v.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-sunset-orange/30 via-sunset-magenta/20 to-sunset-indigo/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        {v.street?.id ? (
          <Link
            to="/app/street/$id"
            params={{ id: v.street.id }}
            style={{
              top: "calc(env(safe-area-inset-top) + 1rem)",
              left: "calc(env(safe-area-inset-left) + 1rem)",
            }}
            className="absolute h-10 w-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-foreground shadow-md"
          >
            <ArrowLeft size={18} />
          </Link>
        ) : (
          <Link
            to="/app/map"
            style={{
              top: "calc(env(safe-area-inset-top) + 1rem)",
              left: "calc(env(safe-area-inset-left) + 1rem)",
            }}
            className="absolute h-10 w-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-foreground shadow-md"
          >
            <ArrowLeft size={18} />
          </Link>
        )}
        <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between text-white">
          <div className="min-w-0">
            {v.street?.city?.name && (
              <div className="text-[11px] uppercase tracking-[0.18em] opacity-80">
                {v.street.city.name}
              </div>
            )}
            <h1 className="font-display font-bold text-3xl leading-tight drop-shadow truncate">
              {v.name}
            </h1>
          </div>
          {data.liveCount > 0 && (
            <div className="rounded-full bg-sunset-amber px-3 py-1 text-[11px] font-medium text-foreground shadow-md whitespace-nowrap">
              ● {data.liveCount} aici acum
            </div>
          )}
        </div>
        <div
          style={{
            top: "calc(env(safe-area-inset-top) + 1rem)",
            right: "calc(env(safe-area-inset-right) + 1rem)",
          }}
          className="absolute"
        >
          <ReportDialog targetType="venue" targetId={v.id} />
        </div>
      </div>

      <div className="px-5 pt-5 space-y-5 max-w-xl mx-auto">
        {v.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
        )}

        {/* Open now status */}
        {hasHours && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${status.isOpen ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {status.isOpen ? "Acum e deschis" : "Acum e închis"}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {status.isOpen && status.closesAt
                      ? `Închide la ${status.closesAt}`
                      : status.opensAt
                        ? `Deschide ${status.opensAt}`
                        : "Program necunoscut"}
                  </div>
                </div>
              </div>
              <Clock size={16} className="text-muted-foreground shrink-0" />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-1">
              {DAY_KEYS.map((k) => (
                <div
                  key={k}
                  className={`flex items-center justify-between text-xs px-2 py-1 rounded ${k === status.todayKey ? "bg-secondary font-semibold text-foreground" : "text-muted-foreground"}`}
                >
                  <span>
                    {DAY_LABELS[k]}
                    {k === status.todayKey ? " (azi)" : ""}
                  </span>
                  <span className="font-mono">{formatSlot(hoursNorm[k])}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {v.ig_handle && (
            <a
              href={`https://instagram.com/${v.ig_handle}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-1.5 rounded-full bg-secondary text-foreground flex items-center gap-1.5"
            >
              <Instagram size={12} /> @{v.ig_handle}
            </a>
          )}
          {v.street?.name && (
            <div className="text-xs px-3 py-1.5 rounded-full bg-secondary text-foreground flex items-center gap-1.5">
              <MapPin size={12} /> {v.street.name}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/app/scan"
            className="rounded-2xl bg-primary text-primary-foreground py-3.5 text-center text-sm font-semibold flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition"
          >
            <Camera size={16} /> Pune un șpriț
          </Link>
          <button
            onClick={async () => {
              if (!user) {
                toast.error("Trebuie să fii logat");
                return;
              }
              const { guardRateLimit } = await import("@/lib/rateLimit");
              if (!(await guardRateLimit("check_in"))) {
                toast.error("Prea multe check-in-uri. Încearcă peste un minut.");
                return;
              }
              const { haptic } = await import("@/lib/native");
              haptic("medium");
              const { error } = await supabase
                .from("check_ins")
                .insert({ venue_id: id, user_id: user.id });
              if (error) {
                toast.error(error.message);
                return;
              }
              toast.success("Ești aici · vizibil 4h");
              qc.invalidateQueries({ queryKey: ["venue", id] });

              // Fetch stats & open share sheet
              try {
                const { data: prof } = await supabase
                  .from("profiles")
                  .select("display_name,avatar_url,lifetime_sprits,current_streak")
                  .eq("id", user.id)
                  .maybeSingle();
                setShareData({
                  userName:
                    prof?.display_name ||
                    (user.email ? user.email.split("@")[0] : "Oxidat"),
                  userAvatar: prof?.avatar_url ?? null,
                  spritzScore: prof?.lifetime_sprits ?? null,
                  streak: prof?.current_streak ?? null,
                });
                setShareOpen(true);
              } catch (e) {
                console.warn("[checkin share] profile fetch failed", e);
              }

            className="rounded-2xl bg-card border border-border text-foreground py-3.5 text-sm font-semibold active:scale-[0.98] transition"
          >
            Sunt aici
          </button>
        </div>

        {/* Real ratings & reviews */}
        {data.biz?.id && (
          <BusinessReviewCard businessId={data.biz.id} brandName={data.biz.brand_name ?? undefined} />
        )}

        {/* Photo gallery — only user-uploaded */}

        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-display font-semibold text-lg leading-tight">
                Poze de la oameni
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {data.photos.length} {data.photos.length === 1 ? "poză" : "poze"}
              </p>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || !user}
              className="text-xs px-3 py-2 rounded-full bg-primary text-primary-foreground font-medium flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
            >
              <Upload size={12} /> {uploading ? "trimit..." : "pune poză"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPhoto(f);
                e.target.value = "";
              }}
            />
          </div>

          {data.photos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground bg-card">
              Încă nu sunt poze sau clipuri. Fii primul — apasă „pune poză / clip".
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {data.photos.map((p: any) => (
                <div
                  key={p.id}
                  className="aspect-square rounded-lg overflow-hidden bg-muted relative"
                >
                  {p.media_type === "video" ? (
                    <>
                      <video
                        src={p.photo_url}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[8px] uppercase tracking-widest text-white">
                        ▶
                      </div>
                    </>
                  ) : (
                    <img
                      src={p.photo_url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

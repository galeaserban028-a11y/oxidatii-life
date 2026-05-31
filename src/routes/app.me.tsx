import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  LogOut, Camera, Lock, Globe2, UserPlus, ShieldOff, ChevronDown, Menu, Plus,
  Grid3x3, Bookmark, UserSquare2, Flame, Share2, Bell, Settings, Pencil, Check,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useFollowStats, useIncomingFollowRequests } from "@/lib/follows";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

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
  const { data: followStats } = useFollowStats(user?.id);
  const { data: incomingReqs } = useIncomingFollowRequests(user?.id);
  const pendingCount = incomingReqs?.length ?? 0;

  // tab state for the grid
  const [tab, setTab] = useState<"all" | "verified" | "tagged">("all");
  // edit profile dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editHandle, setEditHandle] = useState(profile?.handle ?? "");
  const [editName, setEditName] = useState(profile?.display_name ?? "");
  const [editBio, setEditBio] = useState((profile as any)?.bio ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function shareProfile() {
    const url = `${window.location.origin}/u/${profile?.handle ?? user?.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `@${profile?.handle ?? "oxidat"} pe OXIDAȚII`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiat");
      }
    } catch {/* user cancelled */}
  }

  async function saveProfile() {
    if (!user) return;
    const h = editHandle.trim().toLowerCase();
    if (h && !/^[a-z0-9_.]{3,24}$/.test(h)) {
      toast.error("Handle: 3-24 caractere a-z, 0-9, _ sau .");
      return;
    }
    setSavingProfile(true);
    try {
      const { error } = await supabase.from("profiles").update({
        handle: h || null,
        display_name: editName.trim() || null,
        bio: editBio.trim() || null,
      } as any).eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profil actualizat");
      setEditOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Eroare");
    } finally {
      setSavingProfile(false);
    }
  }



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
    <div className="pb-3">
      {/* Top bar — IG style */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-foreground/10 px-3 h-12 flex items-center justify-between">
        <Link to="/app/scan" className="p-1.5 -ml-1.5 active:scale-95 transition" aria-label="Adaugă">
          <Plus size={24} strokeWidth={2.2} />
        </Link>
        <button className="flex items-center gap-1 font-display uppercase text-base tracking-wide max-w-[55%] truncate">
          <span className="truncate">@{profile.handle ?? "—"}</span>
          <ChevronDown size={16} className="shrink-0 opacity-70" />
          <span className="ml-1 h-1.5 w-1.5 rounded-full bg-neon-crimson shadow-[0_0_8px_var(--neon-crimson)]" />
        </button>
        <button
          onClick={async () => { await signOut(); nav({ to: "/", replace: true }); }}
          className="p-1.5 -mr-1.5 active:scale-95 transition"
          aria-label="Menu"
        >
          <Menu size={24} strokeWidth={2.2} />
        </button>
      </header>

      <div className="px-4 pt-4">
        {/* Avatar + stats row */}
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="relative h-[88px] w-[88px] rounded-full p-[2px] bg-gradient-to-tr from-neon-crimson via-neon-purple to-neon-green shrink-0 active:scale-95 transition"
          >
            <div className="h-full w-full rounded-full overflow-hidden bg-background flex items-center justify-center text-3xl font-display">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (profile.handle ?? "?")[0].toUpperCase()
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-foreground text-background flex items-center justify-center ring-[3px] ring-background">
              <Plus size={14} strokeWidth={3} />
            </div>
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-[10px] font-mono uppercase">…</div>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ""; }}
          />

          <div className="flex-1 grid grid-cols-3 gap-1 text-center">
            <IgStat value={profile.lifetime_sprits ?? 0} label="șprițuri" />
            <Link to="/app/followers" search={{ tab: "followers" }} className="block">
              <IgStat value={followStats?.followers ?? 0} label="urmăritori" />
            </Link>
            <Link to="/app/followers" search={{ tab: "following" }} className="block">
              <IgStat value={followStats?.following ?? 0} label="urmăriri" />
            </Link>
          </div>
        </div>

        {/* Bio block */}
        <div className="mt-3">
          <div className="font-display uppercase text-[15px] leading-tight">
            {RANK_LABELS[profile.rank] ?? profile.rank}
          </div>
          <div className="text-[12px] text-muted-foreground mt-0.5">
            aură <span className="text-neon-purple font-mono">{profile.aura ?? 0}</span>
            {moments?.city && <> · din <span className="text-foreground">{moments.city.name}</span></>}
          </div>
          <button
            onClick={togglePrivacy}
            disabled={savingPrivacy}
            className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-md border border-foreground/15 hover:border-foreground/30 transition"
          >
            {profile.is_public ? <Globe2 size={11} className="text-neon-green" /> : <Lock size={11} className="text-neon-crimson" />}
            <span className={profile.is_public ? "text-neon-green" : "text-neon-crimson"}>
              {profile.is_public ? "public" : "privat"}
            </span>
            <span className="text-muted-foreground">· schimbă</span>
          </button>
        </div>

        {/* Action buttons — Editează / Distribuie */}
        <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-1.5">
          <Link
            to="/app/feed"
            className="h-9 rounded-lg bg-foreground/10 hover:bg-foreground/15 active:scale-[0.98] transition flex items-center justify-center text-[13px] font-semibold"
          >
            Feed privat
          </Link>
          <Link
            to="/app/followers"
            search={{ tab: "followers" }}
            className="h-9 rounded-lg bg-foreground/10 hover:bg-foreground/15 active:scale-[0.98] transition flex items-center justify-center text-[13px] font-semibold"
          >
            Trupa ta
          </Link>
          <Link
            to="/app/blocked"
            className="h-9 w-9 rounded-lg bg-foreground/10 hover:bg-foreground/15 active:scale-[0.98] transition flex items-center justify-center"
            aria-label="Blocați"
          >
            <ShieldOff size={16} />
          </Link>
        </div>

        {/* Pending requests highlight */}
        {pendingCount > 0 && (
          <Link
            to="/app/requests"
            className="mt-3 flex items-center gap-2.5 p-2.5 rounded-xl border border-neon-crimson/40 bg-neon-crimson/10 active:scale-[0.99] transition"
          >
            <div className="h-8 w-8 rounded-full bg-neon-crimson text-white flex items-center justify-center shrink-0">
              <UserPlus size={14} strokeWidth={2.6} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display uppercase text-sm leading-tight">
                {pendingCount} cerere{pendingCount === 1 ? "" : "i"} de urmărire
              </div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                acceptă sau respinge →
              </div>
            </div>
          </Link>
        )}

        {/* Highlights row — IG story style */}
        <div className="mt-4 flex items-start gap-4 overflow-x-auto -mx-4 px-4 pb-1 no-scrollbar">
          <Link to="/app/scan" className="flex flex-col items-center gap-1 shrink-0 w-[72px]">
            <div className="h-16 w-16 rounded-full border border-foreground/20 flex items-center justify-center">
              <Plus size={22} strokeWidth={2.2} />
            </div>
            <span className="text-[11px] truncate w-full text-center">Nou</span>
          </Link>
          <div className="flex flex-col items-center gap-1 shrink-0 w-[72px]">
            <div className="h-16 w-16 rounded-full border border-neon-crimson/50 bg-gradient-to-br from-neon-crimson/20 to-neon-purple/20 flex items-center justify-center">
              <Flame size={26} className="text-neon-crimson" />
            </div>
            <span className="text-[11px] truncate w-full text-center">
              streak {(profile as any).current_streak ?? 0}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 shrink-0 w-[72px]">
            <div className="h-16 w-16 rounded-full border border-foreground/20 flex items-center justify-center text-2xl">
              👑
            </div>
            <span className="text-[11px] truncate w-full text-center">record {(profile as any).longest_streak ?? 0}</span>
          </div>
          <div className="flex flex-col items-center gap-1 shrink-0 w-[72px]">
            <div className="h-16 w-16 rounded-full border border-foreground/20 flex items-center justify-center text-2xl">
              🍻
            </div>
            <span className="text-[11px] truncate w-full text-center">faze</span>
          </div>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="mt-3 grid grid-cols-3 border-t border-foreground/10">
        <button className="h-11 flex items-center justify-center border-b-2 border-foreground">
          <Grid3x3 size={22} />
        </button>
        <button className="h-11 flex items-center justify-center border-b-2 border-transparent text-muted-foreground">
          <Bookmark size={22} />
        </button>
        <button className="h-11 flex items-center justify-center border-b-2 border-transparent text-muted-foreground">
          <UserSquare2 size={22} />
        </button>
      </div>

      {/* Grid moments */}
      {allMoments.length === 0 ? (
        <div className="mx-4 mt-4 rounded-2xl border border-dashed border-foreground/15 p-8 text-center space-y-2">
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
        <div className="grid grid-cols-3 gap-0.5">
          {allMoments.map((m: any) => (
            <div key={`${m._kind}-${m.id}`} className="relative aspect-square overflow-hidden bg-foreground/5">
              <img src={m.photo_url} alt={m.caption ?? ""} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              {m._kind === "proof" && (
                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-sm bg-neon-green/30 border border-neon-green/50 backdrop-blur-sm">
                  <span className="font-mono text-[8px] uppercase text-neon-green">verificat</span>
                </div>
              )}
              {m.venue?.name && (
                <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-white truncate">
                    {m.venue.name}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={async () => { await signOut(); nav({ to: "/", replace: true }); }}
        className="mt-4 mx-4 w-[calc(100%-2rem)] px-4 py-2.5 flex items-center justify-center gap-2 text-xs text-neon-crimson border border-foreground/10 rounded-lg hover:bg-neon-crimson/10 transition"
      >
        <LogOut size={14} /> Logout
      </button>

      <p className="text-[10px] font-mono text-center text-muted-foreground/50 pt-3">
        OXIDAȚII · construit pe oameni reali · made in Balcani
      </p>
    </div>
  );
}

function IgStat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="py-1">
      <div className="font-display text-xl leading-none">{value}</div>
      <div className="text-[12px] text-muted-foreground mt-0.5">{label}</div>
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


import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  LogOut, Camera, Lock, Globe2, UserPlus, ShieldOff, ChevronDown, Menu, Plus,
  Grid3x3, Bookmark, UserSquare2, Flame, Share2, Bell, Pencil, Check, Settings, Rocket, Gem,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useFollowStats, useIncomingFollowRequests } from "@/lib/follows";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { ShieldAlert } from "lucide-react";
import { StoriesStrip } from "@/components/app/StoriesStrip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ReputationCard } from "@/components/app/ReputationCard";
import { PremiumBadge } from "@/components/app/PremiumBadge";
import { ProfileBoostCard } from "@/components/app/ProfileBoostCard";
import { PremiumExtrasCard } from "@/components/app/PremiumExtrasCard";


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
  const { isStaff, isAdmin } = useIsAdmin();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const { data: followStats } = useFollowStats(user?.id);
  const { data: incomingReqs } = useIncomingFollowRequests(user?.id);
  const pendingCount = incomingReqs?.length ?? 0;
  const { data: activeFrame } = useQuery({
    queryKey: ["active-frame", profile?.active_frame_id],
    enabled: !!profile?.active_frame_id,
    queryFn: async () => {
      const { data } = await supabase.from("avatar_frames").select("css_class").eq("id", profile!.active_frame_id!).maybeSingle();
      return data;
    },
  });

  // tab state for the grid
  const [tab, setTab] = useState<"posts" | "reposts">("posts");

  // edit profile dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editHandle, setEditHandle] = useState(profile?.handle ?? "");
  const [editName, setEditName] = useState(profile?.display_name ?? "");
  const [editBio, setEditBio] = useState((profile as any)?.bio ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function shareProfile() {
    if (!user) return;
    // Always use the published domain so shared links work for anyone, not just preview users
    const base = "https://oxidatii.lovable.app";
    const slug = profile?.handle ? profile.handle : user.id;
    const url = `${base}/app/user/${slug}`;
    const title = `@${profile?.handle ?? profile?.display_name ?? "oxidat"} pe OXIDAȚII`;
    const text = "Vezi profilul meu pe OXIDAȚII 🍻";

    // Try native share first (mobile / supported browsers)
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e: any) {
        // AbortError = user cancelled; anything else falls through to clipboard
        if (e?.name === "AbortError") return;
      }
    }

    // Fallback: copy to clipboard
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiat — dă-l la prieteni!", { description: url });
        return;
      }
    } catch {/* fall through */}

    // Last resort: legacy execCommand copy via hidden textarea
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast.success("Link copiat", { description: url });
    } catch {
      toast.error("Nu am putut copia. Link: " + url, { duration: 8000 });
    }
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

  const { data: reposts = [] } = useQuery({
    queryKey: ["my-reposts", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: rep } = await supabase
        .from("photo_reposts")
        .select("photo_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(40);
      const ids = (rep ?? []).map((r) => r.photo_id);
      if (!ids.length) return [];
      const { data: pics } = await supabase
        .from("venue_photos")
        .select("id, photo_url, caption, taken_at, venue:venues(id, name, city:cities(name))")
        .in("id", ids);
      const map = new Map((pics ?? []).map((p: any) => [p.id, p]));
      return (rep ?? [])
        .map((r: any) => {
          const photo = map.get(r.photo_id);
          if (!photo) return null;
          return { ...photo, _kind: "photo" as const, _date: r.created_at };
        })
        .filter(Boolean) as any[];
    },
  });

  if (!user || !profile) return null;

  const verifiedProofs = (moments?.proofs ?? []).filter((p: any) => p.ai_verified);
  const allMoments = [
    ...verifiedProofs.map((p: any) => ({ ...p, _kind: "proof" as const, _date: p.created_at })),
    ...(moments?.photos ?? []).map((p: any) => ({ ...p, _kind: "photo" as const, _date: p.taken_at })),
  ].sort((a, b) => +new Date(b._date) - +new Date(a._date));

  const tabMoments = tab === "reposts" ? reposts : allMoments;
  const postsCount = allMoments.length;
  const repostsCount = reposts.length;


  const handleDoSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    nav({ to: "/", replace: true });
  };

  const instrument = { fontFamily: '"Instrument Serif", "Work Sans", serif' };

  return (
    <div className="pb-3 bg-[#050505] min-h-screen text-white">
      {/* Top bar — sunset glass */}
      <header className="sticky top-0 z-30 bg-[#050505]/85 backdrop-blur-xl border-b border-white/5 px-3 h-12 flex items-center justify-between">
        <Link to="/app/scan" className="p-1.5 -ml-1.5 active:scale-95 transition text-white/80 hover:text-[#f7931e]" aria-label="Adaugă">
          <Plus size={24} strokeWidth={2.2} />
        </Link>

        <div className="flex-1 flex justify-center">
          <span style={instrument} className="text-xl tracking-tight">
            @{profile.handle ?? "—"}<span className="text-[#f7931e]">.</span>
          </span>
        </div>

        <Link to="/app/settings" className="p-1.5 active:scale-95 transition text-white/80 hover:text-white" aria-label="Setări">
          <Settings size={22} strokeWidth={2.1} />
        </Link>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button className="p-1.5 -mr-1.5 active:scale-95 transition relative text-white/80" aria-label="Meniu">
              <Menu size={24} strokeWidth={2.2} />
              {pendingCount > 0 && (
                <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-[#e84393] animate-pulse" />
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0 bg-[#0a0a0a] border-l border-white/10 text-white">
            <SheetHeader className="px-4 py-3 border-b border-white/10 text-left">
              <SheetTitle style={instrument} className="text-2xl text-white">Meniu<span className="text-[#f7931e]">.</span></SheetTitle>
            </SheetHeader>
            <nav className="py-2">
              <MenuItem to="/app/settings" icon={<Settings size={16} className="text-[#f7931e]" />} onSelect={() => setMenuOpen(false)} label="Setări" />
              <MenuItem to="/app/premium" icon={<Gem size={16} className="text-[#e84393]" />} onSelect={() => setMenuOpen(false)} label="Șpriț Premium ✨" />
              {["vip_plus", "pro", "elite"].includes((profile as any)?.premium_tier ?? "") && (
                <MenuItem to="/app/me/raters" icon={<Gem size={16} className="text-rose-400" />} onSelect={() => setMenuOpen(false)} label="Cine ți-a dat rating" />
              )}
              {["pro", "elite"].includes((profile as any)?.premium_tier ?? "") && (
                <MenuItem to="/app/me/reputation" icon={<Gem size={16} className="text-emerald-400" />} onSelect={() => setMenuOpen(false)} label="Reputation analytics" />
              )}
              <MenuItem to="/app/biz" icon={<Rocket size={16} className="text-[#6c5ce7]" />} onSelect={() => setMenuOpen(false)} label="Business · Promovare" />
              {isStaff && (
                <MenuItem to="/app/admin" icon={<ShieldAlert size={16} className="text-[#e84393]" />} onSelect={() => setMenuOpen(false)} label={isAdmin ? "Panou Admin" : "Panou Moderator"} />
              )}
              <div className="my-1 border-t border-white/10" />
              <MenuItem to="/app/me/archive" icon={<Bookmark size={16} className="text-[#f7931e]" />} onSelect={() => setMenuOpen(false)} label="Arhiva ta" />
              <MenuItem to="/app/notifications" icon={<Bell size={16} className="text-white/70" />} onSelect={() => setMenuOpen(false)} label="Notificări" />
              <MenuItem to="/app/requests" icon={<UserPlus size={16} className="text-white/70" />} onSelect={() => setMenuOpen(false)}
                label="Cereri urmărire" badge={pendingCount > 0 ? pendingCount : undefined} />
              <MenuItem to="/app/blocked" icon={<ShieldOff size={16} className="text-white/70" />} onSelect={() => setMenuOpen(false)} label="Utilizatori blocați" />
              <MenuItem to="/app/inbox" icon={<UserSquare2 size={16} className="text-white/70" />} onSelect={() => setMenuOpen(false)} label="Mesaje" />

              <button
                onClick={() => { setMenuOpen(false); togglePrivacy(); }}
                disabled={savingPrivacy}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left"
              >
                {profile.is_public ? <Globe2 size={16} className="text-[#f7931e]" /> : <Lock size={16} className="text-[#e84393]" />}
                <span className="text-sm flex-1">
                  Cont: <span className={profile.is_public ? "text-[#f7931e]" : "text-[#e84393]"}>{profile.is_public ? "public" : "privat"}</span>
                </span>
                <span className="text-[10px] font-mono uppercase text-white/40">schimbă</span>
              </button>
              <button
                onClick={() => { setMenuOpen(false); shareProfile(); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left"
              >
                <Share2 size={16} className="text-white/70" />
                <span className="text-sm">Distribuie profilul</span>
              </button>
              <div className="my-2 border-t border-white/10" />
              <button
                onClick={handleDoSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#e84393]/10 transition text-left text-[#e84393]"
              >
                <LogOut size={16} />
                <span className="text-sm">Logout</span>
              </button>
            </nav>
          </SheetContent>
        </Sheet>
      </header>

      <div className="px-5 pt-6">
        {/* Avatar + stats row */}
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="relative h-[92px] w-[92px] rounded-full p-[2.5px] bg-gradient-to-br from-[#ff6b35] via-[#f7931e] to-[#e84393] shadow-[0_0_28px_rgba(232,67,147,0.4)] shrink-0 active:scale-95 transition"
            aria-label="Schimbă poza de profil"
          >
            <div className={`h-full w-full rounded-full overflow-hidden bg-[#0a0a0a] flex items-center justify-center text-3xl ${activeFrame?.css_class ?? ""}`} style={instrument}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                (profile.handle ?? "?")[0].toUpperCase()
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-[#0a0a0a] border border-white/15 text-white/80 flex items-center justify-center shadow-lg">
              <Camera size={13} strokeWidth={2.4} />
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
            <Link to="/app/scan" className="block">
              <IgStat value={profile.lifetime_sprits ?? 0} label="șprițuri" />
            </Link>
            <Link to="/app/followers" search={{ tab: "followers" }} className="block">
              <IgStat value={followStats?.followers ?? 0} label="urmăritori" />
            </Link>
            <Link to="/app/followers" search={{ tab: "following" }} className="block">
              <IgStat value={followStats?.following ?? 0} label="urmăriri" />
            </Link>
          </div>
        </div>

        {/* Bio block */}
        <div className="mt-6 space-y-1.5">
          <div style={instrument} className="text-2xl leading-tight flex items-center gap-2 flex-wrap tracking-tight">
            <span>{profile.display_name || `@${profile.handle ?? "—"}`}</span>
            <PremiumBadge tier={(profile as any).premium_tier} size="sm" />
          </div>
          {profile.display_name && profile.handle && (
            <div className="text-[12px] font-mono text-white/40">@{profile.handle}</div>
          )}
          {(profile as any).bio && (
            <p className="text-[13px] text-white/80 pt-2 whitespace-pre-line leading-relaxed">{(profile as any).bio}</p>
          )}
          {moments?.city && (
            <div className="text-[12px] text-white/40 pt-1 flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-[#f7931e]" />
              din <span className="text-white/90">{moments.city.name}</span>
            </div>
          )}
        </div>

        {/* Premium CTA — only when not subscribed */}
        {!(profile as any).premium_tier && (
          <Link
            to="/app/premium"
            className="mt-8 flex items-center gap-4 rounded-2xl border border-white/5 bg-gradient-to-br from-indigo-600/15 via-purple-600/10 to-transparent p-4 active:scale-[0.99] transition group"
          >
            <div className="h-11 w-11 rounded-xl bg-indigo-500/10 flex items-center justify-center shadow-inner">
              <Gem size={18} className="text-indigo-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display uppercase text-[12px] tracking-wider text-white">Devino VIP, PRO sau ELITE</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Badge, frame, teme, șprițuri · de la 2.99 lei</div>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 group-hover:text-white transition-colors">Vezi →</span>
          </Link>
        )}

        <div className="mt-8 space-y-3">
          <ProfileBoostCard />
          <PremiumExtrasCard />
        </div>

        <div className="mt-8">
          <ReputationCard
            userId={user.id}
            sprits={profile.lifetime_sprits ?? 0}
            streak={(profile as any).current_streak ?? 0}
            longestStreak={(profile as any).longest_streak ?? 0}
            followers={followStats?.followers ?? 0}
            following={followStats?.following ?? 0}
            aura={profile.aura ?? 0}
            hasAvatar={!!profile.avatar_url}
            hasBio={!!(profile as any).bio}
            createdAt={(profile as any).created_at}
          />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <Link
            to="/app/discover"
            className="p-5 rounded-2xl bg-zinc-900/30 border border-white/5 flex flex-col gap-3 hover:bg-zinc-800/40 active:scale-[0.99] transition-all duration-300 group"
          >
            <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-pink-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider">Caută oameni</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">dă follow</div>
            </div>
          </Link>
          <Link
            to="/app/shop"
            className="p-5 rounded-2xl bg-zinc-900/30 border border-white/5 flex flex-col gap-3 hover:bg-zinc-800/40 active:scale-[0.99] transition-all duration-300 group"
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Gem size={18} className="text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider">Bar</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">{profile.coin_balance ?? 0} {(profile.coin_balance ?? 0) === 1 ? "șpriț" : "șprițuri"} · dă rândul</div>
            </div>
          </Link>
        </div>

        {/* Action buttons */}
        <div className="mt-8 grid grid-cols-[1fr_1fr_auto] gap-3">
          <Dialog open={editOpen} onOpenChange={(o) => {
            setEditOpen(o);
            if (o) {
              setEditHandle(profile.handle ?? "");
              setEditName(profile.display_name ?? "");
              setEditBio((profile as any).bio ?? "");
            }
          }}>
            <DialogTrigger asChild>
              <button className="h-12 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-[0.98] transition flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest">
                <Pencil size={13} /> Editează
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-display uppercase">Editează profilul</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Field label="Handle">
                  <div className="flex items-center rounded-lg border border-foreground/15 bg-foreground/5 overflow-hidden">
                    <span className="px-2 text-muted-foreground text-sm">@</span>
                    <input
                      value={editHandle}
                      onChange={(e) => setEditHandle(e.target.value)}
                      placeholder="oxidat_007"
                      maxLength={24}
                      className="flex-1 bg-transparent px-1 py-2 text-sm focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">3-24 caractere: a-z, 0-9, _ sau .</p>
                </Field>
                <Field label="Nume afișat">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Cum vrei să-ți spună haita"
                    maxLength={60}
                    className="w-full rounded-lg border border-foreground/15 bg-foreground/5 px-3 py-2 text-sm focus:outline-none focus:border-foreground/30"
                  />
                </Field>
                <Field label="Bio">
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="cine ești, ce bei, unde te găsim..."
                    rows={3}
                    maxLength={200}
                    className="w-full rounded-lg border border-foreground/15 bg-foreground/5 px-3 py-2 text-sm focus:outline-none focus:border-foreground/30 resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">{editBio.length}/200</p>
                </Field>
              </div>
              <DialogFooter>
                <button
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 rounded-lg border border-foreground/15 text-sm hover:bg-foreground/5"
                >
                  Anulează
                </button>
                <button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="px-4 py-2 rounded-lg bg-neon-green text-background text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check size={14} /> {savingProfile ? "Se salvează..." : "Salvează"}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <button
            onClick={shareProfile}
            className="h-12 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-[0.98] transition flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest"
          >
            <Share2 size={13} /> Distribuie
          </button>
          <Link
            to="/app/notifications"
            className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-[0.98] transition flex items-center justify-center relative"
            aria-label="Notificări"
          >
            <Bell size={16} />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-neon-crimson text-white text-[9px] flex items-center justify-center font-mono">
                {pendingCount}
              </span>
            )}
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

      </div>

      {/* Stories — propriile story-uri + prieteni */}
      <div className="mt-10">
        <StoriesStrip />
      </div>

      <div className="mt-6 border-t border-foreground/5" />

      {/* TikTok-style tabs */}
      <div className="sticky top-12 z-20 bg-background/85 backdrop-blur-xl border-b border-foreground/10 grid grid-cols-2">
        <button
          onClick={() => setTab("posts")}
          className={`h-11 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest border-b-2 transition ${
            tab === "posts" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"
          }`}
        >
          <Grid3x3 size={14} />
          Postări <span className="font-mono text-[10px] opacity-70">{postsCount}</span>
        </button>
        <button
          onClick={() => setTab("reposts")}
          className={`h-11 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest border-b-2 transition ${
            tab === "reposts" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"
          }`}
        >
          <Share2 size={14} />
          Reposturi <span className="font-mono text-[10px] opacity-70">{repostsCount}</span>
        </button>
      </div>

      {/* Grid moments */}
      {tabMoments.length === 0 ? (
        <div className="mx-4 mt-4 rounded-2xl border border-dashed border-foreground/15 p-8 text-center space-y-2">
          <div className="text-4xl">{tab === "reposts" ? "↻" : "📸"}</div>
          <div className="font-display uppercase">
            {tab === "reposts" ? "Niciun repost încă" : "Niciun moment încă."}
          </div>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            {tab === "reposts"
              ? "Când dai repost la o fază din feed, apare aici."
              : "Nu inventăm istorii. Când postezi o poză sau scanezi un șpriț, apare aici."}
          </p>
          <Link to={tab === "reposts" ? "/app/faze" : "/app/scan"} className="inline-flex mt-2 font-mono text-[10px] uppercase tracking-widest px-4 py-2 rounded-md border border-foreground/20 hover:border-neon-purple">
            {tab === "reposts" ? "vezi fazele →" : "scanează primul șpriț →"}
          </Link>
        </div>

      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {tabMoments.map((m: any) => {
            // Proofs go to venue; photos (incl. reposts) open the post detail
            const isProof = m._kind === "proof";
            return (
              <Link
                key={`${m._kind}-${m.id}`}
                to={isProof ? (m.venue?.id ? "/app/venue/$id" : "/app/me") : "/app/photo/$id"}
                params={isProof ? (m.venue?.id ? { id: m.venue.id } : undefined as any) : { id: m.id }}
                className="relative aspect-square overflow-hidden bg-foreground/5 group"
              >
                <img src={m.photo_url} alt={m.caption ?? ""} className="absolute inset-0 h-full w-full object-cover group-active:scale-105 transition" loading="lazy" />
                {isProof && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-sm bg-neon-green/30 border border-neon-green/50 backdrop-blur-sm">
                    <span className="font-mono text-[8px] uppercase text-neon-green">verificat</span>
                  </div>
                )}
                {tab === "reposts" && (
                  <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-sm bg-sunset-amber/30 border border-sunset-amber/50 backdrop-blur-sm">
                    <span className="font-mono text-[8px] uppercase text-sunset-amber">↻ repost</span>
                  </div>
                )}
                {m.venue?.name && (
                  <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="font-mono text-[9px] uppercase tracking-wider text-white truncate">
                      {m.venue.name}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}

        </div>
      )}

      

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

function TabBtn({ active, onClick, icon }: { active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`h-11 flex items-center justify-center border-b-2 transition ${
        active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground/70"
      }`}
    >
      {icon}
    </button>
  );
}

function MenuItem({ to, icon, label, badge, onSelect }: { to: string; icon: React.ReactNode; label: string; badge?: number; onSelect?: () => void }) {
  return (
    <Link
      to={to as any}
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-foreground/5 transition"
    >
      {icon}
      <span className="text-sm flex-1">{label}</span>
      {badge ? (
        <span className="h-5 min-w-5 px-1.5 rounded-full bg-neon-crimson text-white text-[10px] flex items-center justify-center font-mono">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
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



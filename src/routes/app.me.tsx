import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { LogOut, MapPin, Trophy } from "lucide-react";

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
  const { user, profile, signOut } = useAuth();
  if (!user || !profile) return null;

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-neon-crimson to-neon-purple flex items-center justify-center text-3xl font-display font-black">
          {(profile.handle ?? "?")[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-display font-black text-2xl truncate">@{profile.handle}</div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-neon-crimson">
            {RANK_LABELS[profile.rank] ?? profile.rank}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="aură" value={profile.aura} color="var(--neon-purple)" />
        <Stat label="șprițuri" value={profile.lifetime_sprits} color="var(--neon-crimson)" />
        <Stat label="rang" value={profile.rank === "MDS" ? "MDS" : "↑"} color="var(--neon-green)" />
      </div>

      <div className="rounded-2xl bg-foreground/5 border border-foreground/10 divide-y divide-foreground/5">
        <Row icon={<MapPin size={16}/>} label="Locație" value={profile.location_consent ? "Activă" : "Oprită"} />
        <Row icon={<Trophy size={16}/>} label="Top zilnic" value="Activ" />
        <button onClick={async () => { await signOut(); nav({ to: "/", replace: true }); }}
          className="w-full px-4 py-3 flex items-center gap-3 text-sm text-neon-crimson">
          <LogOut size={16}/> Logout
        </button>
      </div>

      <p className="text-[10px] font-mono text-center text-muted-foreground/50 pt-4">
        OXIDAȚII v0.1 · made in Balcani
      </p>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl bg-foreground/5 border border-foreground/10 p-3 text-center">
      <div className="font-display font-black text-2xl" style={{ color, textShadow: `0 0 10px ${color}` }}>{value}</div>
      <div className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="px-4 py-3 flex items-center gap-3 text-sm">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1">{label}</div>
      <div className="text-xs font-mono text-muted-foreground">{value}</div>
    </div>
  );
}

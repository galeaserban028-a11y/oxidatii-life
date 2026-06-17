import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Sparkles, Eye, MapPin, Loader2, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Visitor = { user_id: string; handle: string | null; display_name: string | null; avatar_url: string | null; last_visit: string; visit_count?: number; last_seen?: string };

const PRICE = 15; // șprițuri

export function CrystalBallCard() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tab, setTab] = useState<"visitors" | "nearby">("visitors");

  const { data, isLoading } = useQuery({
    queryKey: ["crystal-ball", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_crystal_ball");
      if (error) throw error;
      return data as { ok: boolean; unlocked: boolean; expires_at?: string; visitors?: Visitor[]; nearby?: Visitor[] };
    },
  });

  const unlock = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("unlock_crystal_ball");
      if (error) throw error;
      const r = data as any;
      if (!r.ok) throw new Error(r.error ?? "Eroare");
      return r;
    },
    onSuccess: () => {
      toast.success("🔮 Crystal Ball activat 7 zile");
      qc.invalidateQueries({ queryKey: ["crystal-ball", user?.id] });
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Nu ai destule șprițuri"),
  });

  if (!user) return null;

  const unlocked = data?.unlocked === true;
  const visitors = data?.visitors ?? [];
  const nearby = data?.nearby ?? [];
  const coins = (profile as any)?.coin_balance ?? 0;
  const expiresAt = data?.expires_at ? new Date(data.expires_at) : null;

  return (
    <div className="rounded-2xl border border-fuchsia-400/30 p-4 bg-gradient-to-br from-fuchsia-500/10 via-violet-500/10 to-cyan-400/10 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-fuchsia-400" />
          <div className="font-display uppercase text-sm tracking-wide">Crystal Ball</div>
        </div>
        {unlocked && expiresAt && (
          <div className="text-[10px] font-mono uppercase tracking-widest text-fuchsia-300">
            activ · {Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000))}z
          </div>
        )}
      </div>

      {!unlocked ? (
        <>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Vezi <span className="text-foreground">cine ți-a vizitat profilul</span> și
            <span className="text-foreground"> cine a fost fizic aproape de tine</span> în ultimele 7 zile.
          </p>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={isLoading || unlock.isPending}
            className="w-full h-11 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
          >
            {unlock.isPending ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            Deblochează · {PRICE} șprițuri / 7 zile
          </button>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground text-center">
            ai {coins} șprițuri · plata cu card vine curând
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-1 rounded-full bg-foreground/5 p-1">
            <button
              onClick={() => setTab("visitors")}
              className={`flex-1 h-8 rounded-full text-[10px] font-mono uppercase tracking-widest flex items-center justify-center gap-1 transition ${tab === "visitors" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              <Eye size={12} /> Vizitatori ({visitors.length})
            </button>
            <button
              onClick={() => setTab("nearby")}
              className={`flex-1 h-8 rounded-full text-[10px] font-mono uppercase tracking-widest flex items-center justify-center gap-1 transition ${tab === "nearby" ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              <MapPin size={12} /> Aproape ({nearby.length})
            </button>
          </div>

          <VisitorList items={tab === "visitors" ? visitors : nearby} emptyText={tab === "visitors" ? "Nimeni încă. Distribuie profilul!" : "Nimeni aproape (necesită locație live activă)."} />
        </>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activează Crystal Ball</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Vei plăti <span className="text-foreground font-semibold">{PRICE} șprițuri</span> pentru 7 zile de acces la vizitatori și utilizatori aproape de tine.
          </p>
          <p className="text-xs text-muted-foreground">Ai {coins} șprițuri.</p>
          <DialogFooter>
            <button onClick={() => setConfirmOpen(false)} className="h-10 px-4 rounded-full border border-foreground/15 text-xs font-mono uppercase tracking-widest">Anulează</button>
            <button
              onClick={() => { setConfirmOpen(false); unlock.mutate(); }}
              disabled={coins < PRICE}
              className="h-10 px-4 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white text-xs font-mono uppercase tracking-widest disabled:opacity-50"
            >
              Activează
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VisitorList({ items, emptyText }: { items: Visitor[]; emptyText: string }) {
  if (items.length === 0) {
    return <div className="text-xs text-muted-foreground italic text-center py-4">{emptyText}</div>;
  }
  return (
    <ul className="space-y-2 max-h-80 overflow-y-auto">
      {items.map((v) => {
        const when = new Date(v.last_visit ?? v.last_seen ?? Date.now());
        const ago = relativeAgo(when);
        return (
          <li key={v.user_id}>
            <Link
              to="/app/user/$id"
              params={{ id: v.handle ?? v.user_id }}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-foreground/5 active:scale-[0.99]"
            >
              {v.avatar_url ? (
                <img src={v.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-foreground/10" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{v.display_name ?? v.handle ?? "Anonim"}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground truncate">
                  {v.handle ? `@${v.handle}` : ""} · {ago}{v.visit_count ? ` · ${v.visit_count}x` : ""}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function relativeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "acum";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}z`;
}

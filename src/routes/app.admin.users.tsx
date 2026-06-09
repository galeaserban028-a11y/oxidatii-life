import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Shield, ShieldOff, Trash2, RotateCcw, Eye, EyeOff, Beer } from "lucide-react";

export const Route = createFileRoute("/app/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url, aura, lifetime_sprits, current_streak, is_public, onboarded, rank, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (q.trim()) {
        const term = `%${q.trim()}%`;
        query = query.or(`handle.ilike.${term},display_name.ilike.${term}`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role");
      return data ?? [];
    },
  });

  const isAdminUser = (uid: string) => roles?.some((r) => r.user_id === uid && r.role === "admin");

  const toggleAdmin = async (uid: string) => {
    if (isAdminUser(uid)) {
      await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin");
      toast.success("Rol admin retras");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
      if (error) return toast.error(error.message);
      toast.success("Rol admin acordat");
    }
    qc.invalidateQueries({ queryKey: ["admin-roles"] });
  };

  const deleteProfile = async (uid: string) => {
    if (!confirm("Șterg profilul? Acțiune ireversibilă.")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", uid);
    if (error) return toast.error(error.message);
    toast.success("Profil șters");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const resetAura = async (uid: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ aura: 0, current_streak: 0, lifetime_sprits: 0 })
      .eq("id", uid);
    if (error) return toast.error(error.message);
    toast.success("Aura & streak resetate");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const togglePublic = async (uid: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_public: !current }).eq("id", uid);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Caută după handle sau nume…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-foreground/[0.04] border border-foreground/10 text-sm outline-none focus:border-foreground/30"
        />
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Se încarcă…</div>}

      <div className="space-y-1.5">
        {users?.map((u) => {
          const admin = isAdminUser(u.id);
          return (
            <div key={u.id} className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3 flex items-center gap-3">
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-foreground/10" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-sm truncate">{u.display_name || "—"}</span>
                  {admin && <span className="font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-neon-crimson text-white">Admin</span>}
                  {!u.is_public && <EyeOff size={11} className="text-muted-foreground" />}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground truncate">
                  @{u.handle || "—"} · {u.rank} · aura {u.aura} · {u.lifetime_sprits} sprits · streak {u.current_streak}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <IconBtn title={admin ? "Retrage admin" : "Fă admin"} onClick={() => toggleAdmin(u.id)}>
                  {admin ? <ShieldOff size={13} /> : <Shield size={13} />}
                </IconBtn>
                <IconBtn title={u.is_public ? "Ascunde profil" : "Fă public"} onClick={() => togglePublic(u.id, u.is_public)}>
                  {u.is_public ? <EyeOff size={13} /> : <Eye size={13} />}
                </IconBtn>
                <IconBtn title="Reset aura/streak/sprits" onClick={() => resetAura(u.id)}>
                  <RotateCcw size={13} />
                </IconBtn>
                <IconBtn title="Șterge profil" danger onClick={() => deleteProfile(u.id)}>
                  <Trash2 size={13} />
                </IconBtn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg border transition ${danger ? "border-neon-crimson/30 text-neon-crimson hover:bg-neon-crimson/10" : "border-foreground/15 hover:bg-foreground/10"}`}
    >
      {children}
    </button>
  );
}

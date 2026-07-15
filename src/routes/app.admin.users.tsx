import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import {
  Search,
  Shield,
  ShieldOff,
  Trash2,
  RotateCcw,
  Eye,
  EyeOff,
  Beer,
  Settings2,
  X,
  Crown,
} from "lucide-react";

export const Route = createFileRoute("/app/admin/users")({
  component: AdminUsers,
});

const RANKS = [
  "MDS",
  "CRAI_DE_CARTIER",
  "SPRITARUL",
  "CAMATARU_DE_PAHAR",
  "BOIERUL_NOPTII",
  "REGELE_CENTRULUI",
  "ZEU_BALCANIC",
] as const;
const PREMIUM_TIERS = ["vip", "vip_plus", "pro", "elite"] as const;

type UserRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  aura: number | null;
  lifetime_sprits: number | null;
  current_streak: number | null;
  longest_streak: number | null;
  is_public: boolean | null;
  onboarded: boolean | null;
  rank: string | null;
  premium_tier: string | null;
  premium_until: string | null;
  created_at: string;
};

function AdminUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<UserRow | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      const term = q.trim().toLowerCase();
      const rows = (data ?? []) as UserRow[];
      const filtered = term
        ? rows.filter(
            (r) =>
              (r.handle ?? "").toLowerCase().includes(term) ||
              (r.display_name ?? "").toLowerCase().includes(term),
          )
        : rows;
      return filtered.slice(0, 100);
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role");
      return data ?? [];
    },
  });

  const hasRole = (uid: string, role: "admin" | "moderator") =>
    roles?.some((r) => r.user_id === uid && r.role === role);

  const toggleRole = async (uid: string, role: "admin" | "moderator") => {
    if (hasRole(uid, role)) {
      await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", role);
      toast.success(`${role} retras`);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role });
      if (error) return toast.error(error.message);
      toast.success(`${role} acordat`);
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

  const togglePublic = async (uid: string, current: boolean | null) => {
    const { error } = await supabase.from("profiles").update({ is_public: !current }).eq("id", uid);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const grantCoins = async (uid: string, label: string) => {
    const raw = prompt(
      `Câte coins adaugi lui ${label}? (folosește număr negativ ca să scazi)`,
      "10",
    );
    if (raw === null) return;
    const amount = parseInt(raw, 10);
    if (!Number.isFinite(amount) || amount === 0) return toast.error("Sumă invalidă");
    const { data, error } = await supabase.rpc("admin_grant_coins" as any, {
      _user_id: uid,
      _amount: amount,
    });
    if (error) return toast.error(error.message);
    toast.success(`Balanță nouă: ${data} șprițuri`);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
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
          const admin = hasRole(u.id, "admin");
          const mod = hasRole(u.id, "moderator");
          return (
            <div
              key={u.id}
              className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3 flex items-center gap-3"
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-foreground/10" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-display text-sm truncate">{u.display_name || "—"}</span>
                  {admin && (
                    <span className="font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-neon-crimson text-white">
                      Admin
                    </span>
                  )}
                  {mod && (
                    <span className="font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-neon-purple text-white">
                      Mod
                    </span>
                  )}
                  {u.premium_tier && (
                    <span className="font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500 text-black">
                      {u.premium_tier}
                    </span>
                  )}
                  {!u.is_public && <EyeOff size={11} className="text-muted-foreground" />}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground truncate">
                  @{u.handle || "—"} · {u.rank} · aura {u.aura} · streak {u.current_streak}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <IconBtn title="Editează tot" onClick={() => setEditing(u)}>
                  <Settings2 size={13} />
                </IconBtn>
                <IconBtn
                  title="Adaugă/scade șprițuri"
                  onClick={() => grantCoins(u.id, u.display_name || u.handle || "user")}
                >
                  <Beer size={13} />
                </IconBtn>
                <IconBtn
                  title={admin ? "Retrage admin" : "Fă admin"}
                  onClick={() => toggleRole(u.id, "admin")}
                >
                  {admin ? <ShieldOff size={13} /> : <Shield size={13} />}
                </IconBtn>
                <IconBtn
                  title={u.is_public ? "Ascunde profil" : "Fă public"}
                  onClick={() => togglePublic(u.id, u.is_public)}
                >
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

      {editing && (
        <EditUserSheet
          user={editing}
          isAdmin={!!hasRole(editing.id, "admin")}
          isMod={!!hasRole(editing.id, "moderator")}
          onToggleRole={(role) => toggleRole(editing.id, role)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-users"] });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditUserSheet({
  user,
  isAdmin,
  isMod,
  onToggleRole,
  onClose,
  onSaved,
}: {
  user: UserRow;
  isAdmin: boolean;
  isMod: boolean;
  onToggleRole: (role: "admin" | "moderator") => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rank, setRank] = useState<string>(user.rank ?? "MDS");
  const [aura, setAura] = useState<number>(user.aura ?? 0);
  const [grantCoins, setGrantCoins] = useState<number>(0);
  const [sprits, setSprits] = useState<number>(user.lifetime_sprits ?? 0);
  const [streak, setStreak] = useState<number>(user.current_streak ?? 0);
  const [longest, setLongest] = useState<number>(user.longest_streak ?? 0);
  const [premium, setPremium] = useState<string>(user.premium_tier ?? "");
  const [premiumDays, setPremiumDays] = useState<number>(30);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const patch: Record<string, any> = {
        rank,
        aura,
        lifetime_sprits: sprits,
        current_streak: streak,
        longest_streak: longest,
        premium_tier: premium || null,
      };
      if (premium) {
        const until = new Date();
        until.setDate(until.getDate() + (premiumDays || 30));
        patch.premium_until = until.toISOString();
      } else {
        patch.premium_until = null;
      }
      const { error } = await supabase
        .from("profiles")
        .update(patch as any)
        .eq("id", user.id);
      if (error) throw error;
      if (grantCoins !== 0) {
        const { error: gErr } = await supabase.rpc("admin_grant_coins", {
          _user_id: user.id,
          _amount: grantCoins,
        });
        if (gErr) throw gErr;
      }
      toast.success("Profil actualizat");
      onSaved();
    } catch (e) {
      toast.error(errorMessage(e, "Eroare"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/80 flex items-end sm:items-center justify-center p-2"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-background border border-foreground/10 rounded-2xl p-4 space-y-3 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "85dvh" }}
      >
        <div className="flex items-center justify-between">
          <div className="font-display text-sm">Editează @{user.handle || "—"}</div>
          <button onClick={onClose} className="text-muted-foreground p-1">
            <X size={16} />
          </button>
        </div>

        <Field label="Rank">
          <select value={rank} onChange={(e) => setRank(e.target.value)} className="input">
            {RANKS.map((r) => (
              <option key={r} value={r}>
                {r.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Grant șprițuri (±)">
            <NumInput value={grantCoins} onChange={setGrantCoins} />
          </Field>
          <Field label="Aura">
            <NumInput value={aura} onChange={setAura} />
          </Field>
          <Field label="Lifetime sprits">
            <NumInput value={sprits} onChange={setSprits} />
          </Field>
          <Field label="Current streak">
            <NumInput value={streak} onChange={setStreak} />
          </Field>
          <Field label="Longest streak">
            <NumInput value={longest} onChange={setLongest} />
          </Field>
        </div>

        <Field label="Premium">
          <div className="flex gap-2">
            <select
              value={premium}
              onChange={(e) => setPremium(e.target.value)}
              className="input flex-1"
            >
              <option value="">— niciunul —</option>
              {PREMIUM_TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {premium && (
              <input
                type="number"
                value={premiumDays}
                onChange={(e) => setPremiumDays(parseInt(e.target.value, 10) || 0)}
                className="input w-20"
                placeholder="zile"
              />
            )}
          </div>
          {premium && (
            <div className="text-[10px] text-muted-foreground mt-1">
              Activ {premiumDays} zile de acum
            </div>
          )}
        </Field>

        <Field label="Roluri">
          <div className="flex gap-2 flex-wrap">
            <RoleChip
              active={isAdmin}
              onClick={() => onToggleRole("admin")}
              icon={<Shield size={11} />}
              label="Admin"
            />
            <RoleChip
              active={isMod}
              onClick={() => onToggleRole("moderator")}
              icon={<Crown size={11} />}
              label="Moderator"
            />
          </div>
        </Field>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-foreground/15 text-sm"
          >
            Anulează
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-neon-crimson text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Se salvează…" : "Salvează"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}

function NumInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
      className="input"
    />
  );
}

function RoleChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition ${active ? "bg-neon-crimson text-white border-transparent" : "border-foreground/20 hover:bg-foreground/5"}`}
    >
      {icon}
      {label}
      {active && " ✓"}
    </button>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
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

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Wallet, Trash2, Search } from "lucide-react";

export const Route = createFileRoute("/app/admin/businesses")({
  component: AdminBusinesses,
});

function AdminBusinesses() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-businesses", q],
    queryFn: async () => {
      // Sensitive columns (contact_email, wallet_balance_cents, …) are
      // column-revoked from authenticated; use the admin-only RPC instead.
      const { data, error } = await supabase.rpc("admin_list_businesses");
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const filtered = q.trim()
        ? rows.filter((r) => (r.brand_name ?? "").toLowerCase().includes(q.trim().toLowerCase()))
        : rows;
      return filtered.slice(0, 100);
    },
  });

  const toggleVerify = async (id: string, v: boolean) => {
    const { error } = await supabase
      .from("business_accounts")
      .update({ verified: !v })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(!v ? "Verificat" : "Verificare retrasă");
    qc.invalidateQueries({ queryKey: ["admin-businesses"] });
  };

  const adjustWallet = async (id: string, currentCents: number) => {
    const input = prompt("Ajustare wallet în RON (poate fi negativ):", "100");
    if (input == null) return;
    const ron = parseFloat(input);
    if (isNaN(ron)) return toast.error("Sumă invalidă");
    const delta = Math.round(ron * 100);
    const { error: e1 } = await supabase
      .from("business_accounts")
      .update({ wallet_balance_cents: currentCents + delta })
      .eq("id", id);
    if (e1) return toast.error(e1.message);
    await supabase.from("wallet_ledger").insert({
      business_id: id,
      kind: "adjustment",
      amount_cents: delta,
      note: "Ajustare admin",
    });
    toast.success(`Wallet ${delta > 0 ? "+" : ""}${ron} RON`);
    qc.invalidateQueries({ queryKey: ["admin-businesses"] });
  };

  const del = async (id: string) => {
    if (!confirm("Șterg business-ul? Toate campaniile rămân orfane.")) return;
    const { error } = await supabase.from("business_accounts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Șters");
    qc.invalidateQueries({ queryKey: ["admin-businesses"] });
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
          placeholder="Caută brand…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-foreground/[0.04] border border-foreground/10 text-sm outline-none"
        />
      </div>

      <div className="space-y-1.5">
        {data?.map((b) => (
          <div
            key={b.id}
            className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3 flex items-center gap-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-sm truncate">{b.brand_name}</span>
                {b.verified && <CheckCircle2 size={12} className="text-neon-mint" />}
                <span className="font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-foreground/10">
                  {b.type}
                </span>
                <span className="font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-foreground/10">
                  {b.tier}
                </span>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground truncate">
                {b.contact_email ?? "—"} · wallet {(b.wallet_balance_cents / 100).toFixed(2)} RON ·
                credit lunar {(b.monthly_credits_cents / 100).toFixed(0)} RON
              </div>
            </div>
            <button
              onClick={() => toggleVerify(b.id, b.verified)}
              title={b.verified ? "Retrage verificare" : "Verifică"}
              className="p-2 rounded-lg border border-foreground/15 hover:bg-foreground/10"
            >
              {b.verified ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
            </button>
            <button
              onClick={() => adjustWallet(b.id, b.wallet_balance_cents)}
              title="Ajustează wallet"
              className="p-2 rounded-lg border border-foreground/15 hover:bg-foreground/10"
            >
              <Wallet size={13} />
            </button>
            <button
              onClick={() => del(b.id)}
              title="Șterge"
              className="p-2 rounded-lg border border-neon-crimson/30 text-neon-crimson hover:bg-neon-crimson/10"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

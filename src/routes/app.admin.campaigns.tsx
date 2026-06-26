import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Play, Pause, Trash2, Eye, MousePointerClick } from "lucide-react";

export const Route = createFileRoute("/app/admin/campaigns")({
  component: AdminCampaigns,
});

function AdminCampaigns() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const { data } = await supabase
        .from("campaigns")
        .select(
          "id, title, status, kind, bid_cents, budget_cents, spent_cents, impressions, clicks, starts_at, ends_at, business_accounts:business_id(brand_name)",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const setStatus = async (id: string, status: "active" | "paused" | "ended" | "draft") => {
    const { error } = await supabase.from("campaigns").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status actualizat");
    qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
  };

  const del = async (id: string) => {
    if (!confirm("Șterg campania? Acțiune ireversibilă.")) return;
    const { data: deleted, error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) return toast.error(error.message);
    if (!deleted || deleted.length === 0) {
      return toast.error("Nu ai permisiune să ștergi (doar admin total poate șterge campanii).");
    }
    toast.success("Campanie ștearsă");
    qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
  };

  return (
    <div className="space-y-1.5">
      {data?.map((c: any) => (
        <div
          key={c.id}
          className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3 flex items-center gap-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-display text-sm truncate">{c.title}</span>
              <span
                className={`font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded ${
                  c.status === "active"
                    ? "bg-neon-mint/20 text-neon-mint"
                    : c.status === "paused"
                      ? "bg-amber-500/20 text-amber-500"
                      : "bg-foreground/10"
                }`}
              >
                {c.status}
              </span>
              <span className="font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-foreground/10">
                {c.kind}
              </span>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground truncate flex items-center gap-2 mt-0.5">
              <span>{c.business_accounts?.brand_name ?? "—"}</span>
              <span>
                · bid {(c.bid_cents / 100).toFixed(2)} / cheltuit {(c.spent_cents / 100).toFixed(2)}{" "}
                / {c.budget_cents ? (c.budget_cents / 100).toFixed(0) + " RON" : "fără cap"}
              </span>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye size={10} /> {c.impressions}
              </span>
              <span className="flex items-center gap-1">
                <MousePointerClick size={10} /> {c.clicks}
              </span>
            </div>
          </div>
          {c.status === "active" ? (
            <button
              onClick={() => setStatus(c.id, "paused")}
              title="Pauză"
              className="p-2 rounded-lg border border-foreground/15 hover:bg-foreground/10"
            >
              <Pause size={13} />
            </button>
          ) : (
            <button
              onClick={() => setStatus(c.id, "active")}
              title="Activează"
              className="p-2 rounded-lg border border-foreground/15 hover:bg-foreground/10"
            >
              <Play size={13} />
            </button>
          )}
          <button
            onClick={() => del(c.id)}
            title="Șterge"
            className="p-2 rounded-lg border border-neon-crimson/30 text-neon-crimson hover:bg-neon-crimson/10"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

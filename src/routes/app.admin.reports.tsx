import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/admin/reports")({
  component: AdminReports,
});

function AdminReports() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reports")
        .select("id, target_type, target_id, reason, details, status, created_at, resolution_note, reporter:reporter_id(handle, display_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const resolve = async (id: string, status: "resolved" | "dismissed") => {
    const note = prompt("Notă (opțional):") ?? "";
    const { error } = await supabase
      .from("reports")
      .update({ status, resolution_note: note, resolved_by: user?.id, resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Actualizat");
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  };

  const del = async (id: string) => {
    if (!confirm("Șterg raportul?")) return;
    await supabase.from("reports").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  };

  return (
    <div className="space-y-1.5">
      {data?.length === 0 && <div className="text-sm text-muted-foreground p-4 text-center">Niciun raport.</div>}
      {data?.map((r: any) => (
        <div key={r.id} className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3 flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-foreground/10">{r.target_type}</span>
              <span className={`font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded ${
                r.status === "pending" ? "bg-neon-crimson/20 text-neon-crimson" :
                r.status === "resolved" ? "bg-neon-mint/20 text-neon-mint" :
                "bg-foreground/10"
              }`}>{r.status}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                @{r.reporter?.handle ?? "?"} · {new Date(r.created_at).toLocaleString("ro-RO")}
              </span>
            </div>
            <div className="font-display text-sm">{r.reason}</div>
            {r.details && <p className="text-xs text-foreground/80">{r.details}</p>}
            <div className="font-mono text-[9px] text-muted-foreground">ID țintă: {r.target_id}</div>
            {r.resolution_note && <div className="font-mono text-[10px] text-muted-foreground">Notă: {r.resolution_note}</div>}
          </div>
          {r.status === "pending" && (
            <>
              <button onClick={() => resolve(r.id, "resolved")} title="Rezolvat" className="p-2 rounded-lg border border-neon-mint/30 text-neon-mint hover:bg-neon-mint/10">
                <Check size={13} />
              </button>
              <button onClick={() => resolve(r.id, "dismissed")} title="Respinge" className="p-2 rounded-lg border border-foreground/15 hover:bg-foreground/10">
                <X size={13} />
              </button>
            </>
          )}
          <button onClick={() => del(r.id)} title="Șterge" className="p-2 rounded-lg border border-neon-crimson/30 text-neon-crimson hover:bg-neon-crimson/10">
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

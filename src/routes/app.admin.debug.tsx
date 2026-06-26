import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Bug, Check, Trash2, Copy, Activity } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/admin/debug")({
  component: AdminDebug,
});

function AdminDebug() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [ping, setPing] = useState<string | null>(null);

  const { data: reports } = useQuery({
    queryKey: ["admin-bug-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reports")
        .select(
          "id, reason, details, status, created_at, resolution_note, reporter:reporter_id(handle, display_name)",
        )
        .eq("target_type", "bug_report")
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const resolve = async (id: string, status: "resolved" | "dismissed") => {
    const note = prompt("Notă (opțional):") ?? "";
    const { error } = await supabase
      .from("reports")
      .update({
        status,
        resolution_note: note,
        resolved_by: user?.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-bug-reports"] });
  };

  const del = async (id: string) => {
    if (!confirm("Șterg raportul?")) return;
    await supabase.from("reports").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-bug-reports"] });
  };

  const runPing = async () => {
    setPing("…");
    const t0 = performance.now();
    const { error } = await supabase.from("profiles").select("id", { count: "exact", head: true });
    const dt = Math.round(performance.now() - t0);
    setPing(error ? `eroare: ${error.message}` : `OK · ${dt} ms`);
  };

  const env = {
    url: typeof window !== "undefined" ? window.location.origin : "",
    ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
    viewport: typeof window !== "undefined" ? `${window.innerWidth}×${window.innerHeight}` : "",
    online: typeof navigator !== "undefined" ? (navigator.onLine ? "da" : "nu") : "",
    user: user?.email ?? user?.id ?? "—",
  };

  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    toast.success("Copiat");
  };

  return (
    <div className="space-y-4">
      {/* Health */}
      <div className="rounded-2xl border border-foreground/10 p-4 space-y-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
          <Activity size={11} /> Health
        </div>
        <button
          onClick={runPing}
          className="font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-md border border-foreground/15 hover:bg-foreground/10"
        >
          Ping backend
        </button>
        {ping && <div className="font-mono text-[11px]">{ping}</div>}
      </div>

      {/* Env */}
      <div className="rounded-2xl border border-foreground/10 p-4 space-y-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Sesiune curentă
        </div>
        {Object.entries(env).map(([k, v]) => (
          <div key={k} className="flex items-start gap-2 text-[11px] font-mono">
            <span className="text-muted-foreground w-20 shrink-0 uppercase">{k}</span>
            <span className="flex-1 break-all">{v}</span>
            <button onClick={() => copy(String(v))} className="opacity-60 hover:opacity-100">
              <Copy size={11} />
            </button>
          </div>
        ))}
      </div>

      {/* Bug reports */}
      <div className="space-y-2">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Bug size={11} /> Rapoarte de la useri ({reports?.length ?? 0})
        </div>
        {reports?.length === 0 && (
          <div className="text-sm text-muted-foreground p-4 text-center border border-dashed border-foreground/15 rounded-xl">
            Niciun bug raportat. 🎉
          </div>
        )}
        {reports?.map((r: any) => (
          <div
            key={r.id}
            className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3 space-y-2"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded ${
                  r.status === "pending"
                    ? "bg-neon-crimson/20 text-neon-crimson"
                    : r.status === "resolved"
                      ? "bg-neon-mint/20 text-neon-mint"
                      : "bg-foreground/10"
                }`}
              >
                {r.status}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                @{r.reporter?.handle ?? "?"} · {new Date(r.created_at).toLocaleString("ro-RO")}
              </span>
              <div className="ml-auto flex gap-1">
                {r.status === "pending" && (
                  <>
                    <button
                      onClick={() => resolve(r.id, "resolved")}
                      title="Rezolvat"
                      className="p-1.5 rounded-md border border-neon-mint/30 text-neon-mint hover:bg-neon-mint/10"
                    >
                      <Check size={11} />
                    </button>
                    <button
                      onClick={() => resolve(r.id, "dismissed")}
                      title="Respinge"
                      className="p-1.5 rounded-md border border-foreground/15 hover:bg-foreground/10"
                    >
                      ✕
                    </button>
                  </>
                )}
                <button
                  onClick={() => del(r.id)}
                  title="Șterge"
                  className="p-1.5 rounded-md border border-neon-crimson/30 text-neon-crimson hover:bg-neon-crimson/10"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
            <div className="font-display text-sm">{r.reason}</div>
            {r.details && (
              <pre className="font-mono text-[10px] bg-foreground/5 rounded-md p-2 whitespace-pre-wrap break-all max-h-48 overflow-auto">
                {r.details}
              </pre>
            )}
            {r.resolution_note && (
              <div className="font-mono text-[10px] text-muted-foreground">
                Notă: {r.resolution_note}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

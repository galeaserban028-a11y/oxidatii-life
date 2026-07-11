import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, Trash2, Bug, LifeBuoy, Mail, Flag, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/admin/reports")({
  component: AdminReports,
});

const TYPE_META: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  support_feedback: { label: "Suport & feedback", icon: LifeBuoy, color: "text-neon-mint" },
  contact_team: { label: "Contact echipă", icon: Mail, color: "text-neon-cyan" },
  bug_report: { label: "Bug", icon: Bug, color: "text-neon-crimson" },
};


type ReporterProfile = { handle: string | null; display_name: string | null };
type ReportRow = {
  id: string;
  target_type: string;
  target_id: string | null;
  reason: string | null;
  details: string | null;
  status: string;
  created_at: string;
  resolution_note: string | null;
  reporter_id: string | null;
};
type ReportItem = ReportRow & { reporter: ReporterProfile | null };

function AdminReports() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState<
    "all" | "support_feedback" | "contact_team" | "bug_report" | "other"
  >("all");

  const { data } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("reports")
        .select(
          "id, target_type, target_id, reason, details, status, created_at, resolution_note, reporter_id",
        )
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) {
        toast.error(error.message);
        return [];
      }
      const ids = Array.from(
        new Set(
          (rows ?? [])
            .map((r: ReportRow) => r.reporter_id)
            .filter((x): x is string => !!x),
        ),
      );
      let profMap: Record<string, { handle: string | null; display_name: string | null }> = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, handle, display_name")
          .in("id", ids);
        profMap = Object.fromEntries((profs ?? []).map((p: { id: string } & ReporterProfile) => [p.id, p]));
      }
      return (rows ?? []).map((r: ReportRow) => ({ ...r, reporter: (r.reporter_id ? profMap[r.reporter_id] : null) ?? null }) as ReportItem);
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
    toast.success("Actualizat");
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  };

  const del = async (id: string) => {
    if (!confirm("Șterg raportul?")) return;
    await supabase.from("reports").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  };

  const counts = (data ?? []).reduce((acc: Record<string, number>, r: ReportItem) => {
    acc.all = (acc.all ?? 0) + 1;
    const key = TYPE_META[r.target_type] ? r.target_type : "other";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = (data ?? []).filter((r: ReportItem) => {
    if (filter === "all") return true;
    if (filter === "other") return !TYPE_META[r.target_type];
    return r.target_type === filter;
  });

  const tabs: { key: typeof filter; label: string; icon: LucideIcon }[] = [
    { key: "all", label: "Toate", icon: Flag },
    { key: "support_feedback", label: "Suport", icon: LifeBuoy },
    { key: "contact_team", label: "Contact", icon: Mail },
    { key: "bug_report", label: "Bug-uri", icon: Bug },
    { key: "other", label: "Flag-uri", icon: Flag },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = filter === t.key;
          const c = counts[t.key] ?? 0;
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap font-mono text-[10px] uppercase tracking-widest border shrink-0 transition ${
                active
                  ? "bg-foreground text-background border-foreground"
                  : "bg-foreground/[0.04] border-foreground/15 hover:bg-foreground/10"
              }`}
            >
              <Icon size={12} /> {t.label} <span className="opacity-60">{c}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground p-4 text-center">Niciun raport.</div>
        )}
        {filtered.map((r: ReportItem) => {
          const meta = TYPE_META[r.target_type];
          const Icon = meta?.icon ?? Flag;
          return (
            <div
              key={r.id}
              className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3 flex items-start gap-3"
            >
              <div
                className={`h-8 w-8 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0 ${meta?.color ?? "text-muted-foreground"}`}
              >
                <Icon size={15} />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-foreground/10">
                    {meta?.label ?? r.target_type}
                  </span>
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
                </div>
                <div className="font-display text-sm">{r.reason}</div>
                {r.details && (
                  <p className="text-xs text-foreground/80 whitespace-pre-wrap">{r.details}</p>
                )}
                {!meta && (
                  <div className="font-mono text-[9px] text-muted-foreground">
                    ID țintă: {r.target_id}
                  </div>
                )}
                {r.resolution_note && (
                  <div className="font-mono text-[10px] text-muted-foreground">
                    Notă: {r.resolution_note}
                  </div>
                )}
              </div>
              {r.status === "pending" && (
                <>
                  <button
                    onClick={() => resolve(r.id, "resolved")}
                    title="Rezolvat"
                    className="p-2 rounded-lg border border-neon-mint/30 text-neon-mint hover:bg-neon-mint/10"
                  >
                    <Check size={13} />
                  </button>
                  <button
                    onClick={() => resolve(r.id, "dismissed")}
                    title="Respinge"
                    className="p-2 rounded-lg border border-foreground/15 hover:bg-foreground/10"
                  >
                    <X size={13} />
                  </button>
                </>
              )}
              <button
                onClick={() => del(r.id)}
                title="Șterge"
                className="p-2 rounded-lg border border-neon-crimson/30 text-neon-crimson hover:bg-neon-crimson/10"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

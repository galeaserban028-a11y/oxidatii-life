import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, PartyPopper, MapPin, Flame, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/app/admin/content")({
  component: AdminContent,
});

type Tab = "parties" | "checkins" | "proofs" | "photos";

type PartyRow = {
  id: string;
  title: string;
  location_text: string | null;
  vibe: string | null;
  starts_at: string;
  expires_at: string;
  host_id: string;
  profiles?: { handle?: string | null; display_name?: string | null } | null;
};
type CheckinRow = {
  id: string;
  created_at: string;
  expires_at: string;
  user_id: string;
  venues?: { name?: string | null } | null;
  profiles?: { handle?: string | null } | null;
};
type ProofRow = {
  id: string;
  photo_url: string | null;
  created_at: string;
  ai_verified: boolean | null;
  ai_confidence: number | null;
  ai_reason: string | null;
  profiles?: { handle?: string | null } | null;
  venues?: { name?: string | null } | null;
};
type PhotoRow = {
  id: string;
  photo_url: string | null;
  caption: string | null;
  taken_at: string | null;
  profiles?: { handle?: string | null } | null;
  venues?: { name?: string | null } | null;
};

function AdminContent() {
  const [tab, setTab] = useState<Tab>("parties");
  const qc = useQueryClient();

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-content", tab] });

  const del = async (
    table: "parties" | "check_ins" | "sprit_proofs" | "venue_photos",
    id: string,
  ) => {
    if (!confirm("Șterg conținutul?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Șters");
    refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {(
          [
            ["parties", "Petreceri", PartyPopper],
            ["checkins", "Check-ins", MapPin],
            ["proofs", "Sprits", Flame],
            ["photos", "Poze", ImageIcon],
          ] as const
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-widest border ${
              tab === k
                ? "bg-foreground text-background border-foreground"
                : "border-foreground/15 hover:bg-foreground/10"
            }`}
          >
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>

      {tab === "parties" && <PartiesList onDelete={(id) => del("parties", id)} />}
      {tab === "checkins" && <CheckinsList onDelete={(id) => del("check_ins", id)} />}
      {tab === "proofs" && <ProofsList onDelete={(id) => del("sprit_proofs", id)} />}
      {tab === "photos" && <PhotosList onDelete={(id) => del("venue_photos", id)} />}
    </div>
  );
}

function Row({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  return (
    <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">{children}</div>
      <button
        onClick={onDelete}
        className="p-2 rounded-lg border border-neon-crimson/30 text-neon-crimson hover:bg-neon-crimson/10"
        title="Șterge"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function PartiesList({ onDelete }: { onDelete: (id: string) => void }) {
  const { data } = useQuery({
    queryKey: ["admin-content", "parties"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parties")
        .select(
          "id, title, location_text, vibe, starts_at, expires_at, host_id, profiles:host_id(handle, display_name)",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });
  return (
    <div className="space-y-1.5">
      {data?.map((p: PartyRow) => (
        <Row key={p.id} onDelete={() => onDelete(p.id)}>
          <div className="font-display text-sm truncate">{p.title}</div>
          <div className="font-mono text-[10px] text-muted-foreground truncate">
            de @{p.profiles?.handle ?? "?"} · {p.location_text} · {p.vibe ?? "—"} ·{" "}
            {new Date(p.starts_at).toLocaleString("ro-RO")}
          </div>
        </Row>
      ))}
    </div>
  );
}

function CheckinsList({ onDelete }: { onDelete: (id: string) => void }) {
  const { data } = useQuery({
    queryKey: ["admin-content", "checkins"],
    queryFn: async () => {
      const { data } = await supabase
        .from("check_ins")
        .select(
          "id, created_at, expires_at, user_id, venues:venue_id(name), profiles:user_id(handle)",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });
  return (
    <div className="space-y-1.5">
      {data?.map((c: any) => (
        <Row key={c.id} onDelete={() => onDelete(c.id)}>
          <div className="font-display text-sm truncate">
            @{c.profiles?.handle ?? "?"} la {c.venues?.name ?? "—"}
          </div>
          <div className="font-mono text-[10px] text-muted-foreground">
            {new Date(c.created_at).toLocaleString("ro-RO")} · expiră{" "}
            {new Date(c.expires_at).toLocaleTimeString("ro-RO")}
          </div>
        </Row>
      ))}
    </div>
  );
}

function ProofsList({ onDelete }: { onDelete: (id: string) => void }) {
  const { data } = useQuery({
    queryKey: ["admin-content", "proofs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sprit_proofs")
        .select(
          "id, photo_url, created_at, ai_verified, ai_confidence, ai_reason, profiles:user_id(handle), venues:venue_id(name)",
        )
        .order("created_at", { ascending: false })
        .limit(60);
      return data ?? [];
    },
  });
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {data?.map((p: PartyRow) => (
        <div
          key={p.id}
          className="rounded-xl border border-foreground/10 bg-foreground/[0.03] overflow-hidden"
        >
          {p.photo_url && (
            <img src={p.photo_url} alt="" className="w-full aspect-square object-cover" />
          )}
          <div className="p-2 space-y-1">
            <div className="font-mono text-[10px] truncate">
              @{p.profiles?.handle ?? "?"} · {p.venues?.name ?? "—"}
            </div>
            <div className="font-mono text-[9px] text-muted-foreground">
              {p.ai_verified ? "✓ AI" : "✗"}{" "}
              {p.ai_confidence ? `(${Math.round(p.ai_confidence * 100)}%)` : ""}
            </div>
            <button
              onClick={() => onDelete(p.id)}
              className="w-full mt-1 text-[10px] font-mono uppercase tracking-widest px-2 py-1.5 rounded border border-neon-crimson/30 text-neon-crimson"
            >
              Șterge
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PhotosList({ onDelete }: { onDelete: (id: string) => void }) {
  const { data } = useQuery({
    queryKey: ["admin-content", "photos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("venue_photos")
        .select("id, photo_url, caption, taken_at, profiles:user_id(handle), venues:venue_id(name)")
        .order("created_at", { ascending: false })
        .limit(60);
      return data ?? [];
    },
  });
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {data?.map((p: PartyRow) => (
        <div
          key={p.id}
          className="rounded-xl border border-foreground/10 bg-foreground/[0.03] overflow-hidden"
        >
          {p.photo_url && (
            <img src={p.photo_url} alt="" className="w-full aspect-square object-cover" />
          )}
          <div className="p-2 space-y-1">
            <div className="font-mono text-[10px] truncate">
              @{p.profiles?.handle ?? "?"} · {p.venues?.name ?? "—"}
            </div>
            {p.caption && (
              <div className="font-mono text-[9px] text-muted-foreground line-clamp-2">
                {p.caption}
              </div>
            )}
            <button
              onClick={() => onDelete(p.id)}
              className="w-full mt-1 text-[10px] font-mono uppercase tracking-widest px-2 py-1.5 rounded border border-neon-crimson/30 text-neon-crimson"
            >
              Șterge
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

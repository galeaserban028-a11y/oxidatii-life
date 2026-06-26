import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Ghost,
  Eye,
  Crosshair,
  MapPin,
  EyeOff,
  Shuffle,
  Users,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type MapSettings = {
  map_ghost: boolean;
  map_visibility: "friends" | "close" | "nobody";
  map_precision: "exact" | "approx" | "city";
  map_auto_ghost_hours: number;
  map_hide_from_live_list: boolean;
  map_require_reciprocity: boolean;
};

const DEFAULTS: MapSettings = {
  map_ghost: false,
  map_visibility: "friends",
  map_precision: "exact",
  map_auto_ghost_hours: 8,
  map_hide_from_live_list: false,
  map_require_reciprocity: false,
};

export function MapSettingsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const settingsQ = useQuery({
    queryKey: ["map-settings", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const [stateRes, extrasRes] = await Promise.all([
        supabase.rpc("get_my_account_state"),
        supabase
          .from("profiles")
          .select("map_auto_ghost_hours, map_hide_from_live_list, map_require_reciprocity")
          .eq("id", user!.id)
          .maybeSingle(),
      ]);
      const stateRow = Array.isArray(stateRes.data) ? (stateRes.data[0] as any) : null;
      const merged = { ...DEFAULTS, ...(extrasRes.data ?? {}), ...(stateRow ?? {}) };
      return merged as MapSettings;
    },
  });

  const privateQ = useQuery({
    queryKey: ["private-locations", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("private_locations")
        .select("id, label, lat, lng, radius_m")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [local, setLocal] = useState<MapSettings>(DEFAULTS);
  useEffect(() => {
    if (settingsQ.data) setLocal(settingsQ.data);
  }, [settingsQ.data]);

  const save = useMutation({
    mutationFn: async (patch: Partial<MapSettings>) => {
      if (!user) return;
      const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["map-settings", user?.id] });
      qc.invalidateQueries({ queryKey: ["map-privacy", user?.id] });
      qc.invalidateQueries({ queryKey: ["friend-pins"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Nu am putut salva"),
  });

  const update = <K extends keyof MapSettings>(key: K, value: MapSettings[K]) => {
    setLocal((s) => ({ ...s, [key]: value }));
    save.mutate({ [key]: value } as Partial<MapSettings>);
  };

  // Ghost on → also wipe current pin so you disappear immediately.
  useEffect(() => {
    if (!user || !open) return;
    if (local.map_ghost || local.map_visibility === "nobody") {
      supabase
        .from("live_locations")
        .delete()
        .eq("user_id", user.id)
        .then(() => {
          qc.invalidateQueries({ queryKey: ["friend-pins"] });
        });
    }
  }, [local.map_ghost, local.map_visibility, user, open, qc]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto rounded-t-3xl border-t border-foreground/10"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-2xl lowercase tracking-tight">
            setări hartă
          </SheetTitle>
          <SheetDescription className="text-xs">
            cine te vede, cu ce precizie, și unde ești invizibil.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4 pb-8">
          {/* Ghost mode */}
          <Row
            icon={
              <Ghost size={18} className={local.map_ghost ? "text-fuchsia-400" : "text-zinc-400"} />
            }
            title="Ghost mode"
            subtitle={local.map_ghost ? "ești invizibil pe hartă" : "apari normal pentru prieteni"}
            right={
              <Switch checked={local.map_ghost} onCheckedChange={(v) => update("map_ghost", v)} />
            }
          />

          {/* Visibility */}
          <Section title="Cine te vede live" icon={<Eye size={14} />}>
            <Segment
              value={local.map_visibility}
              options={[
                { value: "friends", label: "Toți prietenii" },
                { value: "close", label: "Doar close friends" },
                { value: "nobody", label: "Nimeni" },
              ]}
              onChange={(v) => update("map_visibility", v as MapSettings["map_visibility"])}
            />
            {local.map_visibility === "close" && <CloseFriendsList />}
          </Section>

          {/* Precision */}
          <Section title="Precizie pin" icon={<Crosshair size={14} />}>
            <Segment
              value={local.map_precision}
              options={[
                { value: "exact", label: "Exact" },
                { value: "approx", label: "~200m" },
                { value: "city", label: "Doar oraș" },
              ]}
              onChange={(v) => update("map_precision", v as MapSettings["map_precision"])}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              {local.map_precision === "exact" && "pinul tău e exact unde ești."}
              {local.map_precision === "approx" &&
                "pinul e mutat random până la ~200m. Vede zona, nu adresa."}
              {local.map_precision === "city" &&
                "pinul stă pe centrul orașului. Doar 'sunt aici, prin oraș'."}
            </p>
          </Section>

          {/* Private locations */}
          <Section title="Locații private" icon={<MapPin size={14} />}>
            <p className="text-[11px] text-muted-foreground mb-2">
              acasă, job, sala. Cât timp GPS-ul te plasează aici, pin-ul tău NU se publică.
            </p>
            <PrivateLocations
              items={privateQ.data ?? []}
              onChange={() => qc.invalidateQueries({ queryKey: ["private-locations", user?.id] })}
            />
          </Section>

          {/* Hide from live list */}
          <Row
            icon={<EyeOff size={18} className="text-zinc-400" />}
            title="Apar în lista 'live'"
            subtitle="dezactivează ca să nu mai apari la oxidați activi"
            right={
              <Switch
                checked={!local.map_hide_from_live_list}
                onCheckedChange={(v) => update("map_hide_from_live_list", !v)}
              />
            }
          />

          {/* Reciprocity */}
          <Row
            icon={<Shuffle size={18} className="text-zinc-400" />}
            title="Reciprocitate"
            subtitle="văd doar prietenii care mă văd și pe mine"
            right={
              <Switch
                checked={local.map_require_reciprocity}
                onCheckedChange={(v) => update("map_require_reciprocity", v)}
              />
            }
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({
  icon,
  title,
  subtitle,
  right,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  right: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-card/60 px-4 py-3">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-display text-sm">{title}</div>
        {subtitle && <div className="text-[11px] text-muted-foreground">{subtitle}</div>}
      </div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-card/60 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function Segment({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-full bg-background/60 p-1 border border-foreground/10">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`flex-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition ${active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function CloseFriendsList() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const friendsQ = useQuery({
    queryKey: ["friends-for-close", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: fs } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
        .eq("status", "accepted");
      const ids = (fs ?? []).map((f: any) =>
        f.requester_id === user!.id ? f.addressee_id : f.requester_id,
      );
      if (ids.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, handle, avatar_url")
        .in("id", ids);
      return profs ?? [];
    },
  });

  const closeQ = useQuery({
    queryKey: ["close-friends", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("close_friends")
        .select("friend_id")
        .eq("user_id", user!.id);
      return new Set((data ?? []).map((c: any) => c.friend_id as string));
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ friendId, on }: { friendId: string; on: boolean }) => {
      if (!user) return;
      if (on) {
        await supabase.from("close_friends").insert({ user_id: user.id, friend_id: friendId });
      } else {
        await supabase
          .from("close_friends")
          .delete()
          .eq("user_id", user.id)
          .eq("friend_id", friendId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["close-friends", user?.id] });
      qc.invalidateQueries({ queryKey: ["friend-pins"] });
    },
  });

  const friends = friendsQ.data ?? [];
  const closeSet = closeQ.data ?? new Set<string>();

  if (friends.length === 0) {
    return (
      <div className="mt-3 text-[11px] text-muted-foreground">Nu ai încă prieteni acceptați.</div>
    );
  }

  return (
    <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Users size={11} /> close friends
      </div>
      {friends.map((f: any) => {
        const on = closeSet.has(f.id);
        return (
          <button
            key={f.id}
            onClick={() => toggle.mutate({ friendId: f.id, on: !on })}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border transition text-left ${on ? "border-fuchsia-500/50 bg-fuchsia-500/10" : "border-foreground/5 hover:bg-foreground/5"}`}
          >
            {f.avatar_url ? (
              <img src={f.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div className="h-7 w-7 rounded-full bg-foreground/10" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs truncate">{f.display_name ?? f.handle ?? "—"}</div>
              {f.handle && (
                <div className="text-[10px] text-muted-foreground truncate">@{f.handle}</div>
              )}
            </div>
            <div
              className={`text-[10px] font-mono uppercase ${on ? "text-fuchsia-300" : "text-muted-foreground"}`}
            >
              {on ? "close" : "+"}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function PrivateLocations({ items, onChange }: { items: any[]; onChange: () => void }) {
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const addHere = async () => {
    if (!user || !label.trim()) return;
    if (!navigator.geolocation) {
      toast.error("GPS indisponibil");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { error } = await supabase.from("private_locations").insert({
          user_id: user.id,
          label: label.trim(),
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setBusy(false);
        if (error) {
          toast.error(error.message);
          return;
        }
        setLabel("");
        setAdding(false);
        onChange();
        toast.success("Locație privată salvată.");
      },
      () => {
        setBusy(false);
        toast.error("Nu am putut citi locația.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const remove = async (id: string) => {
    await supabase.from("private_locations").delete().eq("id", id);
    onChange();
  };

  return (
    <div className="space-y-2">
      {items.length === 0 && !adding && (
        <div className="text-[11px] text-muted-foreground">nimic încă.</div>
      )}
      {items.map((p) => (
        <div
          key={p.id}
          className="flex items-center gap-2 rounded-lg border border-foreground/10 bg-background/40 px-3 py-2"
        >
          <MapPin size={12} className="text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <div className="text-xs truncate">{p.label}</div>
            <div className="text-[10px] text-muted-foreground">~{p.radius_m}m</div>
          </div>
          <button
            onClick={() => remove(p.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {adding ? (
        <div className="space-y-2 rounded-lg border border-foreground/10 bg-background/40 p-3">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ex: acasă, job, sala"
            maxLength={40}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={addHere}
              disabled={busy || !label.trim()}
              className="flex-1"
            >
              {busy ? "..." : "Salvează (folosește locația actuală)"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setAdding(false);
                setLabel("");
              }}
            >
              <X size={14} />
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)} className="w-full">
          <Plus size={12} className="mr-1" /> Adaugă locație privată
        </Button>
      )}
    </div>
  );
}

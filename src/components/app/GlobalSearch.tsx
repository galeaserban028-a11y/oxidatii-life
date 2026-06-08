import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, User, MapPin, PartyPopper, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

type Result = {
  profiles: Array<{ id: string; handle: string | null; display_name: string | null; avatar_url: string | null }>;
  venues: Array<{ id: string; name: string; slug: string | null }>;
  parties: Array<{ id: string; title: string }>;
};

const empty: Result = { profiles: [], venues: [], parties: [] };

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Result>(empty);
  const nav = useNavigate();

  // Cmd+K / Ctrl+K toggles
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) { setRes(empty); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const like = `%${term}%`;
      const [p, v, pa] = await Promise.all([
        supabase.from("profiles")
          .select("id, handle, display_name, avatar_url")
          .or(`handle.ilike.${like},display_name.ilike.${like}`)
          .limit(6),
        supabase.from("venues")
          .select("id, name, slug")
          .ilike("name", like)
          .limit(6),
        supabase.from("parties")
          .select("id, title")
          .ilike("title", like)
          .gt("expires_at", new Date().toISOString())
          .limit(6),
      ]);
      if (cancelled) return;
      setRes({
        profiles: (p.data as Result["profiles"]) ?? [],
        venues: (v.data as Result["venues"]) ?? [],
        parties: (pa.data as Result["parties"]) ?? [],
      });
      setLoading(false);
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, open]);

  const go = (path: string) => {
    setOpen(false);
    nav({ to: path as never });
  };

  const total = res.profiles.length + res.venues.length + res.parties.length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-foreground/5 active:scale-95 transition"
        aria-label="Caută"
        title="Caută (⌘K)"
      >
        <Search size={18} className="text-foreground" />
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Caută oameni, localuri, faze…"
          value={q}
          onValueChange={setQ}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
            </div>
          )}
          {!loading && q.trim().length < 2 && (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Scrie cel puțin 2 caractere
            </div>
          )}
          {!loading && q.trim().length >= 2 && total === 0 && (
            <CommandEmpty>Nu am găsit nimic.</CommandEmpty>
          )}
          {res.profiles.length > 0 && (
            <CommandGroup heading="Oameni">
              {res.profiles.map((p) => (
                <CommandItem key={p.id} value={`u-${p.id}-${p.handle ?? ""}`} onSelect={() => go(`/app/user/${p.id}`)}>
                  <User size={14} className="mr-2 opacity-70" />
                  <span className="truncate">{p.display_name || p.handle || "Profil"}</span>
                  {p.handle && <span className="ml-2 text-xs text-muted-foreground">@{p.handle}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {res.venues.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Localuri">
                {res.venues.map((v) => (
                  <CommandItem key={v.id} value={`v-${v.id}`} onSelect={() => go(`/app/discover?venue=${v.id}`)}>
                    <MapPin size={14} className="mr-2 opacity-70" />
                    <span className="truncate">{v.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          {res.parties.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Faze active">
                {res.parties.map((pa) => (
                  <CommandItem key={pa.id} value={`p-${pa.id}`} onSelect={() => go(`/app/promo/${pa.id}`)}>
                    <PartyPopper size={14} className="mr-2 opacity-70" />
                    <span className="truncate">{pa.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}

import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, User, MapPin, PartyPopper, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CommandDialog = lazy(() => import("@/components/ui/command").then((m) => ({ default: m.CommandDialog })));
const CommandEmpty = lazy(() => import("@/components/ui/command").then((m) => ({ default: m.CommandEmpty })));
const CommandGroup = lazy(() => import("@/components/ui/command").then((m) => ({ default: m.CommandGroup })));
const CommandInput = lazy(() => import("@/components/ui/command").then((m) => ({ default: m.CommandInput })));
const CommandItem = lazy(() => import("@/components/ui/command").then((m) => ({ default: m.CommandItem })));
const CommandList = lazy(() => import("@/components/ui/command").then((m) => ({ default: m.CommandList })));
const CommandSeparator = lazy(() => import("@/components/ui/command").then((m) => ({ default: m.CommandSeparator })));

type Result = {
  profiles: Array<{ id: string; handle: string | null; display_name: string | null; avatar_url: string | null }>;
  venues: Array<{ id: string; name: string; slug: string | null }>;
  parties: Array<{ id: string; title: string }>;
};

const empty: Result = { profiles: [], venues: [], parties: [] };

// Build a fuzzy ILIKE pattern: "prpt" -> "%p%r%p%t%" (matches letters in order)
function fuzzyPattern(term: string) {
  const clean = term.toLowerCase().replace(/[%_\\]/g, "").replace(/\s+/g, "");
  if (!clean) return "%";
  return "%" + clean.split("").join("%") + "%";
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Result>(empty);
  const [suggestions, setSuggestions] = useState<Result>(empty);
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

  // Load suggestions when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const [p, v, pa] = await Promise.all([
        supabase.from("profiles")
          .select("id, handle, display_name, avatar_url")
          .order("aura", { ascending: false })
          .limit(4),
        supabase.from("venues")
          .select("id, name, slug")
          .order("created_at", { ascending: false })
          .limit(4),
        supabase.from("parties")
          .select("id, title")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(4),
      ]);
      if (cancelled) return;
      setSuggestions({
        profiles: (p.data as Result["profiles"]) ?? [],
        venues: (v.data as Result["venues"]) ?? [],
        parties: (pa.data as Result["parties"]) ?? [],
      });
    })();
    return () => { cancelled = true; };
  }, [open]);

  // Debounced fuzzy search
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 1) { setRes(empty); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const sub = `%${term}%`;
      const fuzzy = fuzzyPattern(term);
      const [p, v, pa] = await Promise.all([
        supabase.from("profiles")
          .select("id, handle, display_name, avatar_url")
          .or(`handle.ilike.${sub},display_name.ilike.${sub},handle.ilike.${fuzzy},display_name.ilike.${fuzzy}`)
          .limit(8),
        supabase.from("venues")
          .select("id, name, slug")
          .or(`name.ilike.${sub},name.ilike.${fuzzy}`)
          .limit(8),
        supabase.from("parties")
          .select("id, title")
          .or(`title.ilike.${sub},title.ilike.${fuzzy}`)
          .gt("expires_at", new Date().toISOString())
          .limit(8),
      ]);
      if (cancelled) return;
      setRes({
        profiles: (p.data as Result["profiles"]) ?? [],
        venues: (v.data as Result["venues"]) ?? [],
        parties: (pa.data as Result["parties"]) ?? [],
      });
      setLoading(false);
    }, 180);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, open]);

  const go = (path: string) => {
    setOpen(false);
    nav({ to: path as never });
  };

  const showing = q.trim().length >= 1 ? res : suggestions;
  const isSuggesting = q.trim().length < 1;
  const total = showing.profiles.length + showing.venues.length + showing.parties.length;

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
      {open && (
        <Suspense fallback={null}>
          <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
            <CommandInput
              placeholder="Caută oameni, localuri, faze… (merg și prescurtări: prpt → petrecere)"
              value={q}
              onValueChange={setQ}
            />
            <CommandList>
              {loading && (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" />
                </div>
              )}
              {!loading && !isSuggesting && total === 0 && (
                <CommandEmpty>Nu am găsit nimic. Încearcă alte litere.</CommandEmpty>
              )}
              {isSuggesting && total > 0 && (
                <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Sparkles size={11} /> Sugestii pentru tine
                </div>
              )}
              {showing.profiles.length > 0 && (
                <CommandGroup heading="Oameni">
                  {showing.profiles.map((p) => (
                    <CommandItem key={p.id} value={`u-${p.id}-${p.handle ?? ""}`} onSelect={() => go(`/app/user/${p.id}`)}>
                      <User size={14} className="mr-2 opacity-70" />
                      <span className="truncate">{p.display_name || p.handle || "Profil"}</span>
                      {p.handle && <span className="ml-2 text-xs text-muted-foreground">@{p.handle}</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {showing.venues.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Localuri">
                    {showing.venues.map((v) => (
                      <CommandItem key={v.id} value={`v-${v.id}`} onSelect={() => go(`/app/discover?venue=${v.id}`)}>
                        <MapPin size={14} className="mr-2 opacity-70" />
                        <span className="truncate">{v.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
              {showing.parties.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading={isSuggesting ? "Faze active" : "Faze"}>
                    {showing.parties.map((pa) => (
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
        </Suspense>
      )}
    </>
  );
}

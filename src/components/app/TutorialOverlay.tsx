import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Beer, Users, Coins, X } from "lucide-react";

const LS_KEY = "oxi-tutorial-seen-v1";

type Step = {
  icon: React.ReactNode;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    icon: <MapPin size={28} className="text-neon-crimson" />,
    title: "Orașul e live, pe hartă",
    body:
      "Vezi în timp real cluburi, terase și prieteni. Apasă pe un pin ca să afli cine bea, unde și ce se întâmplă.",
  },
  {
    icon: <BeerIcon size={28} className="text-sunset-amber" />,
    title: "Dă check-in la șpriț",
    body:
      "Când ești într-o locație, dă check-in. Îți crește streak-ul, primești coins și apari în topul ZEII zilei.",
  },
  {
    icon: <Users size={28} className="text-neon-purple" />,
    title: "Cheamă oamenii lângă tine",
    body:
      "Deschide un spritz în /Petreceri, urmărește prieteni, dă follow și fă squad. Primești notificare când cineva live e aproape.",
  },
  {
    icon: <Coins size={28} className="text-sunset-amber" />,
    title: "Coins, cadouri, VIP",
    body:
      "Coins-ii îi câștigi prin activitate sau îi cumperi din Shop. Trimite cadouri în chat, fă-ți profilul VIP sau dă-ți boost.",
  },
];

export function TutorialOverlay() {
  const { user, profile } = useAuth();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || !profile?.onboarded) return;
    if ((profile as any).tutorial_seen) return;
    try {
      if (localStorage.getItem(LS_KEY)) return;
    } catch {}
    // Slight delay so the app shell mounts first
    const t = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(t);
  }, [user, profile]);

  async function finish() {
    setOpen(false);
    try {
      localStorage.setItem(LS_KEY, "1");
    } catch {}
    if (user) {
      await supabase
        .from("profiles")
        .update({ tutorial_seen: true } as any)
        .eq("id", user.id);
    }
  }

  if (!open) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-foreground/15 bg-background p-6 shadow-2xl">
        <button
          onClick={finish}
          aria-label="închide"
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        >
          <X size={18} />
        </button>
        <div className="mx-auto h-14 w-14 rounded-2xl bg-foreground/5 flex items-center justify-center mb-4">
          {s.icon}
        </div>
        <div className="text-center space-y-1.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            PASUL {step + 1} / {STEPS.length}
          </div>
          <h2 className="font-display text-2xl leading-tight">{s.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
        </div>
        <div className="flex justify-center gap-1.5 mt-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-neon-crimson" : "w-1.5 bg-foreground/20"
              }`}
            />
          ))}
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={finish}
            className="flex-1 py-3 rounded-xl border border-foreground/15 text-sm text-muted-foreground"
          >
            Sari peste
          </button>
          <button
            onClick={() => (last ? finish() : setStep((s) => s + 1))}
            className="flex-1 py-3 rounded-xl bg-neon-crimson text-white font-display uppercase tracking-widest text-sm"
          >
            {last ? "Hai" : "Mai departe"}
          </button>
        </div>
      </div>
    </div>
  );
}

import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  district: z.string().min(1).max(60),
  vibe: z.enum(["chaos", "stealth", "legendary", "blackout", "duel"]),
});

const EventSchema = z.object({
  events: z.array(z.object({
    tag: z.enum(["EVENT", "DUEL", "DROP", "CHAOS", "MISSION", "HUNT"]),
    title: z.string().min(4).max(60),
    text: z.string().min(20).max(180),
    reward: z.string().min(2).max(40),
    risk: z.enum(["low", "medium", "high", "legendary"]),
  })).length(4),
  cinematic_line: z.string().min(20).max(160),
  chaos_level: z.number().min(0).max(100),
});

export const generateChaosEvents = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);

    const systemPrompt = `Ești "OXID-CORE", AI-ul game master al aplicației OXIDAȚII — o platformă socială de nightlife în care orașul devine un joc multiplayer live.

Stilul tău: cyberpunk, cinematic, intens, mister, în română de stradă cu un strop de engleză. Adrenalină + FOMO. Niciodată banal. Niciodată moralist. Niciodată periculos (fără băut excesiv, fără ilegal).

Generezi evenimente live pentru un cartier. Fiecare eveniment are titlu scurt și punchy, descriere care creează FOMO, și o recompensă concretă (XP, titluri, cosmetice, control teritoriu, aura points).

Vibe-uri:
- chaos: haos total, modificatori random, surprize
- stealth: tăcere, misiuni hidden, ghost mode
- legendary: rar, elite, recompense masive
- blackout: timer scurt, totul se rupe în 20 min
- duel: 1v1 sau squad vs squad

Răspunde DOAR în formatul cerut.`;

    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system: systemPrompt,
        prompt: `Cartier: ${data.district}\nVibe nopții: ${data.vibe}\n\nGenerează 4 evenimente live pentru următoarele 30 de minute. Adaugă o linie cinematic de broadcast (1 propoziție, ca o intro de film) și un chaos_level 0-100.`,
        output: Output.object({ schema: EventSchema }),
      });
      return output;
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      if (e.statusCode === 402) {
        throw new Error("AI credits epuizate. Adaugă credite din Settings → Workspace → Usage.");
      }
      if (e.statusCode === 429) {
        throw new Error("Rate limit. Încearcă din nou în câteva secunde.");
      }
      throw new Error(`OXID-CORE offline: ${e.message ?? "unknown"}`);
    }
  });

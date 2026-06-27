import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const TextInput = z.object({ text: z.string().min(1).max(4000) });
const MediaInput = z.object({
  imageUrl: z.string().url(),
  caption: z.string().max(500).optional().nullable(),
});

type Verdict = {
  allowed: boolean;
  reason?: string;
  categories: string[];
};

function parseVerdict(raw: string): Verdict {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    const json = JSON.parse(m ? m[0] : raw);
    return {
      allowed: !!json.allowed,
      reason: typeof json.reason === "string" ? json.reason : undefined,
      categories: Array.isArray(json.categories) ? json.categories.slice(0, 6) : [],
    };
  } catch {
    return { allowed: true, categories: [] };
  }
}

const SYSTEM = `You are a strict but fair content moderator for a Romanian nightlife social app (18+ alcohol context allowed). 
Reject content that contains: explicit nudity / sexual acts, graphic violence or blood, hate speech / slurs, illegal drugs depiction, doxxing, scams or external promotions, child-related risky content.
ALLOW: alcohol (spritz, beer, cocktails), party scenes, dancing, mild flirty captions, swearing in Romanian slang.
Respond ONLY with strict JSON: {"allowed": boolean, "reason": "short ro reason if not allowed", "categories": ["nudity"|"violence"|"hate"|"drugs"|"spam"|"doxxing"|"minor"|"other"]}`;

export const moderateText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TextInput.parse(d))
  .handler(async ({ data }): Promise<Verdict> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { allowed: true, categories: [] };
    try {
      const gw = createLovableAiGatewayProvider(key);
      const { text } = await generateText({
        model: gw("google/gemini-3-flash-preview"),
        system: SYSTEM,
        prompt: `Moderate this text:\n"""${data.text}"""`,
      });
      return parseVerdict(text);
    } catch {
      return { allowed: true, categories: [] };
    }
  });

export const moderateMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MediaInput.parse(d))
  .handler(async ({ data }): Promise<Verdict> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { allowed: true, categories: [] };
    try {
      const gw = createLovableAiGatewayProvider(key);
      const { text } = await generateText({
        model: gw("google/gemini-3-flash-preview"),
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Moderate this image${data.caption ? ` with caption: "${data.caption}"` : ""}.`,
              },
              { type: "image", image: new URL(data.imageUrl) },
            ],
          },
        ],
      });
      return parseVerdict(text);
    } catch {
      return { allowed: true, categories: [] };
    }
  });

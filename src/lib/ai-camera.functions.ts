import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  imageDataUrl: z.string().min(32).max(8_000_000),
  preset: z.string().min(1).max(60),
  customPrompt: z.string().max(400).optional(),
});

const PRESETS: Record<string, string> = {
  "neon-night":
    "Transform the subject into a cinematic neon nightlife portrait: magenta and cyan rim lights, blurred club bokeh background, glossy reflections, 35mm grain. Keep face identity, expression and composition identical.",
  "anime":
    "Restyle as a high-quality modern anime illustration (Makoto Shinkai / Kyoto Animation style), crisp lineart, vibrant cel-shading, soft glow. Preserve face shape, hair and pose exactly.",
  "polaroid-90s":
    "Transform into a 90s Polaroid snapshot: warm faded colors, soft flash, slight overexposure, vignette, paper border. Keep subject and composition unchanged.",
  "cyberpunk":
    "Cyberpunk Tokyo street portrait: holographic signage reflections, wet asphalt, teal and magenta lighting, slight chromatic aberration. Same face, same pose.",
  "festival":
    "Add festival vibe: subtle glitter on cheeks, soft golden-hour bokeh of stage lights and confetti behind, warm contrast. Keep face natural and identical.",
  "bw-film":
    "Convert to dramatic black and white 35mm film portrait: high contrast, deep blacks, fine grain, Kodak Tri-X feel. Keep all facial details intact.",
  "renaissance":
    "Restyle as a Renaissance oil painting portrait, Caravaggio-style chiaroscuro lighting, rich textures, dark background. Preserve identity strictly.",
  "vaporwave":
    "Vaporwave aesthetic: pastel pink and cyan gradient background, retro grid, palm silhouettes, soft 80s glow. Keep subject untouched, just restyle the scene.",
};

export const aiCameraStyle = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const presetPrompt = PRESETS[data.preset] ?? PRESETS["neon-night"];
    const prompt = data.customPrompt
      ? `${presetPrompt}\n\nExtra direction from user: ${data.customPrompt}`
      : presetPrompt;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image",
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Prea multe cereri. Încearcă din nou într-un minut.");
      if (res.status === 402) throw new Error("Credite AI insuficiente. Reîncarcă din workspace.");
      throw new Error(`AI gateway error ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as any;
    const msg = json?.choices?.[0]?.message;
    // OpenRouter Gemini image output: message.images[].image_url.url
    const fromImages = msg?.images?.[0]?.image_url?.url as string | undefined;
    // Some routes inline data url inside content
    const fromContent =
      typeof msg?.content === "string"
        ? (msg.content.match(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/)?.[0] ?? undefined)
        : Array.isArray(msg?.content)
          ? (msg.content.find((c: any) => c?.image_url?.url)?.image_url?.url as string | undefined)
          : undefined;

    const imageUrl = fromImages ?? fromContent;
    if (!imageUrl) {
      throw new Error("AI nu a returnat o imagine. Încearcă alt stil sau altă poză.");
    }
    return { imageDataUrl: imageUrl };
  });

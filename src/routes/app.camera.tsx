import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Download, ImagePlus, Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { aiCameraStyle } from "@/lib/ai-camera.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/camera")({
  component: CameraPage,
  head: () => ({
    meta: [
      { title: "AI Camera — OXIDAȚII" },
      {
        name: "description",
        content: "Transformă-ți pozele cu filtre AI: neon night, anime, cyberpunk, polaroid și altele.",
      },
    ],
  }),
});

const PRESETS = [
  { id: "neon-night", label: "Neon Night", emoji: "🌃" },
  { id: "anime", label: "Anime", emoji: "✨" },
  { id: "cyberpunk", label: "Cyberpunk", emoji: "🤖" },
  { id: "polaroid-90s", label: "Polaroid '90", emoji: "📸" },
  { id: "festival", label: "Festival", emoji: "🎉" },
  { id: "bw-film", label: "B&W Film", emoji: "🎞️" },
  { id: "renaissance", label: "Renaissance", emoji: "🖼️" },
  { id: "vaporwave", label: "Vaporwave", emoji: "🌴" },
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

async function downscale(dataUrl: string, maxDim = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas ctx"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => reject(new Error("img load"));
    img.src = dataUrl;
  });
}

function CameraPage() {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [preset, setPreset] = useState<string>("neon-night");
  const [customPrompt, setCustomPrompt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const styleFn = useServerFn(aiCameraStyle);
  const mutation = useMutation({
    mutationFn: async (payload: { imageDataUrl: string; preset: string; customPrompt?: string }) => {
      return styleFn({ data: payload });
    },
    onSuccess: (data) => {
      setResultUrl(data.imageDataUrl);
      toast.success("Gata! ✨", { description: "Poza ta a fost transformată." });
    },
    onError: (err: any) => {
      toast.error("AI a refuzat", { description: err?.message ?? "Reîncearcă." });
    },
  });

  const handleFile = useCallback(async (file: File) => {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const small = await downscale(dataUrl, 1280);
      setSourceUrl(small);
      setResultUrl(null);
    } catch (e: any) {
      toast.error("Nu am putut citi poza", { description: e?.message });
    }
  }, []);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    e.target.value = "";
  };

  const generate = () => {
    if (!sourceUrl) {
      toast.error("Alege întâi o poză");
      return;
    }
    mutation.mutate({ imageDataUrl: sourceUrl, preset, customPrompt: customPrompt || undefined });
  };

  const download = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `oxidatii-ai-${preset}-${Date.now()}.png`;
    a.click();
  };

  return (
    <div
      className="min-h-screen px-4 pt-4 pb-24 text-foreground"
      data-header-bg="#0a0612"
      style={{ background: "linear-gradient(180deg,#0a0612 0%,#150826 100%)" }}
    >
      <header className="mb-4 flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 shadow-[0_0_24px_-4px_rgba(217,70,239,0.7)]">
          <Wand2 className="h-5 w-5 text-black" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">AI Camera</h1>
          <p className="text-xs text-white/60">Transformă-ți pozele în secunde cu Lovable AI.</p>
        </div>
      </header>

      {/* Picker */}
      {!sourceUrl && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => camRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur transition active:scale-95"
          >
            <Camera className="h-7 w-7 text-cyan-300" />
            <span className="text-sm font-medium">Fă o poză</span>
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur transition active:scale-95"
          >
            <ImagePlus className="h-7 w-7 text-fuchsia-300" />
            <span className="text-sm font-medium">Din galerie</span>
          </button>
          <input ref={camRef} type="file" accept="image/*" capture="user" hidden onChange={onPickFile} />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
        </div>
      )}

      {/* Preview */}
      {sourceUrl && (
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black shadow-[0_20px_60px_-20px_rgba(217,70,239,0.4)]">
          <img
            src={resultUrl ?? sourceUrl}
            alt={resultUrl ? "Rezultat AI" : "Sursă"}
            className="aspect-square w-full object-cover"
          />
          {mutation.isPending && (
            <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-fuchsia-400" />
                <span className="text-sm text-white/80">Pictează magie… (~10-25s)</span>
              </div>
            </div>
          )}
          {resultUrl && !mutation.isPending && (
            <span className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
              ✨ AI
            </span>
          )}
        </div>
      )}

      {sourceUrl && (
        <>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PRESETS.map((p) => {
              const active = preset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`flex shrink-0 flex-col items-center gap-1 rounded-2xl border px-3 py-2 transition active:scale-95 ${
                    active
                      ? "border-fuchsia-400/60 bg-fuchsia-500/15 shadow-[0_0_18px_-4px_rgba(217,70,239,0.7)]"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <span className="text-xl leading-none">{p.emoji}</span>
                  <span className="text-[11px] font-medium">{p.label}</span>
                </button>
              );
            })}
          </div>

          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="(opțional) descrie ce vrei extra: „adaugă aripi de neon”…"
            rows={2}
            maxLength={300}
            className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-3 text-sm placeholder:text-white/40 focus:border-fuchsia-400/60 focus:outline-none"
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              onClick={generate}
              disabled={mutation.isPending}
              className="h-12 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-black font-bold hover:opacity-95"
            >
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {resultUrl ? "Regenerează" : "Generează"}
            </Button>
            <Button
              onClick={() => {
                setSourceUrl(null);
                setResultUrl(null);
              }}
              variant="outline"
              className="h-12 rounded-2xl border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              Altă poză
            </Button>
          </div>

          {resultUrl && (
            <Button
              onClick={download}
              variant="outline"
              className="mt-2 h-11 w-full rounded-2xl border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              <Download className="mr-2 h-4 w-4" />
              Descarcă rezultatul
            </Button>
          )}
        </>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Download, Share2, Copy, Check, Instagram, MessageCircle, Music2 } from "lucide-react";
import { toast } from "sonner";

type Props = { code: string };

type Design = "neon" | "spritz" | "minimal";

const BASE = "https://oxidatii.life";

function buildLink(code: string, src: string) {
  return `${BASE}/?ref=${code}&utm_source=${src}&utm_medium=social&utm_campaign=invite`;
}

const CAPTIONS: Record<string, (code: string, link: string) => string> = {
  tiktok: (c, l) =>
    `pov: e joi seara și nu știi unde se bea șpriț 🍹\nbagi codul ${c} pe OXIDAȚII și ai 50 șprițuri din prima\n${l}\n#oxidatii #spritz #nightlifero`,
  instagram: (c, l) =>
    `Harta nightlife-ului din RO, dar pentru oamenii care chiar ies.\nCod: ${c} → 50 șprițuri gratis 🍹\n${l}`,
  whatsapp: (c, l) =>
    `Hai pe OXIDAȚII cu mine 🍹 — vezi unde-i mișto acum, cine bea unde, faci squad.\nPune codul ${c} la onboarding și primești 50 șprițuri.\n${l}`,
};

export function InviteShareKit({ code }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [design, setDesign] = useState<Design>("neon");
  const [preview, setPreview] = useState<string>("");
  const [copied, setCopied] = useState<string>("");

  useEffect(() => {
    if (!code) return;
    drawCard(canvasRef.current, design, code).then(setPreview);
  }, [design, code]);

  const download = async () => {
    const url = await drawCard(canvasRef.current, design, code);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oxidatii-invite-${code}.png`;
    a.click();
    toast.success("Imagine salvată — urc-o pe Story");
  };

  const shareImg = async () => {
    try {
      const blob: Blob = await new Promise((res, rej) => {
        canvasRef.current?.toBlob((b) => (b ? res(b) : rej()), "image/png");
      });
      const file = new File([blob], `oxidatii-${code}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text: `Cod: ${code}`, url: buildLink(code, "share") });
      } else {
        await download();
      }
    } catch {
      await download();
    }
  };

  const copyCaption = async (key: string) => {
    const link = buildLink(code, key);
    await navigator.clipboard.writeText(CAPTIONS[key](code, link));
    setCopied(key);
    toast.success("Caption copiat");
    setTimeout(() => setCopied(""), 1500);
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-fuchsia-400">
            // CREATIVE KIT
          </div>
          <h2 className="font-display font-black text-lg">Story-ready în 3 secunde</h2>
        </div>
      </div>

      {/* Design picker */}
      <div className="flex gap-2 mb-3">
        {(["neon", "spritz", "minimal"] as Design[]).map((d) => (
          <button
            key={d}
            onClick={() => setDesign(d)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
              design === d
                ? "bg-white text-black"
                : "bg-white/5 text-white/60 border border-white/10"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black mb-3 max-h-[420px] mx-auto">
        {preview ? (
          <img src={preview} alt="Invite story" className="w-full h-full object-contain" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-white/30 text-xs">
            Se generează…
          </div>
        )}
      </div>
      <canvas ref={canvasRef} width={1080} height={1920} className="hidden" />

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={download}
          className="py-3 rounded-full bg-white/10 border border-white/20 font-bold text-sm flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" /> Descarcă
        </button>
        <button
          onClick={shareImg}
          className="py-3 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-bold text-sm flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" /> Share
        </button>
      </div>

      {/* Captions */}
      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.25em] text-white/40 mb-1">
          Captions gata-făcute
        </div>
        <CaptionRow
          icon={<Music2 className="w-4 h-4" />}
          label="TikTok"
          k="tiktok"
          copied={copied}
          onCopy={copyCaption}
        />
        <CaptionRow
          icon={<Instagram className="w-4 h-4" />}
          label="Instagram"
          k="instagram"
          copied={copied}
          onCopy={copyCaption}
        />
        <CaptionRow
          icon={<MessageCircle className="w-4 h-4" />}
          label="WhatsApp"
          k="whatsapp"
          copied={copied}
          onCopy={copyCaption}
        />
      </div>
    </div>
  );
}

function CaptionRow({
  icon,
  label,
  k,
  copied,
  onCopy,
}: {
  icon: React.ReactNode;
  label: string;
  k: string;
  copied: string;
  onCopy: (k: string) => void;
}) {
  const isCopied = copied === k;
  return (
    <button
      onClick={() => onCopy(k)}
      className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
    >
      <span className="flex items-center gap-3 text-sm font-medium">
        {icon} {label}
      </span>
      {isCopied ? (
        <Check className="w-4 h-4 text-emerald-400" />
      ) : (
        <Copy className="w-4 h-4 text-white/40" />
      )}
    </button>
  );
}

// ---------- canvas drawing ----------
async function drawCard(
  canvas: HTMLCanvasElement | null,
  design: Design,
  code: string,
): Promise<string> {
  if (!canvas) return "";
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const W = canvas.width,
    H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  if (design === "neon") drawNeon(ctx, W, H, code);
  else if (design === "spritz") drawSpritz(ctx, W, H, code);
  else drawMinimal(ctx, W, H, code);

  return canvas.toDataURL("image/png");
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawNeon(ctx: CanvasRenderingContext2D, W: number, H: number, code: string) {
  // bg
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0a0118");
  g.addColorStop(0.5, "#1a0530");
  g.addColorStop(1, "#050510");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // glows
  radialGlow(ctx, W * 0.2, H * 0.25, 500, "rgba(236,72,153,0.55)");
  radialGlow(ctx, W * 0.85, H * 0.7, 600, "rgba(168,85,247,0.5)");
  radialGlow(ctx, W * 0.5, H * 0.5, 400, "rgba(251,146,60,0.25)");

  // top tag
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "600 32px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText("// OXIDAȚII", W / 2, 180);

  // headline
  ctx.fillStyle = "#fff";
  ctx.font = "900 130px 'Inter', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("HAI LA", W / 2, H * 0.32);
  ctx.fillText("ȘPRIȚ.", W / 2, H * 0.32 + 150);

  // sub
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "500 42px 'Inter', system-ui, sans-serif";
  ctx.fillText("Harta nightlife-ului din RO.", W / 2, H * 0.55);
  ctx.fillText("Vezi unde-i mișto acum.", W / 2, H * 0.55 + 60);

  // code card
  const cx = W / 2 - 380,
    cy = H * 0.65,
    cw = 760,
    ch = 320;
  ctx.shadowColor = "rgba(236,72,153,0.7)";
  ctx.shadowBlur = 60;
  roundedRect(ctx, cx, cy, cw, ch, 40);
  const cg = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
  cg.addColorStop(0, "rgba(236,72,153,0.25)");
  cg.addColorStop(1, "rgba(168,85,247,0.15)");
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(236,72,153,0.6)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "600 32px ui-monospace, monospace";
  ctx.fillText("CODUL TĂU → 50 ȘPRIȚURI", W / 2, cy + 80);
  ctx.fillStyle = "#fff";
  ctx.font = "900 180px ui-monospace, monospace";
  ctx.fillText(code, W / 2, cy + 250);

  // footer
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "600 30px 'Inter', system-ui, sans-serif";
  ctx.fillText("oxidatii.life  ·  doar +18", W / 2, H - 100);
}

function drawSpritz(ctx: CanvasRenderingContext2D, W: number, H: number, code: string) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#ff6b35");
  g.addColorStop(0.5, "#f7931e");
  g.addColorStop(1, "#c9184a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  radialGlow(ctx, W * 0.5, H * 0.3, 700, "rgba(255,255,255,0.15)");

  // big circle for code
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.5, 380, 0, Math.PI * 2);
  ctx.fillStyle = "#0a0118";
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#fff";
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.textAlign = "center";
  ctx.font = "600 36px ui-monospace, monospace";
  ctx.fillText("COD INVITE", W / 2, H * 0.5 - 80);
  ctx.fillStyle = "#fff";
  ctx.font = "900 160px ui-monospace, monospace";
  ctx.fillText(code, W / 2, H * 0.5 + 40);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "700 40px 'Inter', system-ui, sans-serif";
  ctx.fillText("+50 șprițuri 🍹", W / 2, H * 0.5 + 110);

  ctx.fillStyle = "#fff";
  ctx.font = "900 110px 'Inter', system-ui, sans-serif";
  ctx.fillText("OXIDAȚII", W / 2, 280);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 38px 'Inter', system-ui, sans-serif";
  ctx.fillText("aplicația de șpriț", W / 2, 340);

  ctx.fillStyle = "#fff";
  ctx.font = "800 56px 'Inter', system-ui, sans-serif";
  ctx.fillText("descarcă pe", W / 2, H - 280);
  ctx.font = "900 72px 'Inter', system-ui, sans-serif";
  ctx.fillText("oxidatii.life", W / 2, H - 180);
}

function drawMinimal(ctx: CanvasRenderingContext2D, W: number, H: number, code: string) {
  ctx.fillStyle = "#f5f5f0";
  ctx.fillRect(0, 0, W, H);
  // grain dots
  ctx.fillStyle = "rgba(0,0,0,0.04)";
  for (let i = 0; i < 200; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#0a0a0a";
  ctx.textAlign = "left";
  ctx.font = "600 32px ui-monospace, monospace";
  ctx.fillText("// OXIDAȚII / 2026", 100, 180);

  ctx.font = "900 200px 'Inter', system-ui, sans-serif";
  ctx.fillText("șpriț?", 100, H * 0.35);
  ctx.fillStyle = "#c9184a";
  ctx.fillText("hai.", 100, H * 0.35 + 220);

  ctx.fillStyle = "#0a0a0a";
  ctx.font = "500 44px 'Inter', system-ui, sans-serif";
  wrapText(ctx, "Vezi pe hartă unde se bea acum și cu cine.", 100, H * 0.65, W - 200, 56);

  // code line
  ctx.strokeStyle = "#0a0a0a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(100, H * 0.82);
  ctx.lineTo(W - 100, H * 0.82);
  ctx.stroke();
  ctx.font = "600 32px ui-monospace, monospace";
  ctx.fillText("COD", 100, H * 0.82 + 60);
  ctx.font = "900 140px ui-monospace, monospace";
  ctx.textAlign = "right";
  ctx.fillText(code, W - 100, H * 0.82 + 130);

  ctx.textAlign = "left";
  ctx.fillStyle = "#666";
  ctx.font = "500 30px 'Inter', system-ui, sans-serif";
  ctx.fillText("oxidatii.life · +18", 100, H - 100);
}

function radialGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lh: number,
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line + w + " ";
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line, x, yy);
      line = w + " ";
      yy += lh;
    } else line = test;
  }
  ctx.fillText(line, x, yy);
}

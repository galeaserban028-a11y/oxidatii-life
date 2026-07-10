import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Download, X, Instagram } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  venueName: string;
  venueCity?: string | null;
  userName: string;
  userAvatar?: string | null;
  spritzScore?: number | null;
  streak?: number | null;
}

/**
 * 9:16 story-card generated on <canvas> after a check-in.
 * One tap → native share to Instagram Story / WhatsApp / etc.
 * Falls back to download when Web Share API is unavailable.
 */
export function CheckInShareSheet({
  open,
  onClose,
  venueName,
  venueCity,
  userName,
  userAvatar,
  spritzScore,
  streak,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const url = await render();
      if (!cancelled) setImgUrl(url);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, venueName, userName, userAvatar]);

  async function render(): Promise<string> {
    const W = 1080;
    const H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // background — midnight glass gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#0a0416");
    bg.addColorStop(0.5, "#1a0a2e");
    bg.addColorStop(1, "#0a0416");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // magenta glow top-left
    const g1 = ctx.createRadialGradient(180, 240, 20, 180, 240, 720);
    g1.addColorStop(0, "rgba(236, 72, 153, 0.45)");
    g1.addColorStop(1, "rgba(236, 72, 153, 0)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    // cyan glow bottom-right
    const g2 = ctx.createRadialGradient(W - 160, H - 320, 20, W - 160, H - 320, 780);
    g2.addColorStop(0, "rgba(34, 211, 238, 0.4)");
    g2.addColorStop(1, "rgba(34, 211, 238, 0)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    // top brand pill
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRect(ctx, 60, 80, 320, 92, 46);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    roundRect(ctx, 60, 80, 320, 92, 46);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "700 46px 'Barlow', system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("OXIDAȚII", 100, 128);

    // avatar circle
    const avatarR = 130;
    const cx = W / 2;
    const cy = 540;
    if (userAvatar) {
      try {
        const img = await loadImage(userAvatar);
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, avatarR, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, cx - avatarR, cy - avatarR, avatarR * 2, avatarR * 2);
        ctx.restore();
      } catch {
        drawInitialAvatar(ctx, cx, cy, avatarR, userName);
      }
    } else {
      drawInitialAvatar(ctx, cx, cy, avatarR, userName);
    }
    // avatar ring
    const ring = ctx.createLinearGradient(cx - avatarR, cy, cx + avatarR, cy);
    ring.addColorStop(0, "#ec4899");
    ring.addColorStop(1, "#22d3ee");
    ctx.strokeStyle = ring;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, avatarR + 8, 0, Math.PI * 2);
    ctx.stroke();

    // user name
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "800 68px 'Barlow', system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(truncate(userName, 20), cx, cy + avatarR + 90);

    // "sunt aici" pill
    ctx.font = "600 34px 'Barlow', system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("SUNT AICI", cx, cy + avatarR + 160);

    // venue name — big neon
    const venueY = 1020;
    ctx.font = "900 96px 'Bebas Neue', 'Barlow', system-ui, sans-serif";
    const neon = ctx.createLinearGradient(0, venueY - 60, 0, venueY + 60);
    neon.addColorStop(0, "#ec4899");
    neon.addColorStop(1, "#22d3ee");
    ctx.fillStyle = neon;
    ctx.shadowColor = "rgba(236,72,153,0.6)";
    ctx.shadowBlur = 40;
    ctx.fillText(truncate(venueName.toUpperCase(), 22), cx, venueY);
    ctx.shadowBlur = 0;

    if (venueCity) {
      ctx.font = "500 40px 'Barlow', system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText(venueCity, cx, venueY + 90);
    }

    // stats row
    const statsY = 1360;
    if (typeof spritzScore === "number") {
      drawStat(ctx, cx - 240, statsY, String(spritzScore), "SPRIȚURI");
    }
    if (typeof streak === "number" && streak > 0) {
      drawStat(ctx, cx + 240, statsY, `🔥${streak}`, "STREAK");
    }

    // bottom watermark
    ctx.textAlign = "center";
    ctx.font = "700 42px 'Barlow', system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText("oxidatii.life", cx, H - 140);
    ctx.font = "500 28px 'Barlow', system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText("găsește-ți sprițul", cx, H - 90);

    return canvas.toDataURL("image/jpeg", 0.92);
  }

  async function shareCard() {
    if (!imgUrl) return;
    setBusy(true);
    try {
      const blob = await (await fetch(imgUrl)).blob();
      const file = new File([blob], "oxidatii-checkin.jpg", { type: "image/jpeg" });
      const canShareFiles =
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] });

      if (canShareFiles) {
        await navigator.share({
          files: [file],
          title: `Sunt la ${venueName}`,
          text: `Sunt la ${venueName} pe OXIDAȚII 🍹 oxidatii.life`,
        });
      } else {
        // Fallback: download
        const a = document.createElement("a");
        a.href = imgUrl;
        a.download = "oxidatii-checkin.jpg";
        a.click();
        toast.success("Poza a fost descărcată — pune-o pe Story");
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) {
        toast.error("Nu s-a putut deschide share-ul");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 gap-0 bg-[#0a0416] border-white/10 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-full bg-black/40 backdrop-blur p-2 text-white/80 hover:text-white"
          aria-label="Închide"
        >
          <X size={18} />
        </button>

        <div className="p-4 pt-6 space-y-4">
          <div className="text-center space-y-1">
            <h2 className="font-display font-black text-xl text-white">Ai făcut check-in! 🎉</h2>
            <p className="text-xs text-white/60">
              Pune-l pe Story și adu prieteni pe OXIDAȚII
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden bg-black/40 aspect-[9/16] flex items-center justify-center">
            {imgUrl ? (
              <img
                src={imgUrl}
                alt="Story card"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-white/40 text-xs">generez cardul...</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={shareCard}
              disabled={!imgUrl || busy}
              className="bg-gradient-to-r from-pink-500 to-cyan-400 text-white hover:opacity-90 font-bold"
            >
              <Instagram size={16} className="mr-1.5" />
              {busy ? "..." : "Share Story"}
            </Button>
            <Button
              onClick={() => {
                if (!imgUrl) return;
                const a = document.createElement("a");
                a.href = imgUrl;
                a.download = "oxidatii-checkin.jpg";
                a.click();
              }}
              disabled={!imgUrl}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 hover:text-white"
            >
              <Download size={16} className="mr-1.5" /> Salvează
            </Button>
          </div>

          <button
            onClick={onClose}
            className="w-full text-center text-xs text-white/40 hover:text-white/70 py-1"
          >
            Nu acum
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}

// ---------- helpers ----------

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawInitialAvatar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  name: string
) {
  const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  grad.addColorStop(0, "#ec4899");
  grad.addColorStop(1, "#22d3ee");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "900 120px 'Barlow', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText((name || "?")[0]?.toUpperCase() || "?", cx, cy + 8);
}

function drawStat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  value: string,
  label: string
) {
  ctx.textAlign = "center";
  ctx.font = "900 84px 'Barlow', system-ui, sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText(value, x, y);
  ctx.font = "600 26px 'Barlow', system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText(label, x, y + 50);
}

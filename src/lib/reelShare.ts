/**
 * Share / download a reel with an Oxidații watermark.
 *
 * For images we composite the photo + watermark on a 9:16 canvas so the
 * exported PNG always carries the brand. For videos we share the URL +
 * caption with a branded text watermark (re-encoding video client-side
 * would be too heavy on mobile).
 */

type ReelLike = {
  id: string;
  url: string;
  caption?: string | null;
  handle: string;
  venue_name?: string | null;
  isVideo: boolean;
};

const SITE = "oxidatii.life";

function brandedText(reel: ReelLike): string {
  const parts: string[] = [];
  if (reel.caption) parts.push(reel.caption);
  if (reel.venue_name) parts.push(`📍 ${reel.venue_name}`);
  parts.push(`via @${reel.handle} pe ${SITE}`);
  return parts.join("\n");
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

async function composePhoto(reel: ReelLike): Promise<Blob | null> {
  try {
    const img = await loadImage(reel.url);
    const W = 1080;
    const H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // background blur fallback color
    ctx.fillStyle = "#04040a";
    ctx.fillRect(0, 0, W, H);

    // cover-fit
    const ar = img.width / img.height;
    let dw = W, dh = W / ar;
    if (dh < H) { dh = H; dw = H * ar; }
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);

    // bottom gradient
    const g = ctx.createLinearGradient(0, H * 0.55, 0, H);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);

    // watermark text
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "white";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 12;

    ctx.font = "700 56px Inter, system-ui, sans-serif";
    ctx.fillText(`@${reel.handle}`, 60, H - 200);

    if (reel.venue_name) {
      ctx.font = "500 36px Inter, system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(`📍 ${reel.venue_name}`, 60, H - 145);
    }

    if (reel.caption) {
      ctx.font = "500 34px Inter, system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      const max = W - 140;
      const words = reel.caption.split(/\s+/);
      let line = "";
      const lines: string[] = [];
      for (const w of words) {
        const test = line ? line + " " + w : w;
        if (ctx.measureText(test).width > max) { lines.push(line); line = w; }
        else line = test;
      }
      if (line) lines.push(line);
      lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, 60, H - 95 + i * 42));
    }

    // brand chip bottom-right
    ctx.shadowBlur = 0;
    ctx.font = "800 28px ui-monospace, SFMono-Regular, monospace";
    ctx.fillStyle = "#ffea00";
    const brand = `OXIDAȚII · ${SITE}`;
    const bw = ctx.measureText(brand).width;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(W - bw - 90, 60, bw + 50, 56);
    ctx.fillStyle = "#ffea00";
    ctx.fillText(brand, W - bw - 65, 98);

    return await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/png", 0.95));
  } catch {
    return null;
  }
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export async function shareReel(reel: ReelLike): Promise<void> {
  const text = brandedText(reel);

  if (!reel.isVideo) {
    const blob = await composePhoto(reel);
    if (blob) {
      const file = new File([blob], `oxidatii-reel-${reel.id}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text, title: "Oxidații" });
          return;
        } catch { /* cancelled or unsupported – fall through */ }
      }
      downloadBlob(blob, `oxidatii-reel-${reel.id}.png`);
      return;
    }
  }

  // Video (or photo composite failed): share URL + branded caption.
  const shareData: ShareData = {
    title: "Oxidații",
    text,
    url: `https://${SITE}`,
  };
  if (navigator.share) {
    try { await navigator.share(shareData); return; } catch { /* cancelled */ }
  }
  try { await navigator.clipboard.writeText(`${text}\nhttps://${SITE}`); } catch {}
}

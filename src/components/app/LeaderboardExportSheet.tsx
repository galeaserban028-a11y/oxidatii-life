import { useEffect, useRef, useState } from "react";
import { X, Share2, Download, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";

export type ExportRow = {
  user_id: string;
  handle?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  spritz_score: number;
};

type Props = {
  top3: ExportRow[];
  me?: { rank: number; spritz_score: number; handle?: string | null } | null;
  scopeLabel: string;
  monthLabel: string;
  onClose: () => void;
};

export function LeaderboardExportSheet({ top3, me, scopeLabel, monthLabel, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<null | "share" | "download">(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const podium = [top3[1], top3[0], top3[2]].filter(Boolean) as ExportRow[];

  const generatePng = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const dataUrl = await toPng(cardRef.current, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#04040a",
    });
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  const triggerDownload = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oxidatii-top-${monthLabel.replace(/\s+/g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    setBusy("share");
    try {
      const blob = await generatePng();
      if (!blob) return;
      const file = new File([blob], "oxidatii-top.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Top ${scopeLabel}`,
          text: `🏆 Top ${scopeLabel} · ${monthLabel} · Oxidații`,
        });
      } else {
        triggerDownload(blob);
      }
    } catch {
      /* cancelled */
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    setBusy("download");
    try {
      const b = await generatePng();
      if (b) triggerDownload(b);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 size-10 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-90 transition"
        aria-label="Close"
      >
        <X size={20} />
      </button>

      <div className="flex flex-col items-center gap-4 my-auto">
        <div
          ref={cardRef}
          className="relative w-full max-w-[380px] aspect-[9/16] rounded-[32px] overflow-hidden border border-white/10"
          style={{
            background:
              "linear-gradient(170deg, #04040a 0%, #1a0633 35%, #4a0a44 70%, #c724ff 130%)",
          }}
        >
          <div
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-50"
            style={{ background: "radial-gradient(circle, #c724ff, transparent 70%)" }}
          />
          <div
            className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-40"
            style={{ background: "radial-gradient(circle, #ff3d8b, transparent 70%)" }}
          />

          <div className="relative h-full flex flex-col p-7">
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/60">
              OXIDAȚII · TOP {scopeLabel.toUpperCase()}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mt-1">
              {monthLabel}
            </div>

            <div className="mt-6">
              <h1
                className="text-[44px] leading-[0.95] text-white"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                <span className="italic">
                  Spritz
                  <br />
                  Score
                </span>
              </h1>
            </div>

            {/* podium */}
            <div className="mt-7 grid grid-cols-3 gap-2 items-end">
              {podium.map((p, i) => {
                const realRank = p === top3[0] ? 1 : p === top3[1] ? 2 : 3;
                const isKing = realRank === 1;
                const h = isKing ? "h-32" : realRank === 2 ? "h-24" : "h-20";
                const handle = p.handle ?? p.display_name ?? "anonim";
                return (
                  <div key={p.user_id} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`relative ${isKing ? "size-16" : "size-14"} rounded-full p-[2px] bg-gradient-to-br ${isKing ? "from-[#ffea00] to-[#ff3d8b]" : "from-white/30 to-white/5"}`}
                    >
                      <div className="h-full w-full rounded-full overflow-hidden bg-black flex items-center justify-center text-white font-bold">
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt=""
                            crossOrigin="anonymous"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{handle[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      {isKing && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl">👑</div>
                      )}
                    </div>
                    <div className="text-[11px] font-semibold text-white text-center w-full truncate">
                      @{handle}
                    </div>
                    <div
                      className={`leading-none ${isKing ? "text-2xl text-[#ffea00]" : "text-lg text-white/80"} font-black tabular-nums`}
                    >
                      {p.spritz_score}
                    </div>
                    <div
                      className={`${h} w-full mt-1 rounded-t-xl ${isKing ? "bg-gradient-to-t from-[#c724ff]/60 to-transparent" : "bg-white/10"} flex items-start justify-center pt-1.5`}
                    >
                      <span
                        className={`text-[10px] font-mono font-bold ${isKing ? "text-[#ffea00]" : "text-white/50"}`}
                      >
                        #{realRank}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {me && (
              <div className="mt-6 rounded-2xl border border-white/15 bg-white/[0.07] p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-white/50">
                    Tu
                  </div>
                  <div className="text-[18px] font-black text-white">
                    #{me.rank}{" "}
                    {me.handle ? (
                      <span className="text-white/60 text-[13px] font-semibold">@{me.handle}</span>
                    ) : null}
                  </div>
                </div>
                <div className="text-2xl font-black tabular-nums text-[#ffea00]">
                  {me.spritz_score}
                </div>
              </div>
            )}

            <div className="mt-auto pt-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.25em] text-white/50">
              <span>oxidatii.life</span>
              <span>#SpritzScore</span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-[380px] grid grid-cols-2 gap-2">
          <button
            onClick={handleShare}
            disabled={busy !== null}
            className="py-4 rounded-2xl flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-[0.2em] text-black bg-white active:scale-95 transition disabled:opacity-60"
          >
            {busy === "share" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Share2 size={16} />
            )}{" "}
            Share
          </button>
          <button
            onClick={handleDownload}
            disabled={busy !== null}
            className="py-4 rounded-2xl flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-[0.2em] text-white bg-white/10 border border-white/15 active:scale-95 transition disabled:opacity-60"
          >
            {busy === "download" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}{" "}
            Salvează
          </button>
        </div>
      </div>
    </div>
  );
}

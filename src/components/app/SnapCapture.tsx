/**
 * Snap-style capture for OXIDAȚII.
 * Native (Capacitor): uses Camera.getPhoto / recordVideo — reliable on Android.
 * Web: live preview with tap=photo / hold=video when getUserMedia works.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Camera, Image as ImageIcon, SwitchCamera, Video } from "lucide-react";
import { toast } from "sonner";
import { haptic, isNative } from "@/lib/native";

type Props = {
  onCapture: (file: File) => void;
};

const HOLD_MS = 320;
const MAX_VIDEO_MS = 15_000;

async function uriToFile(path: string, fallbackName: string, fallbackType: string): Promise<File> {
  const res = await fetch(path);
  const blob = await res.blob();
  const type = blob.type || fallbackType;
  const ext = type.includes("mp4")
    ? "mp4"
    : type.includes("webm")
      ? "webm"
      : type.includes("png")
        ? "png"
        : type.includes("jpeg") || type.includes("jpg")
          ? "jpg"
          : fallbackName.split(".").pop() || "bin";
  return new File([blob], `spritz-${Date.now()}.${ext}`, { type });
}

export function SnapCapture({ onCapture }: Props) {
  const native = isNative() || /; wv\)/.test(navigator.userAgent);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const pressTimerRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const modeRef = useRef<"idle" | "photo" | "video">("idle");
  const galleryRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function startWebStream(face: "environment" | "user") {
    stopStream();
    setReady(false);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: { ideal: face },
          width: { ideal: 1280 },
          height: { ideal: 1920 },
        },
      });
      streamRef.current = stream;
      const el = videoRef.current;
      if (el) {
        el.srcObject = stream;
        await el.play().catch(() => {});
      }
      setReady(true);
    } catch (e) {
      console.warn("web camera failed", e);
      setError("Camera live indisponibilă — folosește butoanele de mai jos.");
      setReady(false);
    }
  }

  useEffect(() => {
    if (native) {
      // Native uses Capacitor Camera — no live stream required.
      setReady(true);
      setError(null);
      return;
    }
    void startWebStream(facing);
    return () => {
      if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
      if (recordingTimerRef.current) window.clearTimeout(recordingTimerRef.current);
      try {
        recorderRef.current?.stop();
      } catch {
        /* noop */
      }
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function nativePhoto() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const {
        Camera: CapCamera,
        CameraResultType,
        CameraSource,
      } = await import("@capacitor/camera");
      await CapCamera.requestPermissions({ permissions: ["camera", "photos"] });
      const photo = await CapCamera.getPhoto({
        quality: 92,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        correctOrientation: true,
        saveToGallery: false,
      });
      const path = photo.webPath;
      if (!path) throw new Error("Fără fișier poză");
      const file = await uriToFile(path, "photo.jpg", "image/jpeg");
      void haptic("medium");
      onCapture(file);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/cancel|user/i.test(msg)) toast.error("Nu am putut face poza. Încearcă din nou.");
      console.warn("nativePhoto", e);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function nativeVideo() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const { Camera: CapCamera } = await import("@capacitor/camera");
      await CapCamera.requestPermissions({ permissions: ["camera"] });
      const result = await CapCamera.recordVideo({
        saveToGallery: false,
        isPersistent: false,
      });
      const path = result.webPath || result.uri;
      if (!path) throw new Error("Fără fișier video");
      // Capacitor Android may return file:// — Capacitor.convertFileSrc if needed
      let fetchPath = path;
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (path.startsWith("file:")) fetchPath = Capacitor.convertFileSrc(path);
      } catch {
        /* noop */
      }
      const file = await uriToFile(fetchPath, "clip.mp4", "video/mp4");
      void haptic("medium");
      onCapture(file);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/cancel|user/i.test(msg)) toast.error("Nu am putut filma. Încearcă din nou.");
      console.warn("nativeVideo", e);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function nativeGallery() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const { Camera: CapCamera, MediaTypeSelection } = await import("@capacitor/camera");
      await CapCamera.requestPermissions({ permissions: ["photos"] });
      const picked = await CapCamera.chooseFromGallery({
        mediaType: MediaTypeSelection.All,
        allowMultipleSelection: false,
        limit: 1,
      });
      const media = picked?.results?.[0];
      const path = media?.webPath || media?.uri;
      if (!path) throw new Error("Nimic selectat");
      let fetchPath = path;
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (path.startsWith("file:")) fetchPath = Capacitor.convertFileSrc(path);
      } catch {
        /* noop */
      }
      const isVid = media.type === 1 || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(path);
      const file = await uriToFile(
        fetchPath,
        isVid ? "clip.mp4" : "photo.jpg",
        isVid ? "video/mp4" : "image/jpeg",
      );
      onCapture(file);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/cancel|user/i.test(msg)) {
        // Fallback HTML file input
        galleryRef.current?.click();
      }
      console.warn("nativeGallery", e);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function takeWebPhoto() {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;
    const w = video.videoWidth || 1080;
    const h = video.videoHeight || 1440;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) return toast.error("Nu am putut face poza.");
        void haptic("medium");
        onCapture(new File([blob], `spritz-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  }

  function stopWebVideo() {
    if (recordingTimerRef.current) {
      window.clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    }
    recorderRef.current = null;
  }

  function startWebVideo() {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mime =
      ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((m) =>
        MediaRecorder.isTypeSupported(m),
      ) ?? "";
    try {
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = rec;
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        setRecording(false);
        const type = rec.mimeType || "video/webm";
        const ext = type.includes("mp4") ? "mp4" : "webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        if (blob.size < 1000) return toast.error("Clipul e prea scurt.");
        void haptic("medium");
        onCapture(new File([blob], `spritz-${Date.now()}.${ext}`, { type }));
      };
      rec.start(200);
      setRecording(true);
      void haptic("light");
      recordingTimerRef.current = window.setTimeout(() => stopWebVideo(), MAX_VIDEO_MS);
    } catch {
      toast.error("Nu pot filma aici. Folosește butonul Video.");
      modeRef.current = "idle";
    }
  }

  function onPointerDown(e: ReactPointerEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    modeRef.current = "idle";
    if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = window.setTimeout(() => {
      modeRef.current = "video";
      if (native) void nativeVideo();
      else startWebVideo();
    }, HOLD_MS);
  }

  function onPointerUp(e: ReactPointerEvent) {
    e.preventDefault();
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (modeRef.current === "video") {
      if (!native) stopWebVideo();
      modeRef.current = "idle";
      return;
    }
    if (native) void nativePhoto();
    else takeWebPhoto();
    modeRef.current = "idle";
  }

  function onPointerCancel() {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (!native && recording) stopWebVideo();
    modeRef.current = "idle";
  }

  // —— Native UI: clear photo / video / gallery (most reliable on Android) ——
  if (native) {
    return (
      <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-card border border-border flex flex-col">
        <div
          className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center"
          style={{ background: "radial-gradient(circle at 50% 30%, rgba(255,80,120,0.18), transparent 60%), #0a0a12" }}
        >
          <div
            className="h-20 w-20 rounded-full flex items-center justify-center shadow-[var(--shadow-elevated)]"
            style={{ background: "var(--gradient-sunset)" }}
          >
            <Camera size={34} className="text-white" />
          </div>
          <div className="font-display font-bold text-xl text-foreground">fă o poză sau un clip</div>
          <p className="text-xs text-muted-foreground max-w-[16rem]">
            apasă butonul mare = poză · ține apăsat = video (sau folosește butoanele de jos)
          </p>
        </div>

        <div className="absolute bottom-5 inset-x-0 flex flex-col items-center gap-4 z-10">
          <div className="flex items-center gap-5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void nativeGallery()}
              className="h-11 w-11 rounded-full bg-black/55 text-white flex items-center justify-center disabled:opacity-40"
              aria-label="Galerie"
            >
              <ImageIcon size={18} />
            </button>

            <button
              type="button"
              disabled={busy}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onContextMenu={(e) => e.preventDefault()}
              className="h-[72px] w-[72px] rounded-full border-[4px] border-white bg-white/25 flex items-center justify-center touch-none select-none disabled:opacity-40 active:scale-95 transition"
              aria-label="Declanșator"
            >
              <span className="h-14 w-14 rounded-full bg-white" />
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => void nativeVideo()}
              className="h-11 w-11 rounded-full bg-black/55 text-white flex items-center justify-center disabled:opacity-40"
              aria-label="Video"
            >
              <Video size={18} />
            </button>
          </div>
          <p className="text-[10px] text-white/70">poză · video · galerie</p>
        </div>

        <input
          ref={galleryRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onCapture(f);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  // —— Web live preview ——
  return (
    <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-black border border-border">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 h-full w-full object-cover ${ready ? "opacity-100" : "opacity-0"}`}
      />
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white/80">
          <Camera size={36} className="opacity-70" />
          <p className="text-sm">{error ?? "Se deschide camera…"}</p>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="mt-1 px-4 py-2 rounded-full bg-white text-black text-sm font-semibold"
          >
            Galerie
          </button>
        </div>
      )}
      {recording && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          filmează…
        </div>
      )}
      <div className="absolute top-3 right-3 z-10">
        <button
          type="button"
          onClick={() => {
            const next = facing === "environment" ? "user" : "environment";
            setFacing(next);
            void startWebStream(next);
          }}
          disabled={!ready}
          className="h-10 w-10 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-40"
        >
          <SwitchCamera size={18} />
        </button>
      </div>
      <div className="absolute bottom-5 inset-x-0 flex flex-col items-center gap-3 z-10">
        <p className="text-[11px] text-white/80">apasă = poză · ține = video</p>
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="h-11 w-11 rounded-full bg-black/50 text-white flex items-center justify-center"
          >
            <ImageIcon size={18} />
          </button>
          <button
            type="button"
            disabled={!ready}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onContextMenu={(e) => e.preventDefault()}
            className={`h-[72px] w-[72px] rounded-full border-[4px] border-white flex items-center justify-center touch-none disabled:opacity-40 ${
              recording ? "bg-red-500 scale-110" : "bg-white/20"
            }`}
          >
            <span className={`rounded-full bg-white ${recording ? "h-6 w-6 rounded-md" : "h-14 w-14"}`} />
          </button>
          <span className="h-11 w-11" />
        </div>
      </div>
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onCapture(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

import { useEffect, useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "oxi_install_dismissed_v1";

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosSheet, setShowIosSheet] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Already installed?
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore iOS
      window.navigator.standalone === true;
    if (standalone) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
    setIsIos(ios);
    if (ios) {
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
    setShowIosSheet(false);
  };

  const handleInstall = async () => {
    if (isIos) {
      setShowIosSheet(true);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  return (
    <>
      <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-[hsl(var(--neon-crimson)/0.95)] to-[hsl(var(--neon-amber)/0.9)] text-black shadow-[0_2px_18px_rgba(0,0,0,0.4)]">
        <div className="mx-auto flex max-w-screen-sm items-center gap-2 px-3 py-2">
          <Download className="h-4 w-4 shrink-0" />
          <div className="flex-1 text-xs font-semibold leading-tight">
            Instalează OXIDAȚII pe telefon
            <div className="text-[10px] font-normal opacity-80">
              {isIos ? "iPhone / iPad — adaugă pe Home Screen" : "Android — un click și gata"}
            </div>
          </div>
          <button
            onClick={handleInstall}
            className="rounded-md bg-black px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-black/80"
          >
            Instalează
          </button>
          <button
            onClick={dismiss}
            aria-label="Închide"
            className="rounded-md p-1 hover:bg-black/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showIosSheet && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4"
          onClick={() => setShowIosSheet(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-foreground">Instalează pe iPhone</h3>
            <ol className="mt-3 space-y-3 text-sm text-foreground">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span className="flex items-center gap-1">
                  Apasă pe <Share className="inline h-4 w-4" /> (Share) jos în Safari
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span className="flex items-center gap-1">
                  Alege <Plus className="inline h-4 w-4" /> „Add to Home Screen"
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>Apasă „Add" — gata, ai aplicația pe ecran.</span>
              </li>
            </ol>
            <button
              onClick={dismiss}
              className="mt-5 w-full rounded-md bg-primary py-2 text-sm font-bold text-primary-foreground"
            >
              Am înțeles
            </button>
          </div>
        </div>
      )}
    </>
  );
}

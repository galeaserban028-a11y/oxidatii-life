import { useEffect, useState } from "react";
import { Download, X, Share, Plus, Smartphone } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "oxi_install_dismissed_v2";

export function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore iOS
      window.navigator.standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }
    if (localStorage.getItem(DISMISS_KEY)) setHidden(true);

    const ua = window.navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) setPlatform("ios");
    else if (/Android/.test(ua)) setPlatform("android");
    else setPlatform("desktop");

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed || hidden) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
    setSheetOpen(false);
  };

  const handleClick = async () => {
    if (platform === "android" && deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      setHidden(true);
      return;
    }
    setSheetOpen(true);
  };

  return (
    <>
      <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-[hsl(var(--neon-crimson)/0.95)] to-[hsl(var(--neon-amber)/0.9)] text-black shadow-[0_2px_18px_rgba(0,0,0,0.4)]">
        <div className="mx-auto flex max-w-screen-sm items-center gap-2 px-3 py-2">
          <Smartphone className="h-4 w-4 shrink-0" />
          <button
            onClick={handleClick}
            className="flex-1 text-left text-xs font-semibold leading-tight"
          >
            Cum instalezi OXIDAȚII pe telefon →
            <div className="text-[10px] font-normal opacity-80">
              Apasă aici pentru pașii de instalare
            </div>
          </button>
          <button
            onClick={handleClick}
            className="rounded-md bg-black px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-black/80"
          >
            <Download className="mr-1 inline h-3 w-3" />
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

      {sheetOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-base font-bold text-foreground">Instalează OXIDAȚII</h3>
              <button onClick={() => setSheetOpen(false)} className="rounded-md p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            {platform === "ios" && (
              <div className="mt-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">iPhone / iPad</p>
                <ol className="mt-2 space-y-3 text-sm text-foreground">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">1.</span>
                    <span className="flex items-center gap-1 flex-wrap">
                      Deschide în <b>Safari</b> și apasă <Share className="inline h-4 w-4" /> (Share) jos
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">2.</span>
                    <span className="flex items-center gap-1 flex-wrap">
                      Alege <Plus className="inline h-4 w-4" /> „Add to Home Screen"
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">3.</span>
                    <span>Apasă „Add" — gata, ai aplicația pe ecran.</span>
                  </li>
                </ol>
              </div>
            )}

            {platform === "android" && (
              <div className="mt-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Android</p>
                <ol className="mt-2 space-y-3 text-sm text-foreground">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">1.</span>
                    <span>Apasă butonul „Instalează" de sus.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">2.</span>
                    <span>
                      Sau: meniul <b>⋮</b> (Chrome) → „Install app" / „Add to Home screen".
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">3.</span>
                    <span>Confirmă — apare pe ecran ca aplicație normală.</span>
                  </li>
                </ol>
              </div>
            )}

            {platform === "desktop" && (
              <div className="mt-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Desktop</p>
                <p className="mt-2 text-sm text-foreground">
                  Deschide aplicația pe telefon (Android sau iPhone) și o vei putea instala
                  ca app nativă. În Chrome desktop poți apăsa și iconița de instalare din bara
                  de adresă.
                </p>
              </div>
            )}

            <button
              onClick={dismiss}
              className="mt-5 w-full rounded-md bg-primary py-2 text-sm font-bold text-primary-foreground"
            >
              Nu mai arăta
            </button>
          </div>
        </div>
      )}
    </>
  );
}

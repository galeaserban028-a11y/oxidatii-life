import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/bebas-neue/400.css";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow/700.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/800.css";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsent } from "@/components/CookieConsent";
import { AgeGate } from "@/components/AgeGate";
import { DomTranslator } from "@/components/app/DomTranslator";
import "@/lib/i18n";
import { useTranslation } from "react-i18next";


function NotFoundComponent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("pageNotFound")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("lostInChaos")}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const { t } = useTranslation();
  // Întârziem 400ms ca să nu flash-uim "Aplicația a picat" pentru erori tranzitorii
  // de navigare (preload/route swap) care se rezolvă singure.
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShow(true), 400);
    return () => clearTimeout(id);
  }, []);

  if (!show) {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">{t("appCrashed")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("tryAgain")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("retry")}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            {t("home")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#050505" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "format-detection", content: "telephone=no" },
      { title: "OXIDAȚII" },
      { name: "description", content: "Aplicație balcanică de nightlife. Cluburi, șprițuri, MDS-uri, ZEII zilei. Real, multiplayer, peste tot în România." },
      { property: "og:title", content: "OXIDAȚII" },
      { name: "twitter:title", content: "OXIDAȚII" },
      { property: "og:description", content: "Aplicație balcanică de nightlife. Cluburi, șprițuri, MDS-uri, ZEII zilei. Real, multiplayer, peste tot în România." },
      { name: "twitter:description", content: "Aplicație balcanică de nightlife. Cluburi, șprițuri, MDS-uri, ZEII zilei. Real, multiplayer, peste tot în România." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/84jcXRlpV5UmDY7k2qZ9BQoT7s43/social-images/social-1782395072073-3EC3B9AA-8552-4148-AA86-F875B17209B5.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/84jcXRlpV5UmDY7k2qZ9BQoT7s43/social-images/social-1782395072073-3EC3B9AA-8552-4148-AA86-F875B17209B5.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "icon", href: "/icon-192.png", type: "image/png" },
      { rel: "dns-prefetch", href: "https://qzxvnjpumtujfylfofmg.supabase.co" },
      { rel: "preconnect", href: "https://qzxvnjpumtujfylfofmg.supabase.co", crossOrigin: "anonymous" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "OXIDAȚII",
          url: "https://oxidatii.lovable.app",
          logo: "https://oxidatii.lovable.app/icon-512.png",
          description: "Aplicație balcanică de nightlife. Cluburi, șprițuri, MDS-uri, ZEII zilei. Real, multiplayer, peste tot în România.",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    import("@/hooks/useTheme").then((m) => m.initThemeEarly());
    import("@/lib/pwa").then((m) => m.registerAppServiceWorker());
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster />
        <CookieConsent />
        <AgeGate />
        <DomTranslator />
      </AuthProvider>
    </QueryClientProvider>

  );
}


import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Conectare · OXIDAȚII" }] }),
  component: NativeOAuthCallback,
});

const FORWARDED_PARAMS = [
  "access_token",
  "refresh_token",
  "state",
  "error",
  "error_description",
  "code",
] as const;

function NativeOAuthCallback() {
  const [deepLink, setDeepLink] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const forwarded = new URLSearchParams();

    for (const key of FORWARDED_PARAMS) {
      const value = hash.get(key) ?? query.get(key);
      if (value) forwarded.set(key, value);
    }

    if (!forwarded.has("access_token") && !forwarded.has("code") && !forwarded.has("error")) {
      forwarded.set("error", "missing_oauth_response");
      forwarded.set("error_description", "Răspunsul de autentificare este incomplet.");
    }

    const url = `oxidatii://oauth?${forwarded.toString()}`;
    setDeepLink(url);
    window.location.replace(url);
  }, []);

  return (
    <main className="min-h-screen grid place-items-center bg-background text-foreground px-6">
      <div className="max-w-sm text-center space-y-4">
        <h1 className="font-display text-2xl font-black">Revenim în OXIDAȚII…</h1>
        <p className="text-sm text-muted-foreground">
          Dacă aplicația nu se deschide automat, apasă butonul de mai jos.
        </p>
        {deepLink && (
          <a
            href={deepLink}
            className="inline-flex rounded-xl bg-foreground px-5 py-3 font-medium text-background"
          >
            Deschide aplicația
          </a>
        )}
      </div>
    </main>
  );
}

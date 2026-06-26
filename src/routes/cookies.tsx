import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Politica de cookies — OXIDAȚII" },
      { name: "description", content: "Ce cookie-uri folosește OXIDAȚII și cum le poți gestiona." },
      { property: "og:title", content: "Politica de cookies — OXIDAȚII" },
      { property: "og:description", content: "Ce cookie-uri folosim și cum le poți gestiona." },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  const reset = () => {
    try {
      localStorage.removeItem("oxi-cookie-consent-v1");
      localStorage.removeItem("oxi-cookie-consent-v1-at");
    } catch {}
    window.location.reload();
  };

  return (
    <LegalPage title="Politica de cookies" updated="29 mai 2026">
      <p>
        Aplicația OXIDAȚII folosește cookie-uri și tehnologii similare (localStorage,
        sessionStorage) pentru a funcționa și pentru a-ți oferi o experiență mai bună.
      </p>

      <h2>1. Cookie-uri esențiale</h2>
      <p>
        Sunt strict necesare pentru autentificare, sesiune, preferințe de limbă/temă și securitate.
        Nu pot fi dezactivate.
      </p>
      <ul>
        <li>
          <code>sb-*</code> — token de autentificare
        </li>
        <li>
          <code>oxi-cookie-consent-v1</code> — opțiunea ta privind cookie-urile
        </li>
      </ul>

      <h2>2. Cookie-uri funcționale și de analiză</h2>
      <p>
        Folosite doar dacă apeși „Accept toate". Ne ajută să înțelegem cum este folosită aplicația
        și să prevenim erori. Datele sunt agregate și nu te identifică personal.
      </p>

      <h2>3. Cookie-uri de la terți</h2>
      <p>
        Folosim furnizori de infrastructură (Supabase / Lovable Cloud) și hărți (MapLibre + tile-uri
        CARTO) care pot seta cookie-uri tehnice pentru livrarea conținutului. Aceștia nu primesc
        date despre tine în scopuri de marketing.
      </p>

      <h2>4. Cum îți retragi consimțământul</h2>
      <p>
        Poți reseta oricând alegerea ta privind cookie-urile apăsând butonul de mai jos. La
        următoarea încărcare a paginii vei vedea din nou bannerul.
      </p>
      <p>
        <button
          onClick={reset}
          className="mt-2 inline-flex rounded-md border border-foreground/20 px-3 py-2 font-mono text-[10px] uppercase tracking-widest hover:bg-foreground/5"
        >
          Resetează preferințele de cookies
        </button>
      </p>

      <h2>5. Cum dezactivezi cookie-urile din browser</h2>
      <p>
        Poți bloca sau șterge cookie-urile direct din setările browserului (Chrome, Safari, Firefox,
        Edge). Reține că dezactivarea cookie-urilor esențiale poate afecta autentificarea și
        funcționarea aplicației.
      </p>
    </LegalPage>
  );
}

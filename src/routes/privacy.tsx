import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Politica de confidențialitate — OXIDAȚII" },
      { name: "description", content: "Cum colectăm, folosim și protejăm datele tale personale în aplicația OXIDAȚII." },
      { property: "og:title", content: "Politica de confidențialitate — OXIDAȚII" },
      { property: "og:description", content: "Cum colectăm, folosim și protejăm datele tale personale." },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: PrivacyPage,
});

type Lang = "ro" | "en";

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="inline-flex items-center gap-0 rounded-full border border-foreground/15 p-0.5 font-mono text-[10px] uppercase tracking-widest">
      {(["ro", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-3 py-1 rounded-full transition-colors ${
            lang === l ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
          }`}
          aria-pressed={lang === l}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function PrivacyPage() {
  const [lang, setLang] = useState<Lang>("ro");

  const title = lang === "ro" ? "Politica de confidențialitate" : "Privacy Policy";
  const updated = lang === "ro" ? "29 mai 2026" : "May 29, 2026";

  return (
    <LegalPage title={title} updated={updated}>
      <div className="not-prose mb-4 flex justify-end">
        <LangToggle lang={lang} setLang={setLang} />
      </div>
      {lang === "ro" ? <ContentRO /> : <ContentEN />}
    </LegalPage>
  );
}

function ContentRO() {
  return (
    <>
      <p>
        Această politică explică ce date personale colectăm prin aplicația
        OXIDAȚII („Aplicația"), în ce scop, cu cine le împărtășim și care sunt
        drepturile tale conform Regulamentului General privind Protecția
        Datelor (Regulamentul UE 2016/679 — „GDPR") și legislației române
        aplicabile.
      </p>

      <h2>1. Operatorul datelor</h2>
      <p>
        Operatorul datelor cu caracter personal este echipa OXIDAȚII. Ne poți
        contacta oricând la <a href="mailto:privacy@oxidatii.life">privacy@oxidatii.life</a> pentru orice
        întrebare privind prelucrarea datelor tale.
      </p>

      <h2>2. Ce date colectăm</h2>
      <h3>Date de cont</h3>
      <ul>
        <li>adresa de email (la creare cont)</li>
        <li>nume afișat, handle (@) și avatar</li>
        <li>data nașterii (pentru verificarea vârstei de 18+)</li>
      </ul>
      <h3>Conținut postat de tine</h3>
      <ul>
        <li>fotografii, clipuri video și caption-uri postate în feed</li>
        <li>poze cu „dovada de șpriț" (sprit proofs)</li>
        <li>mesaje trimise prin chat și inbox</li>
      </ul>
      <h3>Date de locație</h3>
      <ul>
        <li>locația aproximativă atunci când deschizi harta sau partajezi „live" prezența ta</li>
        <li>orașul / localul asociat cu o postare</li>
      </ul>
      <h3>Date tehnice</h3>
      <ul>
        <li>tip de dispozitiv, browser, sistem de operare</li>
        <li>adresa IP (anonimizată după sesiune)</li>
        <li>jurnale de erori și diagnostic pentru stabilitatea aplicației</li>
      </ul>

      <h2>3. Scopurile și temeiul prelucrării</h2>
      <ul>
        <li><strong>Furnizarea serviciului</strong> — autentificare, postări, chat, hartă. Temei: executarea contractului (art. 6(1)(b) GDPR).</li>
        <li><strong>Verificarea vârstei (18+)</strong> — accesul este permis exclusiv persoanelor majore. Temei: obligație legală și interes legitim.</li>
        <li><strong>Securitate și anti-abuz</strong> — detectarea spam-ului, conținutului ilegal sau a fraudei. Temei: interes legitim (art. 6(1)(f) GDPR).</li>
        <li><strong>Verificare AI a șprițului</strong> — clasificare automată a imaginilor, fără decizii automate cu efecte juridice. Temei: executarea contractului.</li>
        <li><strong>Analiză și îmbunătățire</strong> — statistici anonime de utilizare. Temei: consimțământ sau interes legitim.</li>
      </ul>

      <h2>4. Cui transmitem datele</h2>
      <ul>
        <li>furnizori de infrastructură cloud și bază de date (Supabase / Lovable Cloud)</li>
        <li>furnizori de stocare media pentru pozele și clipurile tale</li>
        <li>furnizori AI pentru clasificarea imaginilor (procesare temporară, fără antrenare pe datele tale)</li>
        <li>autorități, doar la cerere legală întemeiată</li>
      </ul>
      <p>Nu vindem datele tale către terți. Nu folosim datele tale pentru publicitate țintită.</p>

      <h2>5. Cât timp păstrăm datele</h2>
      <ul>
        <li>contul activ — pe durata utilizării; poți cere ștergerea oricând</li>
        <li>cont șters — datele identificabile se șterg în maxim 30 de zile</li>
        <li>jurnale tehnice — maxim 90 de zile</li>
      </ul>

      <h2>6. Drepturile tale</h2>
      <p>Conform GDPR ai următoarele drepturi:</p>
      <ul>
        <li>de acces la datele tale</li>
        <li>de rectificare</li>
        <li>de ștergere („dreptul de a fi uitat")</li>
        <li>de restricționare a prelucrării</li>
        <li>de opoziție</li>
        <li>de portabilitate a datelor</li>
        <li>de a depune plângere la ANSPDCP (<a href="https://www.dataprotection.ro">dataprotection.ro</a>)</li>
      </ul>
      <p>
        Îți poți exercita drepturile scriindu-ne la
        <a href="mailto:privacy@oxidatii.life"> privacy@oxidatii.life</a> sau direct din ecranul „Profil → Setări".
      </p>

      <h2>7. Minori</h2>
      <p>Aplicația este destinată exclusiv persoanelor de peste 18 ani. Conturile create de minori sunt șterse imediat ce sunt identificate.</p>

      <h2>8. Modificări</h2>
      <p>Putem actualiza această politică. Modificările substanțiale vor fi notificate în aplicație cu cel puțin 14 zile înainte de intrarea în vigoare.</p>
    </>
  );
}

function ContentEN() {
  return (
    <>
      <p>
        This policy explains what personal data we collect through the OXIDAȚII
        app (the "App"), for what purpose, with whom we share it, and your
        rights under the EU General Data Protection Regulation (Regulation EU
        2016/679 — "GDPR") and applicable Romanian law.
      </p>

      <h2>1. Data controller</h2>
      <p>
        The data controller is the OXIDAȚII team. You can contact us anytime at
        <a href="mailto:privacy@oxidatii.life"> privacy@oxidatii.life</a> for any question regarding the processing of your data.
      </p>

      <h2>2. Data we collect</h2>
      <h3>Account data</h3>
      <ul>
        <li>email address (at account creation)</li>
        <li>display name, handle (@) and avatar</li>
        <li>date of birth (for 18+ age verification)</li>
      </ul>
      <h3>Content you post</h3>
      <ul>
        <li>photos, videos and captions posted to the feed</li>
        <li>"spritz proof" pictures</li>
        <li>messages sent via chat and inbox</li>
      </ul>
      <h3>Location data</h3>
      <ul>
        <li>approximate location when you open the map or share your live presence</li>
        <li>city / venue associated with a post</li>
      </ul>
      <h3>Technical data</h3>
      <ul>
        <li>device type, browser, operating system</li>
        <li>IP address (anonymized after the session)</li>
        <li>error and diagnostic logs for app stability</li>
      </ul>

      <h2>3. Purposes and legal basis</h2>
      <ul>
        <li><strong>Providing the service</strong> — authentication, posting, chat, map. Basis: contract performance (art. 6(1)(b) GDPR).</li>
        <li><strong>Age verification (18+)</strong> — access is restricted to adults. Basis: legal obligation and legitimate interest.</li>
        <li><strong>Security and anti-abuse</strong> — detection of spam, illegal content, fraud. Basis: legitimate interest (art. 6(1)(f) GDPR).</li>
        <li><strong>AI spritz verification</strong> — automated image classification, no legal-effect automated decisions. Basis: contract performance.</li>
        <li><strong>Analytics and improvement</strong> — anonymous usage statistics. Basis: consent or legitimate interest.</li>
      </ul>

      <h2>4. Who we share data with</h2>
      <ul>
        <li>cloud infrastructure and database providers (Supabase / Lovable Cloud)</li>
        <li>media storage providers for your photos and videos</li>
        <li>AI providers for image classification (temporary processing, no training on your data)</li>
        <li>authorities, only upon valid legal request</li>
      </ul>
      <p>We do not sell your data to third parties. We do not use your data for targeted advertising.</p>

      <h2>5. Retention</h2>
      <ul>
        <li>active account — for the duration of use; you can request deletion at any time</li>
        <li>deleted account — identifiable data deleted within 30 days</li>
        <li>technical logs — up to 90 days</li>
      </ul>

      <h2>6. Your rights</h2>
      <p>Under GDPR you have the following rights:</p>
      <ul>
        <li>access to your data</li>
        <li>rectification</li>
        <li>erasure ("right to be forgotten")</li>
        <li>restriction of processing</li>
        <li>objection</li>
        <li>data portability</li>
        <li>to lodge a complaint with the Romanian DPA (ANSPDCP, <a href="https://www.dataprotection.ro">dataprotection.ro</a>)</li>
      </ul>
      <p>
        You can exercise your rights by writing to
        <a href="mailto:privacy@oxidatii.life"> privacy@oxidatii.life</a> or directly from the "Profile → Settings" screen.
      </p>

      <h2>7. Minors</h2>
      <p>The app is intended exclusively for users over 18. Accounts created by minors are deleted as soon as they are identified.</p>

      <h2>8. Changes</h2>
      <p>We may update this policy. Material changes will be notified in-app at least 14 days before they take effect.</p>
    </>
  );
}

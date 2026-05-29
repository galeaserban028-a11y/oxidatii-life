import { createFileRoute } from "@tanstack/react-router";
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

function PrivacyPage() {
  return (
    <LegalPage title="Politica de confidențialitate" updated="29 mai 2026">
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
        contacta oricând la <a href="mailto:privacy@oxidatii.app">privacy@oxidatii.app</a> pentru orice
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
        <li>
          <strong>Furnizarea serviciului</strong> — autentificare, postări,
          chat, hartă. Temei: executarea contractului dintre tine și OXIDAȚII
          (art. 6(1)(b) GDPR).
        </li>
        <li>
          <strong>Verificarea vârstei (18+)</strong> — accesul este permis
          exclusiv persoanelor majore. Temei: obligație legală și interes
          legitim.
        </li>
        <li>
          <strong>Securitate și anti-abuz</strong> — detectarea spam-ului,
          conținutului ilegal sau a fraudei. Temei: interes legitim (art.
          6(1)(f) GDPR).
        </li>
        <li>
          <strong>Verificare AI a șprițului</strong> — clasificare automată a
          imaginilor încărcate, fără decizii automate cu efecte juridice.
          Temei: executarea contractului.
        </li>
        <li>
          <strong>Analiză și îmbunătățire</strong> — statistici anonime de
          utilizare. Temei: consimțământ (banner de cookies) sau interes
          legitim.
        </li>
      </ul>

      <h2>4. Cui transmitem datele</h2>
      <ul>
        <li>furnizori de infrastructură cloud și bază de date (Supabase / Lovable Cloud)</li>
        <li>furnizori de stocare media pentru pozele și clipurile tale</li>
        <li>furnizori AI pentru clasificarea imaginilor (procesare temporară, fără antrenare pe datele tale)</li>
        <li>autorități, doar la cerere legală întemeiată</li>
      </ul>
      <p>
        Nu vindem datele tale către terți. Nu folosim datele tale pentru
        publicitate țintită.
      </p>

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
        <li>de a depune plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP, <a href="https://www.dataprotection.ro">dataprotection.ro</a>)</li>
      </ul>
      <p>
        Îți poți exercita drepturile scriindu-ne la
        <a href="mailto:privacy@oxidatii.app"> privacy@oxidatii.app</a> sau direct din ecranul „Profil → Setări" din aplicație.
      </p>

      <h2>7. Minori</h2>
      <p>
        Aplicația este destinată exclusiv persoanelor de peste 18 ani.
        Conturile create de minori sunt șterse imediat ce sunt identificate.
      </p>

      <h2>8. Modificări</h2>
      <p>
        Putem actualiza această politică. Modificările substanțiale vor fi
        notificate în aplicație cu cel puțin 14 zile înainte de intrarea în
        vigoare.
      </p>
    </LegalPage>
  );
}

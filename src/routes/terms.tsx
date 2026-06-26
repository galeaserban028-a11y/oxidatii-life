import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Termeni și condiții — OXIDAȚII" },
      {
        name: "description",
        content: "Termenii și condițiile de utilizare a aplicației OXIDAȚII.",
      },
      { property: "og:title", content: "Termeni și condiții — OXIDAȚII" },
      { property: "og:description", content: "Regulile de folosire a aplicației OXIDAȚII." },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Termeni și condiții" updated="29 mai 2026">
      <p>
        Bine ai venit pe OXIDAȚII. Folosind aplicația, ești de acord cu acești termeni. Te rugăm să
        îi citești cu atenție.
      </p>

      <h2>1. Cine poate folosi aplicația</h2>
      <ul>
        <li>trebuie să ai cel puțin 18 ani împliniți</li>
        <li>trebuie să furnizezi date reale la crearea contului</li>
        <li>nu poți crea conturi multiple sau te poți da drept altă persoană</li>
      </ul>

      <h2>2. Conținutul pe care îl postezi</h2>
      <p>
        Tu rămâi proprietarul conținutului (foto, video, text) pe care îl postezi. Ne acorzi o
        licență neexclusivă, gratuită și mondială pentru a-l afișa, redistribui și modera în cadrul
        aplicației, strict pentru funcționarea serviciului.
      </p>
      <p>Garantezi că ai dreptul să postezi conținutul și că acesta:</p>
      <ul>
        <li>nu încalcă drepturile altor persoane (imagine, autor, marcă)</li>
        <li>nu conține imagini cu minori în context de alcool sau nightlife</li>
        <li>nu promovează violență, ură, discriminare sau substanțe interzise</li>
        <li>nu este spam, înșelăciune sau conținut sexual neconsensual</li>
      </ul>

      <h2>3. Reguli de comportament</h2>
      <ul>
        <li>fără hărțuire, amenințări sau insulte la adresa altor utilizatori</li>
        <li>fără postări care încurajează condusul sub influența alcoolului</li>
        <li>fără folosirea aplicației pentru activități ilegale</li>
        <li>fără tentative de a accesa contul altcuiva sau de a sparge infrastructura</li>
      </ul>
      <p>
        Putem suspenda sau șterge orice cont care încalcă aceste reguli, fără notificare prealabilă
        și fără rambursare.
      </p>

      <h2>4. Consumul responsabil de alcool</h2>
      <p>
        OXIDAȚII este o aplicație despre cultura nightlife-ului. Promovăm consumul responsabil. Nu
        conduce dacă ai băut. Cunoaște-ți limitele. Dacă crezi că tu sau cineva apropiat are o
        problemă cu alcoolul, contactează Alcoolicii Anonimi România (
        <a href="https://www.aa-romania.ro">aa-romania.ro</a>).
      </p>

      <h2>5. Verificare AI și moderare</h2>
      <p>
        Anumite postări (ex. „proof de șpriț") sunt verificate automat de un sistem AI. Verificarea
        este o estimare, nu o garanție. Putem reverifica sau șterge manual orice postare suspectă.
      </p>

      <h2>6. Disponibilitatea serviciului</h2>
      <p>
        Aplicația este furnizată „ca atare", fără garanții de disponibilitate neîntreruptă. Putem
        face mentenanță, schimbări de funcționalități sau putem opri serviciul cu o notificare
        rezonabilă.
      </p>

      <h2>7. Limitarea răspunderii</h2>
      <p>În limita maximă permisă de lege, OXIDAȚII nu răspunde pentru:</p>
      <ul>
        <li>conținutul postat de alți utilizatori</li>
        <li>întâlnirile sau interacțiunile dintre utilizatori în afara aplicației</li>
        <li>pierderi indirecte sau de profit decurgând din folosirea aplicației</li>
      </ul>

      <h2>8. Ștergerea contului</h2>
      <p>
        Poți șterge contul oricând din „Profil → Setări". Datele vor fi eliminate conform Politicii
        de confidențialitate.
      </p>

      <h2>9. Modificări</h2>
      <p>
        Putem modifica acești termeni. Vei fi notificat în aplicație cu cel puțin 14 zile înainte ca
        modificările să intre în vigoare. Continuarea utilizării după acea dată înseamnă acceptarea
        noilor termeni.
      </p>

      <h2>10. Lege aplicabilă</h2>
      <p>
        Acești termeni sunt guvernați de legea română. Orice litigiu va fi soluționat de instanțele
        competente din România, după o încercare prealabilă de mediere.
      </p>
    </LegalPage>
  );
}

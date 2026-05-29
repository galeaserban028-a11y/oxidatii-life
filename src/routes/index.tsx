import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/oxidatii/Nav";
import { Hero } from "@/components/oxidatii/Hero";
import { HowItWorks } from "@/components/oxidatii/HowItWorks";
import { AddSpot, FindOxidati } from "@/components/oxidatii/AddSpot";
import { CitiesPreview } from "@/components/oxidatii/CitiesPreview";
import { Ranks } from "@/components/oxidatii/Ranks";
import { CTA, Footer } from "@/components/oxidatii/CTA";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OXIDAȚII — Unde se bea șpriț acum în România" },
      { name: "description", content: "Adaugă locul tău de șpriț. Găsește-ți oxidații. Urci în top. Pitești, București, Cluj, Iași, Timișoara, Constanța — orașul tău e viu acum." },
      { property: "og:title", content: "OXIDAȚII — Din lord al semințelor în Dumnezeul oxidaților." },
      { property: "og:description", content: "Aplicația care-ți spune unde se bea șpriț acum, cu cine, și cine e rege la masă." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative">
      <Nav />
      <Hero />
      <AddSpot />
      <FindOxidati />
      <section id="cum-merge"><HowItWorks /></section>
      <CitiesPreview />
      <Ranks />
      <CTA />
      <Footer />
    </main>
  );
}

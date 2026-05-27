import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/oxidatii/Nav";
import { Hero } from "@/components/oxidatii/Hero";
import { HowItWorks } from "@/components/oxidatii/HowItWorks";
import { CitiesPreview } from "@/components/oxidatii/CitiesPreview";
import { Haite } from "@/components/oxidatii/Haite";
import { Ranks } from "@/components/oxidatii/Ranks";
import { CTA, Footer } from "@/components/oxidatii/CTA";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OXIDAȚII — Internetul real al nopții din România" },
      { name: "description", content: "Toate cluburile, toate străzile, toate haitele. Pitești, București, Cluj, Iași, Timișoara, Constanța. Postezi, urci, devii ZEU' BALCANIC." },
      { property: "og:title", content: "OXIDAȚII — Orașul tău e viu acum." },
      { property: "og:description", content: "Cluburi reale, străzi reale, haite reale. Internetul nopții din România." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative">
      <Nav />
      <Hero />
      <HowItWorks />
      <CitiesPreview />
      <Haite />
      <Ranks />
      <CTA />
      <Footer />
    </main>
  );
}

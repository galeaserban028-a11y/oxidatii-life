import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/oxidatii/Nav";
import { Hero } from "@/components/oxidatii/Hero";
import { HowItWorks } from "@/components/oxidatii/HowItWorks";
import { CitiesPreview } from "@/components/oxidatii/CitiesPreview";
import { Ranks } from "@/components/oxidatii/Ranks";
import { CTA, Footer } from "@/components/oxidatii/CTA";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OXIDAȚII — Orașul e live." },
      { name: "description", content: "Harta reală a vieții de noapte din România. Toate cluburile, toate străzile, toți oamenii. Scanezi șprițul, urci în top." },
      { property: "og:title", content: "OXIDAȚII — Orașul e live." },
      { property: "og:description", content: "Cluburi reale, străzi reale. Cine bea cel mai mult cu dovadă devine ZEU' BALCANIC." },
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
      <Ranks />
      <CTA />
      <Footer />
    </main>
  );
}

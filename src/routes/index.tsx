import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/oxidatii/Nav";
import { Hero } from "@/components/oxidatii/Hero";
import { Marquee } from "@/components/oxidatii/Marquee";
import { CityMap } from "@/components/oxidatii/CityMap";
import { ChaosEngine } from "@/components/oxidatii/ChaosEngine";
import { Squads } from "@/components/oxidatii/Squads";
import { Aura } from "@/components/oxidatii/Aura";
import { NightPass } from "@/components/oxidatii/NightPass";
import { LiveChaos } from "@/components/oxidatii/LiveChaos";
import { SpritKing } from "@/components/oxidatii/SpritKing";
import { CTA, Footer } from "@/components/oxidatii/CTA";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OXIDAȚII — The city is alive." },
      { name: "description", content: "AI-powered real-life social entertainment platform. Cities become maps, parties become events, people become players. Noaptea începe aici." },
      { property: "og:title", content: "OXIDAȚII — The city is alive." },
      { property: "og:description", content: "Real life, but multiplayer. Join the first true social nightlife metaverse." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative">
      <Nav />
      <Hero />
      <Marquee />
      <CityMap />
        <SpritKing />
        <LiveChaos />
        <ChaosEngine />
        <Squads />
      <Aura />
      <NightPass />
      <CTA />
      <Footer />
    </main>
  );
}

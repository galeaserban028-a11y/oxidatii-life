import { generateObject } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export type NightStats = {
  check_ins: number;
  photos: number;
  likes_received: number;
  friends_present: number;
  parties_joined: number;
  ratings_received: number;
  top_venue_name: string | null;
  peak_hour: number | null;
  venues_visited: number;
};

export type NightWrapAI = {
  title: string;
  tagline: string;
  vibe_emoji: string;
};

// Bucharest "night window": 18:00 of night_date until 06:00 of the next day.
export function nightWindow(nightDate: string): { from: string; to: string } {
  const start = new Date(`${nightDate}T18:00:00+02:00`);
  const end = new Date(start.getTime() + 12 * 60 * 60 * 1000);
  return { from: start.toISOString(), to: end.toISOString() };
}

// Previous night ends at 06:00 today (Bucharest). If now < 06:00 we still want yesterday.
export function previousNightDate(now: Date = new Date()): string {
  const localHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Bucharest",
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );
  const baseDate = new Date(now);
  // If it's before 6 AM local, "previous night" means the night that started 2 days ago? No - night that started yesterday.
  // Simplification: night_date = the date when the evening began (18:00 of that day).
  // If now is after 06:00, previous night started yesterday. If before 06:00, also yesterday.
  baseDate.setUTCDate(baseDate.getUTCDate() - 1);
  void localHour;
  return baseDate.toISOString().slice(0, 10);
}

export async function generateAITitle(stats: NightStats): Promise<NightWrapAI> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    return fallbackTitle(stats);
  }
  try {
    const gateway = createLovableAiGatewayProvider(key);
    const { object } = await generateObject({
      model: gateway("google/gemini-3-flash-preview"),
      schema: z.object({
        title: z.string().min(3).max(40),
        tagline: z.string().min(3).max(60),
        vibe_emoji: z.string().min(1).max(4),
      }),
      system:
        "Ești copywriter pentru OXIDAȚII, o app de nightlife românească. Generezi titluri scurte și mișto pentru rezumatul nopții unui user. Stil: română colocvială, energie de bairam, fără clișee, fără emoji în titlu/tagline. Maxim 4 cuvinte titlu, maxim 8 cuvinte tagline. Folosește numele localului dacă e dat.",
      prompt: `Stats noapte: ${JSON.stringify(stats)}. Generează titlu, tagline (rezumat scurt) și un singur emoji pentru vibe.`,
    });
    return object;
  } catch (e) {
    console.error("[night-wrap] AI failed, using fallback", e);
    return fallbackTitle(stats);
  }
}

function fallbackTitle(stats: NightStats): NightWrapAI {
  const venue = stats.top_venue_name;
  if (stats.check_ins >= 3) {
    return {
      title: "Hoinar prin noapte",
      tagline: `${stats.check_ins} locuri, 0 regrete`,
      vibe_emoji: "🌃",
    };
  }
  if (venue) {
    return {
      title: `Rege la ${venue.slice(0, 18)}`,
      tagline: `${stats.likes_received} like-uri primite`,
      vibe_emoji: "👑",
    };
  }
  return {
    title: "Noapte de oxidat",
    tagline: `${stats.photos} faze prinse`,
    vibe_emoji: "🔥",
  };
}

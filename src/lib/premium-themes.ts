// 5 preset profile themes (VIP+ and above)
export type ProfileTheme = {
  id: string;
  name: string;
  description: string;
  // tailwind/oklch background for the header card
  cardBg: string;
  cardBorder: string;
  accent: string; // text accent
};

export const PROFILE_THEMES: ProfileTheme[] = [
  {
    id: "neon",
    name: "Neon",
    description: "Crimson → purple, mood de club",
    cardBg: "linear-gradient(135deg, oklch(0.32 0.15 15 / 0.55), oklch(0.28 0.18 305 / 0.55))",
    cardBorder: "oklch(0.78 0.18 305 / 0.45)",
    accent: "oklch(0.85 0.18 15)",
  },
  {
    id: "gold",
    name: "Gold",
    description: "Auriu cald, opulent",
    cardBg: "linear-gradient(135deg, oklch(0.28 0.06 80 / 0.6), oklch(0.22 0.04 60 / 0.6))",
    cardBorder: "oklch(0.82 0.14 80 / 0.55)",
    accent: "oklch(0.88 0.14 80)",
  },
  {
    id: "ice",
    name: "Ice",
    description: "Albastru rece, glacier",
    cardBg: "linear-gradient(135deg, oklch(0.30 0.06 220 / 0.55), oklch(0.25 0.05 200 / 0.55))",
    cardBorder: "oklch(0.82 0.10 210 / 0.5)",
    accent: "oklch(0.88 0.10 210)",
  },
  {
    id: "vintage",
    name: "Vintage",
    description: "Sepia/grano, fotografie veche",
    cardBg: "linear-gradient(135deg, oklch(0.30 0.05 50 / 0.6), oklch(0.20 0.03 30 / 0.6))",
    cardBorder: "oklch(0.75 0.08 50 / 0.5)",
    accent: "oklch(0.82 0.10 60)",
  },
  {
    id: "matrix",
    name: "Matrix",
    description: "Verde terminal, cyberpunk",
    cardBg: "linear-gradient(135deg, oklch(0.22 0.10 140 / 0.65), oklch(0.18 0.08 160 / 0.65))",
    cardBorder: "oklch(0.80 0.18 145 / 0.55)",
    accent: "oklch(0.88 0.20 145)",
  },
];

export function getTheme(id: string | null | undefined): ProfileTheme | null {
  if (!id) return null;
  return PROFILE_THEMES.find(t => t.id === id) ?? null;
}

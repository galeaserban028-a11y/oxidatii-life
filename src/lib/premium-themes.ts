// Premium profile themes (VIP+ and above)
// Each theme defines a full premium atmosphere: base gradient, aurora halos,
// optional sheen, grain intensity and vignette — composable on /app/me.

export type ProfileTheme = {
  id: string;
  name: string;
  description: string;
  tier: "vip_plus" | "pro" | "elite";

  // Header card surface (used on /app/user/:id card)
  cardBg: string;
  cardBorder: string;
  accent: string;

  // Premium atmosphere (used on /app/me)
  base: string;                 // full-page base gradient
  aurora: Array<{               // radial color blooms
    color: string;
    pos: string;                // CSS position e.g. "-10% -20%"
    size: number;               // px
    blur: number;               // px
    opacity: number;            // 0..1
    duration: number;           // s for pulse
    delay?: number;             // s
  }>;
  sheen?: { color: string; opacity: number; duration: number } | null;
  grain: number;                // 0..0.2
  vignette: string;             // CSS gradient for top vignette
};

export const PROFILE_THEMES: ProfileTheme[] = [
  {
    id: "neon",
    name: "Neon",
    description: "Crimson → purple, mood de club",
    tier: "vip_plus",
    cardBg: "linear-gradient(135deg, oklch(0.32 0.15 15 / 0.55), oklch(0.28 0.18 305 / 0.55))",
    cardBorder: "oklch(0.78 0.18 305 / 0.45)",
    accent: "oklch(0.85 0.18 15)",
    base: "radial-gradient(120% 80% at 20% 0%, oklch(0.32 0.18 15 / 0.55), transparent 60%), radial-gradient(120% 80% at 80% 100%, oklch(0.28 0.20 305 / 0.55), transparent 60%), #050505",
    aurora: [
      { color: "oklch(0.78 0.20 15)", pos: "-10% -10%", size: 460, blur: 100, opacity: 0.55, duration: 7 },
      { color: "oklch(0.72 0.22 305)", pos: "85% 45%", size: 380, blur: 110, opacity: 0.5, duration: 9, delay: 1.5 },
    ],
    sheen: { color: "oklch(0.85 0.18 15)", opacity: 0.35, duration: 10 },
    grain: 0.07,
    vignette: "linear-gradient(to bottom, oklch(0 0 0 / 0.55), transparent)",
  },
  {
    id: "gold",
    name: "Gold",
    description: "Auriu cald, opulent",
    tier: "vip_plus",
    cardBg: "linear-gradient(135deg, oklch(0.28 0.06 80 / 0.6), oklch(0.22 0.04 60 / 0.6))",
    cardBorder: "oklch(0.82 0.14 80 / 0.55)",
    accent: "oklch(0.88 0.14 80)",
    base: "radial-gradient(120% 80% at 30% 0%, oklch(0.30 0.08 80 / 0.65), transparent 60%), #0a0805",
    aurora: [
      { color: "oklch(0.85 0.16 85)", pos: "-15% -15%", size: 420, blur: 90, opacity: 0.5, duration: 8 },
      { color: "oklch(0.78 0.12 50)", pos: "80% 60%", size: 360, blur: 100, opacity: 0.45, duration: 10, delay: 2 },
    ],
    sheen: { color: "oklch(0.92 0.10 80)", opacity: 0.3, duration: 12 },
    grain: 0.05,
    vignette: "linear-gradient(to bottom, oklch(0 0 0 / 0.5), transparent)",
  },
  {
    id: "ice",
    name: "Ice",
    description: "Albastru rece, glacier",
    tier: "vip_plus",
    cardBg: "linear-gradient(135deg, oklch(0.30 0.06 220 / 0.55), oklch(0.25 0.05 200 / 0.55))",
    cardBorder: "oklch(0.82 0.10 210 / 0.5)",
    accent: "oklch(0.88 0.10 210)",
    base: "radial-gradient(120% 80% at 50% 0%, oklch(0.32 0.08 220 / 0.55), transparent 60%), #05080a",
    aurora: [
      { color: "oklch(0.85 0.12 220)", pos: "-10% -10%", size: 460, blur: 110, opacity: 0.55, duration: 9 },
      { color: "oklch(0.80 0.10 195)", pos: "75% 55%", size: 340, blur: 90, opacity: 0.4, duration: 11, delay: 2 },
    ],
    sheen: { color: "oklch(0.92 0.06 215)", opacity: 0.35, duration: 11 },
    grain: 0.04,
    vignette: "linear-gradient(to bottom, oklch(0 0 0 / 0.55), transparent)",
  },
  {
    id: "vintage",
    name: "Vintage",
    description: "Sepia/grano, fotografie veche",
    tier: "vip_plus",
    cardBg: "linear-gradient(135deg, oklch(0.30 0.05 50 / 0.6), oklch(0.20 0.03 30 / 0.6))",
    cardBorder: "oklch(0.75 0.08 50 / 0.5)",
    accent: "oklch(0.82 0.10 60)",
    base: "radial-gradient(120% 80% at 40% 10%, oklch(0.28 0.05 50 / 0.6), transparent 65%), #0a0805",
    aurora: [
      { color: "oklch(0.78 0.10 60)", pos: "-5% 5%", size: 380, blur: 100, opacity: 0.4, duration: 12 },
      { color: "oklch(0.65 0.08 30)", pos: "80% 70%", size: 320, blur: 95, opacity: 0.35, duration: 14, delay: 2.5 },
    ],
    sheen: null,
    grain: 0.16,
    vignette: "radial-gradient(80% 60% at 50% 0%, transparent, oklch(0 0 0 / 0.55))",
  },
  {
    id: "matrix",
    name: "Matrix",
    description: "Verde terminal, cyberpunk",
    tier: "vip_plus",
    cardBg: "linear-gradient(135deg, oklch(0.22 0.10 140 / 0.65), oklch(0.18 0.08 160 / 0.65))",
    cardBorder: "oklch(0.80 0.18 145 / 0.55)",
    accent: "oklch(0.88 0.20 145)",
    base: "radial-gradient(120% 80% at 50% 0%, oklch(0.25 0.10 145 / 0.6), transparent 60%), #040705",
    aurora: [
      { color: "oklch(0.82 0.22 145)", pos: "-10% -10%", size: 420, blur: 95, opacity: 0.55, duration: 6 },
      { color: "oklch(0.70 0.18 160)", pos: "80% 60%", size: 360, blur: 100, opacity: 0.45, duration: 8, delay: 1 },
    ],
    sheen: { color: "oklch(0.88 0.20 145)", opacity: 0.4, duration: 7 },
    grain: 0.09,
    vignette: "linear-gradient(to bottom, oklch(0 0 0 / 0.55), transparent)",
  },

  // ===== Ultra-premium (Pro+) =====
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Negru lichid cu reflexe albastre",
    tier: "pro",
    cardBg: "linear-gradient(135deg, oklch(0.18 0.04 260 / 0.7), oklch(0.12 0.03 240 / 0.7))",
    cardBorder: "oklch(0.70 0.18 260 / 0.5)",
    accent: "oklch(0.78 0.20 260)",
    base: "radial-gradient(140% 90% at 50% 100%, oklch(0.20 0.08 260 / 0.7), transparent 60%), #030308",
    aurora: [
      { color: "oklch(0.75 0.22 265)", pos: "10% 80%", size: 520, blur: 130, opacity: 0.6, duration: 10 },
      { color: "oklch(0.70 0.18 290)", pos: "80% 20%", size: 420, blur: 120, opacity: 0.5, duration: 12, delay: 2 },
      { color: "oklch(0.82 0.14 215)", pos: "50% 50%", size: 280, blur: 110, opacity: 0.35, duration: 14, delay: 1 },
    ],
    sheen: { color: "oklch(0.80 0.18 260)", opacity: 0.45, duration: 11 },
    grain: 0.05,
    vignette: "radial-gradient(80% 60% at 50% 0%, transparent, oklch(0 0 0 / 0.7))",
  },
  {
    id: "rosegold",
    name: "Rose Gold",
    description: "Roz metalic & cupru, ultra-feminin",
    tier: "pro",
    cardBg: "linear-gradient(135deg, oklch(0.30 0.10 25 / 0.65), oklch(0.24 0.08 15 / 0.65))",
    cardBorder: "oklch(0.85 0.12 25 / 0.55)",
    accent: "oklch(0.88 0.14 25)",
    base: "radial-gradient(120% 80% at 0% 0%, oklch(0.32 0.12 25 / 0.65), transparent 60%), radial-gradient(120% 80% at 100% 100%, oklch(0.28 0.10 50 / 0.55), transparent 60%), #0a0606",
    aurora: [
      { color: "oklch(0.85 0.14 25)", pos: "-15% -10%", size: 480, blur: 110, opacity: 0.6, duration: 9 },
      { color: "oklch(0.80 0.12 50)", pos: "85% 80%", size: 400, blur: 120, opacity: 0.5, duration: 11, delay: 1.5 },
    ],
    sheen: { color: "oklch(0.92 0.12 25)", opacity: 0.4, duration: 10 },
    grain: 0.06,
    vignette: "linear-gradient(to bottom, oklch(0 0 0 / 0.5), transparent)",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Bleumarin profund cu stele",
    tier: "pro",
    cardBg: "linear-gradient(135deg, oklch(0.18 0.06 250 / 0.7), oklch(0.14 0.05 230 / 0.7))",
    cardBorder: "oklch(0.75 0.14 250 / 0.5)",
    accent: "oklch(0.85 0.12 230)",
    base: "radial-gradient(140% 90% at 50% 0%, oklch(0.22 0.10 250 / 0.7), transparent 60%), #030510",
    aurora: [
      { color: "oklch(0.78 0.14 230)", pos: "-10% -10%", size: 460, blur: 110, opacity: 0.55, duration: 11 },
      { color: "oklch(0.70 0.12 270)", pos: "80% 70%", size: 360, blur: 100, opacity: 0.45, duration: 13, delay: 2 },
    ],
    sheen: { color: "oklch(0.88 0.10 230)", opacity: 0.3, duration: 14 },
    grain: 0.04,
    vignette: "linear-gradient(to bottom, oklch(0 0 0 / 0.6), transparent 40%)",
  },

  // ===== Couture (Elite) =====
  {
    id: "aurora",
    name: "Aurora",
    description: "Aurora boreală, lumini vii",
    tier: "elite",
    cardBg: "linear-gradient(135deg, oklch(0.22 0.12 180 / 0.6), oklch(0.20 0.14 280 / 0.6))",
    cardBorder: "oklch(0.85 0.18 180 / 0.55)",
    accent: "oklch(0.88 0.20 180)",
    base: "radial-gradient(120% 80% at 0% 0%, oklch(0.25 0.14 180 / 0.65), transparent 60%), radial-gradient(120% 80% at 100% 100%, oklch(0.22 0.16 305 / 0.65), transparent 60%), #04060a",
    aurora: [
      { color: "oklch(0.82 0.22 180)", pos: "-10% 20%", size: 520, blur: 120, opacity: 0.6, duration: 8 },
      { color: "oklch(0.75 0.24 305)", pos: "75% 70%", size: 440, blur: 110, opacity: 0.55, duration: 10, delay: 1.5 },
      { color: "oklch(0.80 0.20 145)", pos: "50% 0%", size: 360, blur: 130, opacity: 0.45, duration: 12, delay: 0.8 },
    ],
    sheen: { color: "oklch(0.90 0.18 180)", opacity: 0.45, duration: 9 },
    grain: 0.05,
    vignette: "linear-gradient(to bottom, oklch(0 0 0 / 0.5), transparent)",
  },
  {
    id: "couture",
    name: "Couture",
    description: "Negru de catifea cu fir auriu",
    tier: "elite",
    cardBg: "linear-gradient(135deg, oklch(0.16 0.02 30 / 0.75), oklch(0.10 0.02 20 / 0.75))",
    cardBorder: "oklch(0.82 0.14 80 / 0.6)",
    accent: "oklch(0.88 0.14 80)",
    base: "radial-gradient(140% 90% at 50% 100%, oklch(0.18 0.04 60 / 0.7), transparent 60%), #050403",
    aurora: [
      { color: "oklch(0.85 0.14 80)", pos: "-5% -5%", size: 420, blur: 110, opacity: 0.5, duration: 12 },
      { color: "oklch(0.78 0.10 40)", pos: "80% 75%", size: 360, blur: 120, opacity: 0.4, duration: 14, delay: 2 },
    ],
    sheen: { color: "oklch(0.95 0.10 85)", opacity: 0.5, duration: 8 },
    grain: 0.08,
    vignette: "radial-gradient(80% 60% at 50% 0%, transparent, oklch(0 0 0 / 0.7))",
  },
  {
    id: "phantom",
    name: "Phantom",
    description: "Negru pur cu o singură rază magenta",
    tier: "elite",
    cardBg: "linear-gradient(135deg, oklch(0.12 0.06 330 / 0.75), oklch(0.10 0.02 0 / 0.75))",
    cardBorder: "oklch(0.78 0.22 330 / 0.55)",
    accent: "oklch(0.82 0.24 330)",
    base: "radial-gradient(120% 80% at 80% 0%, oklch(0.22 0.16 330 / 0.65), transparent 55%), #030303",
    aurora: [
      { color: "oklch(0.80 0.26 330)", pos: "80% -10%", size: 540, blur: 130, opacity: 0.65, duration: 9 },
      { color: "oklch(0.70 0.20 350)", pos: "20% 80%", size: 360, blur: 110, opacity: 0.4, duration: 12, delay: 2 },
    ],
    sheen: { color: "oklch(0.88 0.24 330)", opacity: 0.4, duration: 11 },
    grain: 0.06,
    vignette: "radial-gradient(80% 60% at 50% 0%, transparent, oklch(0 0 0 / 0.75))",
  },
];

// ===== Lookup + precomputed render cache =====

const themeById = new Map<string, ProfileTheme>(PROFILE_THEMES.map(t => [t.id, t]));

export function getTheme(id: string | null | undefined): ProfileTheme | null {
  if (!id) return null;
  return themeById.get(id) ?? null;
}

export function isThemeAvailable(theme: ProfileTheme, tier: string | null | undefined): boolean {
  const order = ["vip_plus", "pro", "elite"];
  const u = order.indexOf((tier ?? "") as string);
  const t = order.indexOf(theme.tier);
  return u >= 0 && u >= t;
}

export type PrecomputedAuroraLayer = {
  left: string; top: string; size: number; blur: number; opacity: number;
  background: string; duration: number; delay: number;
};

export type PrecomputedOrb = {
  left: string; top: string; size: number;
  background: string; boxShadow: string; opacity: number; duration: number; delay: number;
};

export type PrecomputedTheme = {
  id: string;
  base: string;
  beamsGradient: string;
  aurora: PrecomputedAuroraLayer[];
  orbs: PrecomputedOrb[];
  sheenGradient: string | null;
  sheenDuration: number;
  sheenOpacity: number;
  scanGradient: string;
  vignette: string;
  grain: number;
};

const precomputeCache = new Map<string, PrecomputedTheme>();

export function precomputeTheme(theme: ProfileTheme): PrecomputedTheme {
  const cached = precomputeCache.get(theme.id);
  if (cached) return cached;

  const aurora: PrecomputedAuroraLayer[] = theme.aurora.map(a => {
    const [left, top] = a.pos.split(" ");
    return {
      left, top,
      size: a.size,
      blur: a.blur,
      opacity: a.opacity,
      background: `radial-gradient(circle, ${a.color} 0%, transparent 70%)`,
      duration: a.duration,
      delay: a.delay ?? 0,
    };
  });

  const orbs: PrecomputedOrb[] = [0, 1, 2, 3].map(i => ({
    left: `${12 + i * 22}%`,
    top: `${18 + ((i * 37) % 64)}%`,
    size: 6 + (i % 3) * 4,
    background: i % 2 === 0 ? theme.accent : theme.cardBorder,
    boxShadow: `0 0 ${18 + i * 6}px ${theme.accent}`,
    opacity: 0.32,
    duration: 9 + i * 2,
    delay: i * 0.8,
  }));

  const built: PrecomputedTheme = Object.freeze({
    id: theme.id,
    base: theme.base,
    beamsGradient: `conic-gradient(from 0deg, transparent 0deg, ${theme.accent}22 30deg, transparent 60deg, ${theme.accent}33 180deg, transparent 210deg, ${theme.cardBorder}22 330deg, transparent 360deg)`,
    aurora: Object.freeze(aurora) as PrecomputedAuroraLayer[],
    orbs: Object.freeze(orbs) as PrecomputedOrb[],
    sheenGradient: theme.sheen ? `linear-gradient(120deg, transparent 30%, ${theme.sheen.color} 50%, transparent 70%)` : null,
    sheenDuration: theme.sheen?.duration ?? 0,
    sheenOpacity: theme.sheen?.opacity ?? 0,
    scanGradient: `linear-gradient(180deg, transparent 0%, ${theme.accent}22 50%, transparent 100%)`,
    vignette: theme.vignette,
    grain: theme.grain,
  });

  precomputeCache.set(theme.id, built);
  return built;
}

// Warm the cache eagerly so the first themed profile render is instant.
for (const t of PROFILE_THEMES) precomputeTheme(t);

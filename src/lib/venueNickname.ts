// Deterministic nickname/subtitle for a venue in the OXIDAȚII vibe.
// Same input → same output, so the map + list are stable across refreshes.

const TAGS = [
  "haos activ",
  "zonă de faze",
  "după miezul nopții",
  "sprițari confirmați",
  "berăria umbrelor",
  "cartier de sticlă",
  "faza dimineții",
  "shot & fuga",
  "ring de oxidați",
  "vamă de neon",
  "colț de bass",
  "tribul dansează",
  "camera roșie",
  "pe muchie",
  "loc cu istoric",
  "aici se face gălăgie",
  "punct de întâlnire",
  "ultima stație",
  "corabia beată",
  "sub lampă",
];

const TAGS_BY_TYPE: Record<string, string[]> = {
  night_club: ["haos activ", "ring de oxidați", "vamă de neon", "colț de bass", "tribul dansează"],
  bar: ["sprițari confirmați", "faza dimineții", "camera roșie", "sub lampă", "corabia beată"],
  pub: ["berăria umbrelor", "punct de întâlnire", "loc cu istoric", "cartier de sticlă"],
  restaurant: ["faza dimineții", "colț cald", "masa lungă"],
};

function hash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function venueNickname(name: string, type?: string | null): string {
  const pool = (type && TAGS_BY_TYPE[type]) || TAGS;
  return pool[hash(name.toLowerCase()) % pool.length];
}

// Strip diacritics + lowercase for the display name, keeping the OXIDAȚII feel.
export function stylizeVenueName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

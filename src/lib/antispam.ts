/**
 * Prettify server-side anti-spam errors into Romanian user-facing strings.
 * Matches the RAISE EXCEPTION codes in `antispam_guard` (see migrations).
 */
export function prettifyAntiSpamError(err: unknown): string {
  const msg = (err instanceof Error ? err.message : String(err ?? "")) || "";
  if (msg.includes("duplicate_blocked")) {
    return "Ai trimis același mesaj recent. Așteaptă puțin.";
  }
  if (msg.includes("flood_blocked")) {
    return "Trimiți prea repede. Fă o pauză scurtă și reia.";
  }
  // Strip Postgres prefix like "duplicate_blocked: ..."
  return msg.replace(/^[a-z_]+_blocked:\s*/i, "");
}

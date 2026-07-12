// Shared OXIDAȚII brand styles for auth emails.
// Body MUST stay #ffffff (email client rule) — accents live inside the card.

export const BRAND = {
  name: "OXIDAȚII",
  crimson: "#ff2e63",
  purple: "#9b5cff",
  orange: "#ff7a1a",
  magenta: "#ff2ea8",
  amber: "#ffb020",
  ink: "#0b0b12",
  mute: "#6b6b78",
  line: "rgba(11,11,18,0.08)",
};

export const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  margin: 0,
  padding: 0,
  width: "100%",
};

export const container = {
  maxWidth: "480px",
  margin: "0 auto",
  padding: "32px 20px 40px",
};

export const logo = {
  fontFamily:
    "'Archivo Black', 'Bebas Neue', Impact, -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: "28px",
  letterSpacing: "0.18em",
  fontWeight: 900 as const,
  color: BRAND.ink,
  margin: "0 0 4px",
  textAlign: "center" as const,
};

export const logoAccent = {
  display: "inline-block",
  background: `linear-gradient(90deg, ${BRAND.crimson}, ${BRAND.purple}, ${BRAND.orange})`,
  WebkitBackgroundClip: "text" as const,
  backgroundClip: "text" as const,
  color: "transparent",
};

export const tagline = {
  fontSize: "11px",
  letterSpacing: "0.22em",
  textTransform: "uppercase" as const,
  color: BRAND.mute,
  textAlign: "center" as const,
  margin: "0 0 28px",
  fontWeight: 700 as const,
};

export const card = {
  border: `1px solid ${BRAND.line}`,
  borderRadius: "20px",
  padding: "28px 22px",
  backgroundColor: "#ffffff",
};

export const h1 = {
  fontSize: "26px",
  lineHeight: "1.15",
  fontWeight: 900 as const,
  color: BRAND.ink,
  margin: "0 0 14px",
  letterSpacing: "-0.01em",
};

export const text = {
  fontSize: "16px",
  lineHeight: "1.55",
  color: "#2a2a34",
  margin: "0 0 18px",
};

export const link = {
  color: BRAND.purple,
  textDecoration: "underline",
  fontWeight: 600 as const,
};

export const buttonWrap = {
  textAlign: "center" as const,
  margin: "24px 0 20px",
};

export const button = {
  display: "inline-block",
  background: `linear-gradient(90deg, ${BRAND.crimson}, ${BRAND.purple})`,
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: 800 as const,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  borderRadius: "999px",
  padding: "16px 32px",
  textDecoration: "none",
  boxShadow: "0 6px 24px rgba(255,46,99,0.28)",
};

export const codeStyle = {
  display: "block",
  fontFamily: "'SF Mono', Menlo, Consolas, monospace",
  fontSize: "32px",
  letterSpacing: "0.35em",
  fontWeight: 800 as const,
  color: BRAND.ink,
  textAlign: "center" as const,
  padding: "18px 12px",
  margin: "20px 0 24px",
  border: `2px dashed ${BRAND.purple}`,
  borderRadius: "16px",
  background: "rgba(155,92,255,0.06)",
};

export const footer = {
  fontSize: "12px",
  lineHeight: "1.5",
  color: BRAND.mute,
  margin: "24px 0 0",
  textAlign: "center" as const,
};

export const smallLine = {
  fontSize: "13px",
  color: BRAND.mute,
  margin: "18px 0 0",
  wordBreak: "break-all" as const,
};

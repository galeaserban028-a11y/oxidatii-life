import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation("settings");
  const current = (i18n.resolvedLanguage ?? i18n.language ?? "ro").startsWith("en") ? "en" : "ro";

  function setLang(lng: "ro" | "en") {
    void i18n.changeLanguage(lng);
    try { localStorage.setItem("oxi-lang", lng); } catch {}
    if (typeof document !== "undefined") document.documentElement.lang = lng;
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Languages size={18} className="text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{t("language")}</div>
        </div>
      </div>
      <div className="flex items-center gap-1 rounded-full border border-foreground/10 bg-background/60 p-0.5">
        <button
          type="button"
          onClick={() => setLang("ro")}
          className={`px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider transition ${
            current === "ro" ? "bg-neon-crimson text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >RO</button>
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider transition ${
            current === "en" ? "bg-neon-crimson text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >EN</button>
      </div>
    </div>
  );
}

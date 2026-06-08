import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-foreground/5 active:scale-95 transition"
      aria-label={theme === "dark" ? "Comută la temă luminoasă" : "Comută la temă întunecată"}
      title={theme === "dark" ? "Temă luminoasă" : "Temă întunecată"}
    >
      {theme === "dark" ? (
        <Sun size={18} className="text-foreground" />
      ) : (
        <Moon size={18} className="text-foreground" />
      )}
    </button>
  );
}

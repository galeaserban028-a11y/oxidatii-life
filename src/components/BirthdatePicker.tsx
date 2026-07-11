import { useMemo } from "react";

type Props = {
  value: string; // YYYY-MM-DD or ""
  onChange: (v: string) => void;
};

const MONTHS = [
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
];

export function BirthdatePicker({ value, onChange }: Props) {
  const [y, m, d] = value ? value.split("-") : ["", "", ""];

  const currentYear = new Date().getFullYear();
  // 18+ only → max year = current - 18. Range down to 1940.
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let year = currentYear - 18; year >= 1940; year--) arr.push(year);
    return arr;
  }, [currentYear]);

  const daysInMonth = useMemo(() => {
    if (!y || !m) return 31;
    return new Date(Number(y), Number(m), 0).getDate();
  }, [y, m]);

  function update(part: "y" | "m" | "d", v: string) {
    const ny = part === "y" ? v : y;
    const nm = part === "m" ? v : m;
    let nd = part === "d" ? v : d;
    if (ny && nm && nd) {
      const maxD = new Date(Number(ny), Number(nm), 0).getDate();
      if (Number(nd) > maxD) nd = String(maxD).padStart(2, "0");
    }
    if (ny && nm && nd) onChange(`${ny}-${nm}-${nd}`);
    else onChange("");
  }

  const selectCls =
    "rounded-xl bg-foreground/5 border border-foreground/10 px-3 py-3 text-sm focus:outline-none focus:border-neon-purple";

  return (
    <div className="grid grid-cols-3 gap-2">
      <select
        aria-label="Zi"
        value={d}
        onChange={(e) => update("d", e.target.value)}
        className={selectCls}
      >
        <option value="">Zi</option>
        {Array.from({ length: daysInMonth }, (_, i) => {
          const dd = String(i + 1).padStart(2, "0");
          return (
            <option key={dd} value={dd}>
              {i + 1}
            </option>
          );
        })}
      </select>
      <select
        aria-label="Lună"
        value={m}
        onChange={(e) => update("m", e.target.value)}
        className={selectCls}
      >
        <option value="">Lună</option>
        {MONTHS.map((name, i) => {
          const mm = String(i + 1).padStart(2, "0");
          return (
            <option key={mm} value={mm}>
              {name}
            </option>
          );
        })}
      </select>
      <select
        aria-label="An"
        value={y}
        onChange={(e) => update("y", e.target.value)}
        className={selectCls}
      >
        <option value="">An</option>
        {years.map((yr) => (
          <option key={yr} value={String(yr)}>
            {yr}
          </option>
        ))}
      </select>
    </div>
  );
}

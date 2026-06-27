import { useEffect, useState } from "react";
import { getPerfLevel, subscribePerf } from "@/lib/perfMode";

export function usePerfLevel() {
  const [level, setLevel] = useState<"high" | "low">(() => getPerfLevel());
  useEffect(() => subscribePerf(setLevel), []);
  return level;
}

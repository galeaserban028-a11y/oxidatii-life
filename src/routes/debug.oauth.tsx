import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  getOAuthDebugLog,
  subscribeOAuthDebug,
  clearOAuthDebugLog,
  type OAuthDebugEntry,
} from "@/lib/oauth-debug";
import {
  validateDeepLinkConfig,
  type DeepLinkCheck,
} from "@/lib/deep-link-validator";

export const Route = createFileRoute("/debug/oauth")({
  component: DebugOAuthPage,
  head: () => ({
    meta: [
      { title: "Debug OAuth — Oxidatii" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function DebugOAuthPage() {
  const [entries, setEntries] = useState<OAuthDebugEntry[]>(() => getOAuthDebugLog());
  const [checks, setChecks] = useState<DeepLinkCheck[] | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => subscribeOAuthDebug(setEntries), []);

  const runValidation = async () => {
    setRunning(true);
    try {
      setChecks(await validateDeepLinkConfig());
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] w-full bg-black text-white p-4 font-mono text-xs"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <h1 className="text-lg font-bold mb-3">OAuth / Deep-Link Debug</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={runValidation}
          disabled={running}
          className="px-3 py-2 bg-pink-600 rounded"
        >
          {running ? "Verific..." : "Rulează validare"}
        </button>
        <button
          onClick={() => { clearOAuthDebugLog(); }}
          className="px-3 py-2 bg-neutral-700 rounded"
        >
          Șterge log
        </button>
        <button
          onClick={() => setEntries(getOAuthDebugLog())}
          className="px-3 py-2 bg-neutral-700 rounded"
        >
          Refresh
        </button>
      </div>

      {checks && (
        <section className="mb-4 border border-neutral-800 rounded p-2">
          <h2 className="font-bold mb-2">Validare configurare</h2>
          <ul className="space-y-1">
            {checks.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span>{c.ok ? "✅" : "❌"}</span>
                <span className="flex-1">
                  <b>{c.name}</b>
                  {c.detail ? ` — ${c.detail}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-bold mb-2">Log ({entries.length})</h2>
        {entries.length === 0 ? (
          <p className="opacity-60">Nicio intrare. Pornește un flow OAuth pentru a genera pași.</p>
        ) : (
          <ul className="space-y-1">
            {[...entries].reverse().map((e, i) => (
              <li
                key={i}
                className={
                  e.level === "error"
                    ? "text-red-400"
                    : e.level === "warn"
                      ? "text-yellow-400"
                      : "text-green-300"
                }
              >
                <span className="opacity-60">
                  {new Date(e.t).toISOString().slice(11, 23)}
                </span>{" "}
                <b>[{e.step}]</b>{" "}
                {e.detail !== undefined && (
                  <span className="opacity-80 break-all">
                    {typeof e.detail === "string"
                      ? e.detail
                      : JSON.stringify(e.detail)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

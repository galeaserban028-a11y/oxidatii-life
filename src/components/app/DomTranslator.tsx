import { useEffect } from "react";
import i18n from "@/lib/i18n";
import { RO_EN } from "@/lib/translations";

// Sort keys longest-first so longer phrases are translated before shorter substrings
const KEYS = Object.keys(RO_EN).sort((a, b) => b.length - a.length);

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Single regex matching any known RO key, escaped & sorted longest-first.
const ALL_RE = new RegExp(KEYS.map(escapeRegExp).join("|"), "g");

function translateString(input: string): string {
  if (!input) return input;
  // Quick win: exact match
  if (RO_EN[input]) return RO_EN[input];
  if (RO_EN[input.trim()]) {
    const t = RO_EN[input.trim()];
    return input.replace(input.trim(), t);
  }
  // Fallback: replace any known substring
  return input.replace(ALL_RE, (m) => RO_EN[m] || m);
}

const ATTRS = ["placeholder", "aria-label", "title", "alt"] as const;
const ROOT_ATTR = "data-dom-translating";

function processNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const txt = node.nodeValue;
    if (txt && txt.trim()) {
      const next = translateString(txt);
      if (next !== txt) node.nodeValue = next;
    }
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  // Skip script/style
  const tag = el.tagName;
  if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v && v.trim()) {
      const next = translateString(v);
      if (next !== v) el.setAttribute(a, next);
    }
  }
  // Recurse children
  for (let i = 0; i < el.childNodes.length; i++) processNode(el.childNodes[i]);
}

function applyStoredLanguage() {
  if (typeof window === "undefined") return;
  try {
    const stored = window.localStorage.getItem("oxi-lang");
    if ((stored === "en" || stored === "ro") && i18n.language !== stored) {
      void i18n.changeLanguage(stored);
    }
    document.documentElement.lang = stored === "en" ? "en" : "ro";
  } catch {
    document.documentElement.lang = "ro";
  }
}

function translateAll() {
  if (typeof document === "undefined") return;
  processNode(document.body);
  // Also translate <title>
  const docTitle = document.title;
  if (docTitle) {
    const next = translateString(docTitle);
    if (next !== docTitle) document.title = next;
  }
}

let observer: MutationObserver | null = null;
let active = false;

function start() {
  if (typeof document === "undefined" || active) return;
  active = true;
  document.documentElement.setAttribute(ROOT_ATTR, "1");
  translateAll();
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "characterData" && m.target) {
        processNode(m.target);
      } else if (m.type === "childList") {
        m.addedNodes.forEach(processNode);
      } else if (m.type === "attributes" && m.target && (m.target as Element).getAttribute) {
        const el = m.target as Element;
        const a = m.attributeName as string;
        if (ATTRS.includes(a as any)) {
          const v = el.getAttribute(a);
          if (v) {
            const next = translateString(v);
            if (next !== v) el.setAttribute(a, next);
          }
        }
      }
    }
    // Also re-check document.title after mutations (TanStack head updates)
    const docTitle = document.title;
    const next = translateString(docTitle);
    if (next !== docTitle) document.title = next;
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS as unknown as string[],
  });
  // Watch <title> too
  const titleEl = document.querySelector("head > title");
  if (titleEl) {
    observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
  }
}

function stop() {
  if (!active) return;
  active = false;
  observer?.disconnect();
  observer = null;
  if (typeof document !== "undefined") document.documentElement.removeAttribute(ROOT_ATTR);
  // Reload only when returning from translated DOM back to original Romanian strings.
  if (typeof window !== "undefined") window.location.replace(window.location.href);
}

function deferredStart() {
  if (typeof window === "undefined") return;
  const run = () => window.requestAnimationFrame(() => window.requestAnimationFrame(start));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();
}

export function DomTranslator() {
  useEffect(() => {
    applyStoredLanguage();
    const apply = (lng: string) => {
      if (lng === "en") deferredStart();
      else if (active) stop();
    };
    apply(i18n.language);
    i18n.on("languageChanged", apply);
    return () => {
      i18n.off("languageChanged", apply);
    };
  }, []);
  return null;
}

import { useEffect } from "react";
import i18n from "@/lib/i18n";
import { RO_EN } from "@/lib/translations";

const KEYS = Object.keys(RO_EN).sort((a, b) => b.length - a.length);

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ALL_RE = KEYS.length ? new RegExp(KEYS.map(escapeRegExp).join("|"), "g") : null;

function translateString(input: string): string {
  if (!input || !ALL_RE) return input;
  if (RO_EN[input]) return RO_EN[input];
  const trimmed = input.trim();
  if (trimmed && RO_EN[trimmed]) return input.replace(trimmed, RO_EN[trimmed]);
  return input.replace(ALL_RE, (m) => RO_EN[m] || m);
}

const ATTRS = ["placeholder", "aria-label", "title", "alt"] as const;
type TranslatableAttr = (typeof ATTRS)[number];

function isTranslatableAttr(attr: string | null): attr is TranslatableAttr {
  return attr !== null && (ATTRS as readonly string[]).includes(attr);
}

// Cache so we never re-translate the same string twice on the same node.
const translatedNodes = new WeakSet<Node>();
let muted = false; // suppress observer while we mutate

function processTextNode(node: Node) {
  if (translatedNodes.has(node)) return;
  const txt = node.nodeValue;
  if (!txt || !txt.trim()) return;
  const next = translateString(txt);
  if (next !== txt) {
    muted = true;
    node.nodeValue = next;
    muted = false;
  }
  translatedNodes.add(node);
}

function processElement(el: Element) {
  const tag = el.tagName;
  if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v && v.trim()) {
      const next = translateString(v);
      if (next !== v) {
        muted = true;
        el.setAttribute(a, next);
        muted = false;
      }
    }
  }
}

function processNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    processTextNode(node);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  processElement(el);
  // Walk descendants efficiently
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let cur: Node | null = walker.nextNode();
  while (cur) {
    if (cur.nodeType === Node.TEXT_NODE) processTextNode(cur);
    else if (cur.nodeType === Node.ELEMENT_NODE) processElement(cur as Element);
    cur = walker.nextNode();
  }
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

let observer: MutationObserver | null = null;
let active = false;
let pending: Set<Node> | null = null;
let scheduled = false;

function flush() {
  scheduled = false;
  const nodes = pending;
  pending = null;
  if (!nodes) return;
  nodes.forEach((n) => {
    if (n.isConnected) processNode(n);
  });
}

function schedule(node: Node) {
  if (!pending) pending = new Set();
  pending.add(node);
  if (!scheduled) {
    scheduled = true;
    (typeof window !== "undefined"
      ? window.requestAnimationFrame
      : (cb: () => void) => setTimeout(cb, 16))(flush);
  }
}

function start() {
  if (typeof document === "undefined" || active) return;
  active = true;
  processNode(document.body);
  const docTitle = document.title;
  if (docTitle) {
    const next = translateString(docTitle);
    if (next !== docTitle) document.title = next;
  }
  observer = new MutationObserver((mutations) => {
    if (muted) return;
    for (const m of mutations) {
      if (m.type === "characterData" && m.target) {
        if (!translatedNodes.has(m.target)) schedule(m.target);
      } else if (m.type === "childList") {
        m.addedNodes.forEach((n) => schedule(n));
      } else if (m.type === "attributes" && m.target) {
        const el = m.target as Element;
        const a = m.attributeName;
        if (isTranslatableAttr(a)) {
          const v = el.getAttribute(a);
          if (v) {
            const next = translateString(v);
            if (next !== v) {
              muted = true;
              el.setAttribute(a, next);
              muted = false;
            }
          }
        }
      }
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRS as unknown as string[],
  });
}

function stop() {
  if (!active) return;
  active = false;
  observer?.disconnect();
  observer = null;
}

function deferredStart() {
  if (typeof window === "undefined") return;
  const run = () => window.requestAnimationFrame(() => window.requestAnimationFrame(start));
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else run();
}

export function DomTranslator() {
  useEffect(() => {
    applyStoredLanguage();
    // Only translate dynamic content in EN mode. Delay past initial hydration
    // so React's reconciliation is complete before we mutate any text nodes.
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (i18n.language === "en") {
      timer = setTimeout(deferredStart, 250);
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (active) stop();
    };
  }, []);
  return null;
}

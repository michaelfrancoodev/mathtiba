"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import en from "./en.json";
import sw from "./sw.json";

export type Locale = "en" | "sw";
export const LOCALES: Locale[] = ["en", "sw"];
const DICTS = { en, sw } as const;
const STORAGE_KEY = "mathtiba.locale";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<Ctx | null>(null);

/** Resolve "home.cta" against a nested dictionary. Only the FIRST segment
 *  is treated as a nesting boundary lookup; the remainder is looked up as
 *  a literal key so that IDs containing hyphens (e.g. "ITEM-08") still work
 *  when used as a second-level key. */
function resolve(dict: unknown, path: string): string | undefined {
  const firstDot = path.indexOf(".");
  if (firstDot === -1) {
    const v = (dict as Record<string, unknown>)?.[path];
    return typeof v === "string" ? v : undefined;
  }
  const top = path.slice(0, firstDot);
  const rest = path.slice(firstDot + 1);
  const branch = (dict as Record<string, unknown>)?.[top];
  if (!branch || typeof branch !== "object") return undefined;
  const v = (branch as Record<string, unknown>)[rest];
  return typeof v === "string" ? v : undefined;
}

function interpolate(s: string, vars?: Record<string, string | number>) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && LOCALES.includes(saved)) setLocaleState(saved);
    else if (navigator.language.toLowerCase().startsWith("sw")) setLocaleState("sw");
    setHydrated(true);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => {
      const hit = resolve(DICTS[locale], path) ?? resolve(DICTS.en, path);
      if (hit === undefined) {
        if (process.env.NODE_ENV !== "production")
          console.warn(`[i18n] missing key: ${path}`);
        return path;
      }
      return interpolate(hit, vars);
    },
    [locale]
  );

  // Avoid a locale-flash: render nothing meaningful until we've read
  // localStorage once (still SSR-safe: locale defaults to "en").
  if (!hydrated && typeof window !== "undefined") {
    // no-op branch kept for clarity; we still render children below
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

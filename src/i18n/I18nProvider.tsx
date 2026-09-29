"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Locale, TranslationMap } from "./types";
import { SUPPORTED_LOCALES, RTL_LOCALES } from "./index";

const STORAGE_KEY = "lumina-locale";
const DEFAULT_LOCALE: Locale = "en-US";

export function isSupportedLocale(locale: string): locale is Locale {
  return (SUPPORTED_LOCALES as string[]).includes(locale);
}

export function detectBrowserLocale(
  navigatorObj?: Partial<Navigator>
): Locale | null {
  const nav =
    navigatorObj || (typeof navigator !== "undefined" ? navigator : undefined);
  if (!nav) return null;

  const languages = nav.languages || (nav.language ? [nav.language] : []);
  for (const lang of languages) {
    if (!lang) continue;
    if (isSupportedLocale(lang)) return lang;

    const prefix = lang.split("-")[0].toLowerCase();
    const match = SUPPORTED_LOCALES.find((loc) =>
      loc.toLowerCase().startsWith(prefix)
    );
    if (match) return match;
  }
  return null;
}

export function resolveLocale(options?: {
  urlSearch?: string;
  storedLocale?: string | null;
  navigatorObj?: Partial<Navigator>;
}): Locale {
  const { urlSearch, storedLocale, navigatorObj } = options || {};

  // 1. URL search parameter precedence (locale or lang)
  if (urlSearch !== undefined) {
    try {
      const params = new URLSearchParams(urlSearch);
      const urlLoc = params.get("locale") || params.get("lang");
      if (urlLoc && isSupportedLocale(urlLoc)) {
        return urlLoc;
      }
    } catch {}
  } else if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlLoc = params.get("locale") || params.get("lang");
      if (urlLoc && isSupportedLocale(urlLoc)) {
        return urlLoc;
      }
    } catch {}
  }

  // 2. Persisted preference in localStorage
  if (storedLocale !== undefined) {
    if (storedLocale && isSupportedLocale(storedLocale)) {
      return storedLocale;
    }
  } else if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isSupportedLocale(stored)) {
        return stored as Locale;
      }
    } catch {}
  }

  // 3. Browser detection fallback
  const detected = detectBrowserLocale(navigatorObj);
  if (detected) return detected;

  // 4. Default fallback
  return DEFAULT_LOCALE;
}

export function updateUrlLocale(newLocale: Locale) {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("locale") !== newLocale) {
      url.searchParams.set("locale", newLocale);
      window.history.replaceState(null, "", url.toString());
    }
  } catch {}
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  translations: TranslationMap;
  isLoaded: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [translations, setTranslations] = useState<TranslationMap>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const cacheRef = useRef<Map<string, TranslationMap>>(new Map());
  const mountedRef = useRef(false);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const loadLocale = useCallback(async (loc: Locale) => {
    const cached = cacheRef.current.get(loc);
    if (cached) {
      if (mountedRef.current) {
        setTranslations(cached);
        setIsLoaded(true);
      }
      return;
    }

    try {
      const mod = await import(`./locales/${loc}.json`);
      const map = mod.default || mod;
      cacheRef.current.set(loc, map);
      if (mountedRef.current) {
        setTranslations(map);
        setIsLoaded(true);
      }
    } catch {
      if (loc !== DEFAULT_LOCALE) {
        const fallback = cacheRef.current.get(DEFAULT_LOCALE);
        if (fallback) {
          if (mountedRef.current) {
            setTranslations(fallback);
            setIsLoaded(true);
          }
          return;
        }
        try {
          const fallbackMod = await import(`./locales/${DEFAULT_LOCALE}.json`);
          const fallbackMap = fallbackMod.default || fallbackMod;
          cacheRef.current.set(DEFAULT_LOCALE, fallbackMap);
          if (mountedRef.current) {
            setTranslations(fallbackMap);
            setIsLoaded(true);
          }
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const initial = resolveLocale();
    setLocaleState(initial);
    try {
      localStorage.setItem(STORAGE_KEY, initial);
    } catch {}
    updateUrlLocale(initial);

    if (RTL_LOCALES.has(initial)) {
      document.documentElement.dir = "rtl";
    } else {
      document.documentElement.dir = "ltr";
    }
    document.documentElement.lang = initial;

    loadLocale(initial);
    return () => {
      mountedRef.current = false;
    };
  }, [loadLocale]);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      setIsLoaded(false);
      try {
        localStorage.setItem(STORAGE_KEY, newLocale);
      } catch {}
      updateUrlLocale(newLocale);

      if (RTL_LOCALES.has(newLocale)) {
        document.documentElement.dir = "rtl";
      } else {
        document.documentElement.dir = "ltr";
      }
      document.documentElement.lang = newLocale;

      loadLocale(newLocale);
    },
    [loadLocale]
  );

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value = translations[key];
      if (value === undefined) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[i18n] Missing translation key: "${key}" for locale "${locale}"`
          );
        }
        value = key;
      }

      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(`{${k}}`, String(v));
        }
      }

      return value;
    },
    [translations, locale]
  );

  return (
    <I18nContext.Provider
      value={{ locale, setLocale, t, translations, isLoaded }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18nContext() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18nContext must be used within an I18nProvider");
  }
  return ctx;
}

"use client";

import { useI18nContext } from "./I18nProvider";
import { SUPPORTED_LOCALES, LOCALE_META } from "./index";
import type { Locale } from "./types";

interface LocaleSwitcherProps {
  variant?: "select" | "buttons";
  className?: string;
}

export function LocaleSwitcher({
  variant = "select",
  className = "",
}: LocaleSwitcherProps) {
  const { locale, setLocale } = useI18nContext();

  if (variant === "buttons") {
    return (
      <div
        role="radiogroup"
        aria-label="Language selection"
        className={`flex flex-wrap items-center gap-1 ${className}`}
      >
        {SUPPORTED_LOCALES.map((loc) => {
          const meta = LOCALE_META[loc];
          const isActive = locale === loc;
          return (
            <button
              key={loc}
              role="radio"
              aria-checked={isActive}
              aria-label={meta.label}
              onClick={() => setLocale(loc)}
              title={meta.label}
              className={`flex items-center justify-center rounded-md px-2.5 py-1.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-[var(--color-primary,#0f766e)] text-[var(--color-primary-text,#ffffff)]"
                  : "text-[var(--color-text-secondary,#3e3830)] hover:bg-[var(--color-surface,#f0f0f0)]"
              }`}
            >
              <span className="mr-1.5" aria-hidden="true">
                {meta.flag}
              </span>
              <span className="hidden sm:inline">{meta.nativeLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  const currentMeta = LOCALE_META[locale] || LOCALE_META["en-US"];

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <div
        className="pointer-events-none absolute left-2.5 flex items-center text-sm"
        aria-hidden="true"
      >
        <span className="mr-1">{currentMeta.flag}</span>
      </div>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label="Select language"
        className="appearance-none rounded-md border border-border-light bg-surface pl-8 pr-7 py-1.5 text-sm font-medium text-foreground shadow-xs transition hover:border-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
      >
        {SUPPORTED_LOCALES.map((loc) => {
          const meta = LOCALE_META[loc];
          return (
            <option key={loc} value={loc} className="bg-surface text-foreground py-1">
              {meta.flag} {meta.nativeLabel} ({meta.label})
            </option>
          );
        })}
      </select>
      <div
        className="pointer-events-none absolute right-2 flex items-center text-muted"
        aria-hidden="true"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}

"use client";

import { useI18nContext } from "./I18nProvider";
import { SUPPORTED_LOCALES, LOCALE_META } from "./index";

export function LocaleSwitcher() {
  const { locale, setLocale } = useI18nContext();

  return (
    <div
      role="radiogroup"
      aria-label="Language selection"
      className="flex flex-wrap items-center gap-1"
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

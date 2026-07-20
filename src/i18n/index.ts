"use client";

export { I18nProvider, useI18nContext } from "./I18nProvider";
export { useTranslation } from "./useTranslation";
export { IntlNumber } from "./IntlNumber";
export { IntlDate } from "./IntlDate";
export { LocaleSwitcher } from "./LocaleSwitcher";
export type { Locale, TranslationMap } from "./types";

export const RTL_LOCALES: ReadonlySet<Locale> = new Set(["ar-SA", "he-IL"]);

export const SUPPORTED_LOCALES: Locale[] = [
  "en-US",
  "zh-CN",
  "ja-JP",
  "ko-KR",
  "ru-RU",
  "ar-SA",
  "he-IL",
  "es-ES",
  "pt-BR",
];

export const LOCALE_META: Record<
  Locale,
  { label: string; nativeLabel: string; flag: string }
> = {
  "en-US": { label: "English", nativeLabel: "English", flag: "\u{1F1FA}\u{1F1F8}" },
  "zh-CN": { label: "Chinese", nativeLabel: "中文", flag: "\u{1F1E8}\u{1F1F3}" },
  "ja-JP": { label: "Japanese", nativeLabel: "日本語", flag: "\u{1F1EF}\u{1F1F5}" },
  "ko-KR": { label: "Korean", nativeLabel: "한국어", flag: "\u{1F1F0}\u{1F1F7}" },
  "ru-RU": { label: "Russian", nativeLabel: "Русский", flag: "\u{1F1F7}\u{1F1FA}" },
  "ar-SA": { label: "Arabic", nativeLabel: "العربية", flag: "\u{1F1E6}\u{1F1F8}" },
  "he-IL": { label: "Hebrew", nativeLabel: "עברית", flag: "\u{1F1EE}\u{1F1F1}" },
  "es-ES": { label: "Spanish", nativeLabel: "Español", flag: "\u{1F1EA}\u{1F1F8}" },
  "pt-BR": { label: "Portuguese", nativeLabel: "Português", flag: "\u{1F1E7}\u{1F1F7}" },
};

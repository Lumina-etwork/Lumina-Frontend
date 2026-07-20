"use client";

import { useI18nContext } from "./I18nProvider";

export function useTranslation() {
  const { t, locale, isLoaded } = useI18nContext();
  return { t, locale, isLoaded };
}

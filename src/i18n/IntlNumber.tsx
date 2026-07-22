"use client";

import { useMemo } from "react";
import { useI18nContext } from "./I18nProvider";

interface IntlNumberProps {
  value: number;
  style?: "decimal" | "currency" | "percent";
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  notation?: "standard" | "compact";
}

export function IntlNumber({
  value,
  style = "decimal",
  currency,
  minimumFractionDigits,
  maximumFractionDigits,
  notation,
}: IntlNumberProps) {
  const { locale } = useI18nContext();

  const formatted = useMemo(() => {
    try {
      return new Intl.NumberFormat(locale, {
        style,
        currency,
        minimumFractionDigits,
        maximumFractionDigits,
        notation,
      }).format(value);
    } catch {
      return String(value);
    }
  }, [value, locale, style, currency, minimumFractionDigits, maximumFractionDigits, notation]);

  return <>{formatted}</>;
}

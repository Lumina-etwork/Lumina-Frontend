"use client";

import { useMemo } from "react";
import { useI18nContext } from "./I18nProvider";

interface IntlDateProps {
  value: Date | number | string;
  dateStyle?: "full" | "long" | "medium" | "short";
  timeStyle?: "full" | "long" | "medium" | "short";
}

export function IntlDate({
  value,
  dateStyle = "medium",
  timeStyle,
}: IntlDateProps) {
  const { locale } = useI18nContext();

  const formatted = useMemo(() => {
    try {
      const date = value instanceof Date ? value : new Date(value);
      return new Intl.DateTimeFormat(locale, {
        dateStyle,
        timeStyle,
      }).format(date);
    } catch {
      return String(value);
    }
  }, [value, locale, dateStyle, timeStyle]);

  return <>{formatted}</>;
}

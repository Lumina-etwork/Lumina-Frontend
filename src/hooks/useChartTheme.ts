"use client";

import { useCallback } from "react";

/**
 * Returns theme-aware colors for Recharts, Canvas 2D, and WebGL rendering.
 *
 * Reads CSS custom properties directly so it works without React context
 * (safe for canvas draw calls and recharts config objects).
 */
export function getChartColors() {
  if (typeof window === "undefined") {
    return {
      bg: "#ffffff",
      grid: "#e5e7eb",
      text: "#6f5f48",
      border: "#d8d0c1",
      primary: "#0f766e",
      primaryHover: "#115e59",
      surface: "#ffffff",
      surfaceAlt: "#faf8f3",
      foreground: "#171512",
      borderLight: "#cfc4b1",
      tableDivider: "#ece5d8",
      danger: "#9a3412",
      warning: "#d97706",
    };
  }

  const style = getComputedStyle(document.documentElement);
  return {
    bg: style.getPropertyValue("--color-bg").trim(),
    grid: style.getPropertyValue("--color-chart-grid").trim(),
    text: style.getPropertyValue("--color-chart-text").trim(),
    border: style.getPropertyValue("--color-chart-border").trim(),
    primary: style.getPropertyValue("--color-primary").trim(),
    primaryHover: style.getPropertyValue("--color-primary-hover").trim(),
    surface: style.getPropertyValue("--color-surface").trim(),
    surfaceAlt: style.getPropertyValue("--color-surface-alt").trim(),
    foreground: style.getPropertyValue("--color-text").trim(),
    borderLight: style.getPropertyValue("--color-border-light").trim(),
    tableDivider: style.getPropertyValue("--color-table-divider").trim(),
    danger: style.getPropertyValue("--color-danger").trim(),
    warning: style.getPropertyValue("--color-warning").trim(),
  };
}

/**
 * React hook version that re-renders on theme change by subscribing to
 * the MutationObserver on <html> class changes.
 */
export function useChartTheme() {
  const colors = useCallback(() => getChartColors(), []);
  return colors();
}

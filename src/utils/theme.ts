import type { Theme } from "../types";

const themes = new Set<Theme>(["cream", "light", "dark"]);

export function normalizeTheme(value: unknown): Theme {
  return typeof value === "string" && themes.has(value as Theme)
    ? (value as Theme)
    : "cream";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
}

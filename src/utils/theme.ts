import type { Theme } from "../types";

const themes = new Set<Theme>(["system", "light", "dark"]);
let activeTheme: Theme = "system";
let removeSystemThemeListener: (() => void) | undefined;

export function normalizeTheme(value: unknown): Theme {
  if (value === "cream") {
    return "light";
  }

  return typeof value === "string" && themes.has(value as Theme)
    ? (value as Theme)
    : "system";
}

export function applyTheme(theme: Theme) {
  activeTheme = theme;
  removeSystemThemeListener?.();
  removeSystemThemeListener = undefined;

  if (theme !== "system") {
    applyResolvedTheme(theme);
    return;
  }

  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  const handleSystemThemeChange = () => {
    if (activeTheme === "system") {
      applyResolvedTheme(systemTheme.matches ? "dark" : "light");
    }
  };

  systemTheme.addEventListener("change", handleSystemThemeChange);
  removeSystemThemeListener = () => {
    systemTheme.removeEventListener("change", handleSystemThemeChange);
  };
  handleSystemThemeChange();
}

function applyResolvedTheme(theme: Exclude<Theme, "system">) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

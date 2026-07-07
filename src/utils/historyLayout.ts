import { maxHistoryWidth, minHistoryWidth, minMainWidth } from "../config/ui";

export function clampHistoryWidth(value: number) {
  const availableWidth =
    typeof window === "undefined" ? maxHistoryWidth : window.innerWidth - minMainWidth - 1;
  const responsiveMaxWidth = Math.max(minHistoryWidth, Math.min(maxHistoryWidth, availableWidth));
  return Math.min(responsiveMaxWidth, Math.max(minHistoryWidth, Math.round(value)));
}

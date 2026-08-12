import type { Settings } from "../types";

export function providerStatusText(settings: Settings) {
  const model =
    settings.provider === "codex"
      ? settings.codexModel.trim()
      : settings.provider === "claude"
        ? settings.claudeModel.trim()
        : settings.cursorModel.trim();
  const modelText = model || "default";

  if (settings.provider === "codex") {
    const effort = settings.codexReasoningEffort || "default";
    return `codex - ${modelText} - ${effort}`;
  }

  return `${settings.provider} - ${modelText}`;
}

import type { Settings } from "../types";

export function providerStatusText(settings: Settings) {
  const model =
    settings.provider === "claude" ? settings.claudeModel.trim() : settings.codexModel.trim();
  const modelText = model || "default";

  if (settings.provider === "codex") {
    const effort = settings.codexReasoningEffort || "default";
    return `codex - ${modelText} - ${effort}`;
  }

  return `claude - ${modelText}`;
}
